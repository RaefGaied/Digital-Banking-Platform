package com.fintech.banking.flowable;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.TransactionRepository;
import com.fintech.banking.security.service.JwtService;
import com.fintech.banking.service.TransactionService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FlowableTransferLifecycleIntegrationTest extends FlowableRuntimeTestSupport {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @Autowired
    private TaskService taskService;

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void highValueTransferIsStartedValidatedAndRejectedThroughAdminApi() throws Exception {
        User customer = createUser();
        Account source = createAccount(customer, new BigDecimal("15000.00"));
        Account target = createAccount(createUser(), new BigDecimal("400.00"));
        TransactionRequest request = new TransactionRequest();
        request.setAmount(new BigDecimal("6000.00"));
        request.setTargetAccountNumber(target.getNumber());
        request.setDescription("Flowable integration transfer rejection");

        var response = transactionService.transfer(customer.getEmail(), request);
        Transaction transaction = transactionRepository.findById(response.getId()).orElseThrow();
        String processId = transaction.getFlowableProcessId();
        assertThat(processId).isNotBlank();
        assertThat(runtimeService.createProcessInstanceQuery().processInstanceId(processId).count()).isEqualTo(1);

        Task approvalTask = taskService.createTaskQuery()
                .processInstanceId(processId)
                .singleResult();
        assertThat(approvalTask).isNotNull();
        assertThat(approvalTask.getTaskDefinitionKey()).isEqualTo("taskValidationAdmin");
        assertThat(taskService.createTaskQuery()
                .processInstanceId(processId)
                .taskCandidateGroup("admin")
                .count()).isEqualTo(1);
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.PENDING);

        User admin = createAdmin();
        User ordinaryUser = createUser();
        String taskUrl = "/admin/flowable/tasks/" + approvalTask.getId() + "/complete";

        mockMvc.perform(post(taskUrl)
                        .header("Authorization", "Bearer " + jwtService.generateToken(ordinaryUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECT\"}"))
                .andExpect(status().isForbidden());

        MvcResult completion = mockMvc.perform(post(taskUrl)
                        .header("Authorization", "Bearer " + jwtService.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECT\"}"))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(objectMapper.readTree(completion.getResponse().getContentAsString())
                .path("decision").asText()).isEqualTo("REJECT");
        assertThat(taskService.createTaskQuery().processInstanceId(processId).count()).isZero();
        assertThat(runtimeService.createProcessInstanceQuery().processInstanceId(processId).count()).isZero();
        assertThat(transactionRepository.findById(transaction.getId()).orElseThrow().getStatus())
                .isEqualTo(TransactionStatus.FAILED);
        assertThat(accountRepository.findById(source.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("15000.00");
        assertThat(accountRepository.findById(target.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("400.00");

        var ticket = supportTicketRepository.findByFlowableProcessId(processId).orElseThrow();
        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.CLOSED);
    }

    @Test
    void approvedHighValueTransferSettlesAccountsExactlyOnce() throws Exception {
        User customer = createUser();
        Account source = createAccount(customer, new BigDecimal("15000.00"));
        Account target = createAccount(createUser(), new BigDecimal("400.00"));
        TransactionRequest request = new TransactionRequest();
        request.setAmount(new BigDecimal("6000.00"));
        request.setTargetAccountNumber(target.getNumber());
        request.setDescription("Flowable integration transfer approval");

        var response = transactionService.transfer(customer.getEmail(), request);
        Transaction transaction = transactionRepository.findById(response.getId()).orElseThrow();
        String processId = transaction.getFlowableProcessId();
        Task approvalTask = taskService.createTaskQuery()
                .processInstanceId(processId)
                .singleResult();
        assertThat(approvalTask).isNotNull();
        assertThat(approvalTask.getTaskDefinitionKey()).isEqualTo("taskValidationAdmin");

        mockMvc.perform(post("/admin/flowable/tasks/" + approvalTask.getId() + "/complete")
                        .header("Authorization", "Bearer " + jwtService.generateToken(createAdmin()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\"}"))
                .andExpect(status().isOk());

        assertThat(runtimeService.createProcessInstanceQuery().processInstanceId(processId).count()).isZero();
        assertThat(transactionRepository.findById(transaction.getId()).orElseThrow().getStatus())
                .isEqualTo(TransactionStatus.COMPLETED);
        assertThat(accountRepository.findById(source.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("9000.00");
        assertThat(accountRepository.findById(target.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("6400.00");
    }
}

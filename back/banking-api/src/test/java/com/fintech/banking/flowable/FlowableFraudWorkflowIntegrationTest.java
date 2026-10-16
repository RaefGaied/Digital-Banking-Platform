package com.fintech.banking.flowable;

import com.fintech.banking.domain.entity.Card;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.CardBrand;
import com.fintech.banking.domain.enums.CardType;
import com.fintech.banking.repository.CardRepository;
import com.fintech.banking.security.service.JwtService;
import com.fintech.banking.service.FlowableService;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FlowableFraudWorkflowIntegrationTest extends FlowableRuntimeTestSupport {

    @Autowired
    private FlowableService flowableService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private HistoryService historyService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @Test
    void fraudDecisionRunsRealCardBlockDelegateAndFinishesTheProcess() throws Exception {
        User customer = createUser();
        createAccount(customer, new java.math.BigDecimal("2500.00"));
        Card card = cardRepository.save(Card.builder()
                .user(customer)
                .cardType(CardType.DEBIT)
                .brand(CardBrand.VISA)
                .holderName(customer.getName())
                .lastFour("4242")
                .expiryMonth(12)
                .expiryYear(2030)
                .active(true)
                .build());

        String processId = flowableService.startProcessInstance(
                "fraudValidationProcess",
                Map.of("userId", customer.getId().toString(), "intent", "STOLEN_CARD", "nbInfos", 0));

        try {
            Task adminTask = taskService.createTaskQuery()
                    .processInstanceId(processId)
                    .singleResult();
            assertThat(adminTask).isNotNull();
            assertThat(adminTask.getTaskDefinitionKey()).isEqualTo("Task_AnalyseFraude");
            assertThat(taskService.createTaskQuery()
                    .processInstanceId(processId)
                    .taskCandidateGroup("admin")
                    .count()).isEqualTo(1);

            mockMvc.perform(post("/admin/flowable/tasks/" + adminTask.getId() + "/complete")
                            .header("Authorization", "Bearer " + jwtService.generateToken(createAdmin()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"decision\":\"BLOQUER\"}"))
                    .andExpect(status().isOk());

            assertThat(cardRepository.findById(card.getId()).orElseThrow().getActive()).isFalse();
            assertThat(taskService.createTaskQuery().processInstanceId(processId).count()).isZero();
            assertThat(runtimeService.createProcessInstanceQuery().processInstanceId(processId).count()).isZero();
            assertThat(historyService.createHistoricProcessInstanceQuery()
                    .processInstanceId(processId)
                    .singleResult()
                    .getEndTime()).isNotNull();
        } finally {
            if (runtimeService.createProcessInstanceQuery().processInstanceId(processId).count() > 0) {
                runtimeService.deleteProcessInstance(processId, "integration test cleanup");
            }
        }
    }

}

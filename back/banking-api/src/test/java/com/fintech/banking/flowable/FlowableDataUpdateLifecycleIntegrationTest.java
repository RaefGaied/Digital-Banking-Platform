package com.fintech.banking.flowable;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.security.service.JwtService;
import com.fintech.banking.service.FlowableService;
import com.fintech.banking.service.SupportTicketService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FlowableDataUpdateLifecycleIntegrationTest extends FlowableRuntimeTestSupport {

    @Autowired
    private SupportTicketService supportTicketService;

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @Autowired
    private FlowableService flowableService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void identityDocumentRequestAdminReviewAndRejectionCompleteWithPersistedStatuses() throws Exception {
        User customer = createUser();
        SupportTicket ticket = supportTicketService.createTicketWithWorkflow(
                customer.getId(),
                "Update identity information",
                "Integration test data update request",
                TicketType.DATA_UPDATE,
                customer.getId(),
                "dataUpdateValidationProcess",
                Map.of());
        String processId = ticket.getFlowableProcessId();

        Task proofTask = activeTask(processId, "taskFournirPreuve");
        assertThat(proofTask.getAssignee()).isEqualTo(customer.getId().toString());
        MockMultipartFile proof = pdfProof();
        supportTicketService.submitRequestedIdentityDocument(ticket.getId(), customer.getId(), proof);

        Task adminTask = activeTask(processId, "taskValidationAdmin");
        assertThat(flowableService.listAdminTasks())
                .extracting(Task::getId)
                .contains(adminTask.getId());

        mockMvc.perform(post("/admin/flowable/tasks/" + adminTask.getId() + "/complete")
                        .header("Authorization", "Bearer " + jwtService.generateToken(createAdmin()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REQUEST_INFO\",\"comment\":\"Please provide one more document.\"}"))
                .andExpect(status().isOk());

        SupportTicket inProgressTicket = supportTicketRepository.findById(ticket.getId()).orElseThrow();
        assertThat(inProgressTicket.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(activeTask(processId, "taskFournirPreuve")).isNotNull();

        supportTicketService.submitRequestedIdentityDocument(ticket.getId(), customer.getId(), pdfProof());
        Task secondAdminTask = activeTask(processId, "taskValidationAdmin");
        mockMvc.perform(post("/admin/flowable/tasks/" + secondAdminTask.getId() + "/complete")
                        .header("Authorization", "Bearer " + jwtService.generateToken(createAdmin()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECT\"}"))
                .andExpect(status().isOk());

        assertThat(taskService.createTaskQuery().processInstanceId(processId).count()).isZero();
        assertThat(runtimeService.createProcessInstanceQuery().processInstanceId(processId).count()).isZero();
        SupportTicket closedTicket = supportTicketRepository.findById(ticket.getId()).orElseThrow();
        assertThat(closedTicket.getStatus()).isEqualTo(TicketStatus.CLOSED);
        assertThat(closedTicket.getAttachmentName()).isEqualTo("identity-proof.pdf");
        assertThat(closedTicket.getAttachmentData()).containsExactly((byte) '%', (byte) 'P', (byte) 'D', (byte) 'F', (byte) '-');
    }

    private Task activeTask(String processId, String taskKey) {
        Task task = flowableService.getActiveTask(processId, taskKey);
        assertThat(task)
                .as("active task %s for process %s", taskKey, processId)
                .isNotNull();
        return task;
    }

    private MockMultipartFile pdfProof() {
        return new MockMultipartFile(
                "attachment",
                "identity-proof.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                new byte[] {'%', 'P', 'D', 'F', '-'});
    }
}

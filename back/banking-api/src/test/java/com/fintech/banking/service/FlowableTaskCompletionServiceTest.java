package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.TransactionRepository;
import org.flowable.task.api.Task;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlowableTaskCompletionServiceTest {

    @Mock
    private FlowableService flowableService;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SupportTicketService supportTicketService;

    @Mock
    private Task task;

    @InjectMocks
    private FlowableTaskCompletionService completionService;

    @Test
    void approvalResolvesTicketThroughTicketServiceAndReturnsTicketReference() {
        SupportTicket ticket = SupportTicket.builder()
                .id(24L)
                .userId(UUID.randomUUID())
                .subject("Email address change verification")
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.OPEN)
                .build();
        when(task.getProcessInstanceId()).thenReturn("process-24");
        when(flowableService.getTaskById("task-24")).thenReturn(task);
        when(flowableService.getProcessVariables("process-24"))
                .thenReturn(Map.of("supportTicketId", "24"));
        when(supportTicketRepository.findById(24L)).thenReturn(Optional.of(ticket));

        Map<String, Object> result = completionService.completeTask(
                "task-24",
                new HashMap<>(Map.of("approved", true)));

        verify(flowableService).completeTask(eq("task-24"), any(Map.class));
        verify(supportTicketService).updateTicketStatus(24L, TicketStatus.RESOLVED);
        verify(notificationService).notifyAdminsWorkflowResolved("task-24", "APPROVE");
        org.junit.jupiter.api.Assertions.assertEquals(24L, result.get("supportTicketId"));
        org.junit.jupiter.api.Assertions.assertEquals("APPROVE", result.get("decision"));
    }

    @Test
    void fraudApprovalUsesBlockDecisionAndResolvesFraudTicket() {
        SupportTicket ticket = SupportTicket.builder()
                .id(31L)
                .userId(UUID.randomUUID())
                .subject("Stolen card report")
                .ticketType(TicketType.FRAUD)
                .status(TicketStatus.OPEN)
                .build();
        when(task.getProcessInstanceId()).thenReturn("fraud-process-31");
        when(task.getTaskDefinitionKey()).thenReturn("Task_AnalyseFraude");
        when(flowableService.getTaskById("fraud-task-31")).thenReturn(task);
        when(flowableService.getProcessVariables("fraud-process-31"))
                .thenReturn(Map.of("supportTicketId", "31", "intent", "STOLEN_CARD"));
        when(supportTicketRepository.findById(31L)).thenReturn(Optional.of(ticket));

        Map<String, Object> result = completionService.completeTask(
                "fraud-task-31",
                new HashMap<>(Map.of("approved", true)));

        verify(flowableService).completeTask(eq("fraud-task-31"), any(Map.class));
        verify(supportTicketService).updateTicketStatus(31L, TicketStatus.RESOLVED);
        verify(notificationService).notifyAdminsWorkflowResolved("fraud-task-31", "BLOQUER");
        org.junit.jupiter.api.Assertions.assertEquals("BLOQUER", result.get("decision"));
    }

    @Test
    void fraudRejectionUsesFalsePositiveDecisionAndKeepsTicketResolved() {
        SupportTicket ticket = SupportTicket.builder()
                .id(32L)
                .userId(UUID.randomUUID())
                .subject("Fraud alert review")
                .ticketType(TicketType.FRAUD)
                .status(TicketStatus.OPEN)
                .build();
        when(task.getProcessInstanceId()).thenReturn("fraud-process-32");
        when(task.getTaskDefinitionKey()).thenReturn("Task_AnalyseFraude");
        when(flowableService.getTaskById("fraud-task-32")).thenReturn(task);
        when(flowableService.getProcessVariables("fraud-process-32"))
                .thenReturn(Map.of("supportTicketId", "32", "intent", "FRAUD"));
        when(supportTicketRepository.findById(32L)).thenReturn(Optional.of(ticket));

        Map<String, Object> result = completionService.completeTask(
                "fraud-task-32",
                new HashMap<>(Map.of("approved", false)));

        verify(flowableService).completeTask(eq("fraud-task-32"), any(Map.class));
        verify(supportTicketService).updateTicketStatus(32L, TicketStatus.RESOLVED);
        verify(notificationService).notifyAdminsWorkflowResolved("fraud-task-32", "FAUX_POSITIF");
        org.junit.jupiter.api.Assertions.assertEquals("FAUX_POSITIF", result.get("decision"));
    }

    @Test
    void fraudContactDecisionKeepsTicketInProgress() {
        SupportTicket ticket = SupportTicket.builder()
                .id(33L)
                .userId(UUID.randomUUID())
                .subject("Unrecognized card payment")
                .ticketType(TicketType.FRAUD)
                .status(TicketStatus.OPEN)
                .build();
        when(task.getProcessInstanceId()).thenReturn("fraud-process-33");
        when(task.getTaskDefinitionKey()).thenReturn("Task_AnalyseFraude");
        when(flowableService.getTaskById("fraud-task-33")).thenReturn(task);
        when(flowableService.getProcessVariables("fraud-process-33"))
                .thenReturn(Map.of("supportTicketId", "33", "intent", "FRAUD"));
        when(supportTicketRepository.findById(33L)).thenReturn(Optional.of(ticket));

        Map<String, Object> result = completionService.completeTask(
                "fraud-task-33",
                Map.of("decision", "CONTACTER"));

        verify(flowableService).completeTask(eq("fraud-task-33"), any(Map.class));
        verify(supportTicketService).updateTicketStatus(33L, TicketStatus.IN_PROGRESS);
        verify(notificationService, never()).notifyAdminsWorkflowResolved("fraud-task-33", "CONTACTER");
        org.junit.jupiter.api.Assertions.assertEquals("CONTACTER", result.get("decision"));
    }

    @Test
    void fraudTaskRejectsGenericApproveDecisionBeforeCompleting() {
        when(task.getTaskDefinitionKey()).thenReturn("Task_AnalyseFraude");
        when(flowableService.getTaskById("fraud-task-invalid")).thenReturn(task);
        when(task.getProcessInstanceId()).thenReturn("fraud-process-invalid");
        when(flowableService.getProcessVariables("fraud-process-invalid")).thenReturn(Map.of());

        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> completionService.completeTask("fraud-task-invalid", Map.of("decision", "APPROVE")));

        verify(flowableService, never()).completeTask(eq("fraud-task-invalid"), any(Map.class));
    }

    @Test
    void requestingInformationKeepsDataUpdateTicketInProgress() {
        SupportTicket ticket = SupportTicket.builder()
                .id(41L)
                .userId(UUID.randomUUID())
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.OPEN)
                .build();
        when(task.getProcessInstanceId()).thenReturn("data-update-process-41");
        when(task.getTaskDefinitionKey()).thenReturn("dataUpdateTask");
        when(flowableService.getTaskById("task-41")).thenReturn(task);
        when(flowableService.getProcessVariables("data-update-process-41"))
                .thenReturn(Map.of("supportTicketId", "41"));
        when(supportTicketRepository.findById(41L)).thenReturn(Optional.of(ticket));

        Map<String, Object> result = completionService.completeTask(
                "task-41",
                Map.of("decision", "REQUEST_INFO"));

        verify(flowableService).completeTask(eq("task-41"), any(Map.class));
        verify(supportTicketService).updateTicketStatusFromWorkflow(41L, TicketStatus.IN_PROGRESS);
        verify(notificationService, never()).notifyAdminsWorkflowResolved("task-41", "REQUEST_INFO");
        org.junit.jupiter.api.Assertions.assertEquals("REQUEST_INFO", result.get("decision"));
    }

    @Test
    void requestedInformationCountAdvancesForTheRenamedAdminBpmnTask() {
        when(task.getProcessInstanceId()).thenReturn("data-update-process-43");
        when(task.getTaskDefinitionKey()).thenReturn("taskValidationAdmin");
        when(flowableService.getTaskById("task-43")).thenReturn(task);
        when(flowableService.getProcessVariables("data-update-process-43"))
                .thenReturn(Map.of("infoCount", 2));

        completionService.completeTask("task-43", Map.of("decision", "REQUEST_INFO"));

        org.mockito.ArgumentCaptor<Map<String, Object>> variables =
                org.mockito.ArgumentCaptor.forClass(Map.class);
        verify(flowableService).completeTask(eq("task-43"), variables.capture());
        org.junit.jupiter.api.Assertions.assertEquals(3, variables.getValue().get("infoCount"));
    }

    @Test
    void escalationKeepsDataUpdateTicketOpenForPriorityReview() {
        SupportTicket ticket = SupportTicket.builder()
                .id(42L)
                .userId(UUID.randomUUID())
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.OPEN)
                .build();
        when(task.getProcessInstanceId()).thenReturn("data-update-process-42");
        when(task.getTaskDefinitionKey()).thenReturn("dataUpdateTask");
        when(flowableService.getTaskById("task-42")).thenReturn(task);
        when(flowableService.getProcessVariables("data-update-process-42"))
                .thenReturn(Map.of("supportTicketId", "42"));
        when(supportTicketRepository.findById(42L)).thenReturn(Optional.of(ticket));

        Map<String, Object> result = completionService.completeTask(
                "task-42",
                Map.of("decision", "ESCALATE"));

        verify(flowableService).completeTask(eq("task-42"), any(Map.class));
        verify(supportTicketService).updateTicketStatusFromWorkflow(42L, TicketStatus.IN_PROGRESS);
        verify(notificationService, never()).notifyAdminsWorkflowResolved("task-42", "ESCALATE");
        org.junit.jupiter.api.Assertions.assertEquals("ESCALATE", result.get("decision"));
    }
}

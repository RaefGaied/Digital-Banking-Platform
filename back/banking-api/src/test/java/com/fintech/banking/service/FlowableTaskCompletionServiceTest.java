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
}

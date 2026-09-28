package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.WorkflowTask;
import com.fintech.banking.domain.enums.ActionType;
import com.fintech.banking.domain.enums.AdminTicketAction;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.enums.WorkflowTaskStatus;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.WorkflowTaskRepository;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupportTicketWorkflowTest {

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private WorkflowTaskRepository workflowTaskRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private FlowableService flowableService;

    @InjectMocks
    private SupportTicketService supportTicketService;

    @Test
    void passesCreatedTicketIdToFlowableForLaterResolution() {
        UUID userId = UUID.randomUUID();
        SupportTicket savedTicket = SupportTicket.builder()
                .id(24L)
                .userId(userId)
                .subject("Email address change verification")
                .description("Identity review")
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.OPEN)
                .build();
        when(supportTicketRepository.save(any(SupportTicket.class))).thenReturn(savedTicket);
        when(flowableService.startProcessInstance(any(String.class), any(Map.class)))
                .thenReturn("process-24");
        when(supportTicketRepository.findById(24L)).thenReturn(java.util.Optional.of(savedTicket));

        Map<String, Object> variables = new HashMap<>();
        variables.put("userEmail", "client@example.com");

        supportTicketService.createTicketWithWorkflow(
                userId,
                savedTicket.getSubject(),
                savedTicket.getDescription(),
                TicketType.DATA_UPDATE,
                userId,
                "dataUpdateValidationProcess",
                variables);

        ArgumentCaptor<Map<String, Object>> variablesCaptor = ArgumentCaptor.forClass(Map.class);
        verify(flowableService).startProcessInstance(
                org.mockito.ArgumentMatchers.eq("dataUpdateValidationProcess"),
                variablesCaptor.capture());
        assertEquals(24L, variablesCaptor.getValue().get("supportTicketId"));
        assertEquals("client@example.com", variablesCaptor.getValue().get("userEmail"));
    }

    @Test
    void requestInfoAssignsGeneralTicketAndNotifiesCustomerWithTicketReference() {
        UUID customerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        SupportTicket ticket = SupportTicket.builder()
                .id(51L)
                .userId(customerId)
                .ticketType(TicketType.GENERAL)
                .status(TicketStatus.OPEN)
                .build();
        WorkflowTask task = WorkflowTask.builder()
                .id(90L)
                .supportTicketId(51L)
                .status(WorkflowTaskStatus.PENDING)
                .build();
        when(supportTicketRepository.findById(51L)).thenReturn(java.util.Optional.of(ticket));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workflowTaskRepository.findBySupportTicketId(eq(51L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(task)));

        SupportTicket updated = supportTicketService.handleGeneralTicketAction(
                51L, adminId, AdminTicketAction.REQUEST_INFO, "Please send the transaction date.");

        assertEquals(TicketStatus.IN_PROGRESS, updated.getStatus());
        assertEquals(adminId, updated.getAssignedAdminId());
        assertEquals(adminId, task.getAssignedTo());
        assertEquals(WorkflowTaskStatus.IN_PROGRESS, task.getStatus());
        verify(workflowTaskRepository).saveAll(List.of(task));
        verify(notificationService).notifyInfoRequested(
                customerId, 51L, "Please send the transaction date.");
    }

    @Test
    void resolutionCompletesTheWorkQueueTaskAndSendsResolutionDetails() {
        UUID customerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        SupportTicket ticket = SupportTicket.builder()
                .id(52L)
                .userId(customerId)
                .ticketType(TicketType.GENERAL)
                .status(TicketStatus.IN_PROGRESS)
                .build();
        WorkflowTask task = WorkflowTask.builder()
                .id(91L)
                .supportTicketId(52L)
                .status(WorkflowTaskStatus.IN_PROGRESS)
                .build();
        when(supportTicketRepository.findById(52L)).thenReturn(java.util.Optional.of(ticket));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workflowTaskRepository.findBySupportTicketId(eq(52L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(task)));

        SupportTicket updated = supportTicketService.handleGeneralTicketAction(
                52L, adminId, AdminTicketAction.RESOLVE, "The duplicate transfer was reversed.");

        assertEquals(TicketStatus.RESOLVED, updated.getStatus());
        assertNotNull(updated.getResolvedAt());
        assertEquals(adminId, task.getAssignedTo());
        assertEquals(WorkflowTaskStatus.COMPLETED, task.getStatus());
        assertEquals(ActionType.REVIEW, task.getActionType());
        assertNotNull(task.getCompletedAt());
        verify(notificationService).notifyTicketResolved(
                ticket, "The duplicate transfer was reversed.");
    }

    @Test
    void sendUpdateNotifiesCustomerWithoutMarkingTicketResolved() {
        UUID customerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        SupportTicket ticket = SupportTicket.builder()
                .id(55L)
                .userId(customerId)
                .ticketType(TicketType.GENERAL)
                .status(TicketStatus.OPEN)
                .build();
        when(supportTicketRepository.findById(55L)).thenReturn(java.util.Optional.of(ticket));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workflowTaskRepository.findBySupportTicketId(eq(55L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        SupportTicket updated = supportTicketService.handleGeneralTicketAction(
                55L, adminId, AdminTicketAction.SEND_UPDATE, "Here is how to review the payment.");

        assertEquals(TicketStatus.IN_PROGRESS, updated.getStatus());
        verify(notificationService).notifyTicketUpdated(
                customerId, 55L, "Here is how to review the payment.");
    }

    @Test
    void sensitiveTicketCannotBeHandledThroughGeneralTicketActions() {
        SupportTicket ticket = SupportTicket.builder()
                .id(53L)
                .userId(UUID.randomUUID())
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.OPEN)
                .build();
        when(supportTicketRepository.findById(53L)).thenReturn(java.util.Optional.of(ticket));

        assertThrows(IllegalArgumentException.class, () -> supportTicketService.handleGeneralTicketAction(
                53L, UUID.randomUUID(), AdminTicketAction.RESOLVE, "Reviewed"));

        verify(supportTicketRepository, never()).save(any(SupportTicket.class));
    }

    @Test
    void generalTicketCannotBeResolvedWithoutCustomerFacingExplanation() {
        SupportTicket ticket = SupportTicket.builder()
                .id(54L)
                .userId(UUID.randomUUID())
                .ticketType(TicketType.GENERAL)
                .status(TicketStatus.OPEN)
                .build();
        when(supportTicketRepository.findById(54L)).thenReturn(java.util.Optional.of(ticket));

        assertThrows(IllegalArgumentException.class, () -> supportTicketService.handleGeneralTicketAction(
                54L, UUID.randomUUID(), AdminTicketAction.RESOLVE, "  "));

        verify(supportTicketRepository, never()).save(any(SupportTicket.class));
    }
}

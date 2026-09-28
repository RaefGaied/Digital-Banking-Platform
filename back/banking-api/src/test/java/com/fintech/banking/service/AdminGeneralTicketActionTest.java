package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.WorkflowTask;
import com.fintech.banking.domain.enums.ActionType;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.repository.AuditLogRepository;
import com.fintech.banking.repository.SecurityEventRepository;
import com.fintech.banking.repository.SessionRepository;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.repository.WorkflowTaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminGeneralTicketActionTest {

    @Mock private SupportTicketService supportTicketService;
    @Mock private SupportTicketRepository supportTicketRepository;
    @Mock private WorkflowTaskRepository workflowTaskRepository;
    @Mock private SessionRepository sessionRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private SecurityEventRepository securityEventRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditLogService auditLogService;
    @Mock private SecurityEventService securityEventService;

    @InjectMocks
    private AdminService adminService;

    @Test
    void generalSupportTaskCannotBeApprovedAsAnIdentityOrRiskDecision() {
        SupportTicket ticket = SupportTicket.builder()
                .id(63L)
                .userId(UUID.randomUUID())
                .ticketType(TicketType.GENERAL)
                .build();
        WorkflowTask task = WorkflowTask.builder()
                .id(82L)
                .supportTicketId(63L)
                .build();
        when(workflowTaskRepository.findById(82L)).thenReturn(Optional.of(task));
        when(supportTicketRepository.findById(63L)).thenReturn(Optional.of(ticket));

        AdminService.TaskActionRequest request = new AdminService.TaskActionRequest();
        request.setAction(ActionType.APPROVE.name());

        assertThrows(IllegalArgumentException.class, () -> adminService.handleTaskAction(
                82L, UUID.randomUUID(), "admin@example.com", request));

        verify(workflowTaskRepository, never()).save(any(WorkflowTask.class));
        verify(supportTicketService, never()).updateTicketStatus(any(), any());
    }
}

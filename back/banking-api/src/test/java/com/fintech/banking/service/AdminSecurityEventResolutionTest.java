package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SecurityEvent;
import com.fintech.banking.domain.enums.SecurityEventType;
import com.fintech.banking.repository.AuditLogRepository;
import com.fintech.banking.repository.SecurityEventRepository;
import com.fintech.banking.repository.SessionRepository;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.repository.WorkflowTaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSecurityEventResolutionTest {

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
    void resolutionRequiresInvestigationDetailsAndLogsProfessionalAuditTrail() {
        UUID eventId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        SecurityEvent event = SecurityEvent.builder()
                .id(eventId)
                .userId(userId)
                .type(SecurityEventType.BRUTE_FORCE)
                .resolved(false)
                .timestamp(LocalDateTime.now())
                .build();
        when(securityEventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(securityEventRepository.save(any(SecurityEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminService.SecurityEventResolutionRequest request = new AdminService.SecurityEventResolutionRequest();
        request.setIncidentSummary("Multiple failed login attempts from one IP.");
        request.setInvestigationFindings("Checked audit logs and confirmed brute-force behavior.");
        request.setCorrectiveActions("Blocked offending IP and forced password reset.");
        request.setPreventiveMeasures("Enabled stricter rate limit for repeated login failures.");

        adminService.resolveSecurityEvent(eventId, "admin@finbank.local", request);

        assertEquals(true, event.getResolved());
        verify(notificationService).notifySecurityAlert(
                eq(userId),
                org.mockito.ArgumentMatchers.contains("Blocked offending IP"));
        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        verify(auditLogService).log(
                eq("admin@finbank.local"),
                eq("ADMIN_RESOLVE_SECURITY_EVENT"),
                eq("SecurityEvent"),
                eq(eventId.toString()),
                detailsCaptor.capture(),
                eq(null));
        String details = detailsCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertTrue(details.contains("Incident summary"));
        org.junit.jupiter.api.Assertions.assertTrue(details.contains("Investigation findings"));
        org.junit.jupiter.api.Assertions.assertTrue(details.contains("Corrective actions"));
    }

    @Test
    void resolutionRejectsMissingRequiredInvestigationFields() {
        UUID eventId = UUID.randomUUID();
        SecurityEvent event = SecurityEvent.builder()
                .id(eventId)
                .userId(UUID.randomUUID())
                .type(SecurityEventType.SUSPICIOUS_ACTIVITY)
                .resolved(false)
                .timestamp(LocalDateTime.now())
                .build();
        when(securityEventRepository.findById(eventId)).thenReturn(Optional.of(event));

        AdminService.SecurityEventResolutionRequest request = new AdminService.SecurityEventResolutionRequest();
        request.setIncidentSummary(" ");
        request.setInvestigationFindings(" ");
        request.setCorrectiveActions(" ");

        assertThrows(IllegalArgumentException.class, () ->
                adminService.resolveSecurityEvent(eventId, "admin@finbank.local", request));

        verify(securityEventRepository, never()).save(any(SecurityEvent.class));
        verify(notificationService, never()).notifySecurityAlert(any(), any());
    }
}

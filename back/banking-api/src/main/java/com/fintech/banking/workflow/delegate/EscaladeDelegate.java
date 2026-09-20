package com.fintech.banking.workflow.delegate;

import com.fintech.banking.service.AuditLogService;
import com.fintech.banking.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Escalates a transfer or fraud case to a supervisor when a boundary timer
 * (48h admin / 24h client) fires or the clarification-loop attempt limit
 * (≤3) is reached, per CDC §9.
 */
@Slf4j
@Component("escaladeDelegate")
@RequiredArgsConstructor
public class EscaladeDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Override
    public void execute(DelegateExecution execution) {
        String reason = "Escalade superviseur: " + execution.getCurrentActivityId()
                + " (process=" + execution.getProcessDefinitionId() + ")";
        log.warn("escaladeDelegate: {} processInstanceId={}", reason, execution.getProcessInstanceId());

        UUID userId = parseUserId(execution.getVariable("userId"));
        if (userId != null) {
            try {
                notificationService.notifySecurityAlert(userId, reason);
            } catch (Exception ex) {
                log.error("escaladeDelegate: failed to notify user {}: {}", userId, ex.getMessage());
            }
        }

        auditLogService.log(
                userId != null ? userId.toString() : "unknown",
                "WORKFLOW_ESCALATION",
                "BpmnProcessInstance",
                execution.getProcessInstanceId(),
                reason,
                "SYSTEM");
    }

    private UUID parseUserId(Object raw) {
        if (raw == null) {
            return null;
        }
        try {
            return UUID.fromString(raw.toString());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}

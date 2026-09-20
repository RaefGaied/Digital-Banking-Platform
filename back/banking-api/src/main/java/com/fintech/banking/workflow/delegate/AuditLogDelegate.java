package com.fintech.banking.workflow.delegate;

import com.fintech.banking.domain.entity.User;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Persists an audit trail entry (CDC §8.3) whenever a BPMN process reaches
 * an audit checkpoint (successful transfer, fraud resolution, or data
 * update approval).
 */
@Slf4j
@Component("auditDelegate")
@RequiredArgsConstructor
public class AuditLogDelegate implements JavaDelegate {

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @Override
    public void execute(DelegateExecution execution) {
        String userEmail = resolveUserEmail(execution.getVariable("userId"));
        String entityId = String.valueOf(firstNonNull(
                execution.getVariable("transactionId"),
                execution.getVariable("supportTicketId"),
                execution.getProcessInstanceId()));

        auditLogService.log(
                userEmail,
                "WORKFLOW_" + execution.getProcessDefinitionId(),
                "BpmnProcessInstance",
                String.valueOf(entityId),
                "Activity=" + execution.getCurrentActivityId() + " processInstanceId=" + execution.getProcessInstanceId(),
                "SYSTEM");
    }

    private String resolveUserEmail(Object userIdRaw) {
        if (userIdRaw == null) {
            return "unknown";
        }
        try {
            UUID userId = UUID.fromString(userIdRaw.toString());
            return userRepository.findById(userId).map(User::getEmail).orElse(userIdRaw.toString());
        } catch (IllegalArgumentException ex) {
            return userIdRaw.toString();
        }
    }

    private Object firstNonNull(Object... values) {
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return "N/A";
    }
}

package com.fintech.banking.service;

import com.fintech.banking.domain.entity.*;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TransactionValidationService {

    private final SecurityEventService securityEventService;
    private final SupportTicketRepository supportTicketRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;
    private final SensitiveLineService sensitiveLineService;

    private static final BigDecimal HIGH_RISK_THRESHOLD = new BigDecimal("5000");
    private static final List<IntentType> HIGH_RISK_INTENTS = List.of(
        IntentType.FRAUD, IntentType.STOLEN_CARD, IntentType.CLAIM, IntentType.UPDATE_DATA
    );

    /**
     * Validates transaction and determines if BPMN workflow should be triggered
     * Business Rule: If amount > 5000 OR intent is high-risk → TRIGGER_BPMN
     */
    public AgentDecision validateTransactionAndDecide(
            Transaction transaction,
            IntentResult intentResult,
            UUID userId) {

        boolean exceedsAmountThreshold = transaction.getAmount().compareTo(HIGH_RISK_THRESHOLD) > 0;
        boolean isHighRiskIntent = sensitiveLineService.isSensitive(
                intentResult != null ? intentResult.getIntent() : null,
                intentResult != null ? intentResult.getParameters() : null);

        if (exceedsAmountThreshold || isHighRiskIntent) {
            createBPMNWorkflow(transaction, userId);
            return AgentDecision.TRIGGER_BPMN;
        }

        return sensitiveLineService.evaluate(intentResult);
    }

    /**
     * Creates support ticket and workflow task for BPMN process
     */
    private void createBPMNWorkflow(Transaction transaction, UUID userId) {
        // Create support ticket
        SupportTicket ticket = SupportTicket.builder()
            .userId(userId)
            .subject("Transaction Validation Required")
            .description("High-value or high-risk transaction requires validation: " + transaction.getAmount())
            .ticketType(transaction.getType() == null ? null : mapToTicketType(transaction.getType()))
            .ownerId(userId)
            .build();

        SupportTicket savedTicket = supportTicketRepository.save(ticket);
        transaction.setFlowableProcessId(savedTicket.getId().toString());

        // Create workflow task (simplified - actual BPMN integration needed)
        WorkflowTask task = WorkflowTask.builder()
            .processInstanceId("PROCESS_" + UUID.randomUUID())
            .supportTicketId(savedTicket.getId())
            .status(com.fintech.banking.domain.enums.WorkflowTaskStatus.PENDING)
            .taskType(com.fintech.banking.domain.enums.TaskType.COMPLIANCE_REVIEW)
            .build();

        workflowTaskRepository.save(task);
    }

    private TicketType mapToTicketType(com.fintech.banking.domain.enums.TransactionType type) {
        // Maps transaction type to support ticket type
        return TicketType.TRANSFER_VALIDATION;
    }
}

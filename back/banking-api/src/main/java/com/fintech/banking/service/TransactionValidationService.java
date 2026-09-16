package com.fintech.banking.service;

import com.fintech.banking.domain.entity.*;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final FlowableService flowableService;
    private final BankingAgentRepository bankingAgentRepository;

    @Value("${app.sensitive-line.threshold:5000}")
    private BigDecimal highRiskThreshold;

    private static final List<IntentType> HIGH_RISK_INTENTS = List.of(
        IntentType.FRAUD, IntentType.STOLEN_CARD, IntentType.CLAIM, IntentType.UPDATE_SENSITIVE_DATA
    );

    /**
     * Validates transaction and determines if BPMN workflow should be triggered
     * Business Rule: If amount > 5000 OR intent is high-risk → TRIGGER_BPMN
     */
    public AgentDecision validateTransactionAndDecide(
            Transaction transaction,
            IntentResult intentResult,
            UUID userId) {
        return validateTransactionAndDecide(transaction, intentResult, userId, null);
    }

    public AgentDecision validateTransactionAndDecide(
            Transaction transaction,
            IntentResult intentResult,
            UUID userId,
            UUID sessionId) {

        // Check amount threshold
        boolean exceedsAmountThreshold = transaction.getAmount().compareTo(highRiskThreshold) > 0;

        // Check intent risk
        boolean isHighRiskIntent = intentResult != null 
            && intentResult.getIntent() != null 
            && HIGH_RISK_INTENTS.contains(intentResult.getIntent());

        // Check confidence level
        boolean lowConfidence = intentResult != null 
            && (intentResult.getConfidence() == null || intentResult.getConfidence() < 0.7);

        // Determine decision
        if (exceedsAmountThreshold || isHighRiskIntent) {
            Map<String, Object> trace = createBPMNWorkflow(transaction, userId);
            trace.put("decision", AgentDecision.TRIGGER_BPMN.name());
            trace.put("reason", exceedsAmountThreshold ? "TRANSFER_AMOUNT_ABOVE_THRESHOLD" : "SENSITIVE_INTENT");
            trace.put("threshold", highRiskThreshold);
            trace.put("evaluatedAt", LocalDateTime.now().toString());
            recordAgentTrace(sessionId, userId, transaction, AgentDecision.TRIGGER_BPMN, trace);
            return AgentDecision.TRIGGER_BPMN;
        }

        if (lowConfidence) {
            Map<String, Object> trace = new HashMap<>();
            trace.put("decision", AgentDecision.REQUEST_INFO.name());
            trace.put("reason", "LOW_CONFIDENCE");
            trace.put("evaluatedAt", LocalDateTime.now().toString());
            recordAgentTrace(sessionId, userId, transaction, AgentDecision.REQUEST_INFO, trace);
            return AgentDecision.REQUEST_INFO;
        }

        Map<String, Object> trace = new HashMap<>();
        trace.put("decision", AgentDecision.AUTO_EXECUTE.name());
        trace.put("reason", "AUTOMATIC_TRANSFER");
        trace.put("evaluatedAt", LocalDateTime.now().toString());
        recordAgentTrace(sessionId, userId, transaction, AgentDecision.AUTO_EXECUTE, trace);
        return AgentDecision.AUTO_EXECUTE;
    }

    /**
     * Creates support ticket and workflow task for BPMN process
     */
    private Map<String, Object> createBPMNWorkflow(Transaction transaction, UUID userId) {
        Map<String, Object> trace = new HashMap<>();
        // Create support ticket
        SupportTicket ticket = SupportTicket.builder()
            .userId(userId)
            .subject("Transaction Validation Required")
            .description("High-value or high-risk transaction requires validation: " + transaction.getAmount())
            .ticketType(transaction.getType() == null ? null : mapToTicketType(transaction.getType()))
            .ownerId(userId)
            .build();

        SupportTicket savedTicket = supportTicketRepository.save(ticket);
        trace.put("supportTicketId", savedTicket.getId());
        // Start Flowable process instance and persist process id
        java.util.Map<String, Object> vars = new java.util.HashMap<>();
        vars.put("userId", userId.toString());
        vars.put("amount", transaction.getAmount());
        vars.put("transactionId", transaction.getId());
        vars.put("supportTicketId", savedTicket.getId());

        String processInstanceId = null;
        try {
            processInstanceId = flowableService.startProcessInstance("transferValidationProcess", vars);
        } catch (Exception e) {
            // fallback: create a workflow task record if Flowable not available
            WorkflowTask task = WorkflowTask.builder()
                    .processInstanceId("PROCESS_" + UUID.randomUUID())
                    .supportTicketId(savedTicket.getId())
                    .status(com.fintech.banking.domain.enums.WorkflowTaskStatus.PENDING)
                    .taskType(com.fintech.banking.domain.enums.TaskType.COMPLIANCE_REVIEW)
                    .build();

            workflowTaskRepository.save(task);
        }

        if (processInstanceId != null) {
            savedTicket.setFlowableProcessId(processInstanceId);
            supportTicketRepository.save(savedTicket);
            transaction.setFlowableProcessId(processInstanceId);
            trace.put("flowableProcessId", processInstanceId);
        } else {
            transaction.setFlowableProcessId(savedTicket.getId().toString());
            trace.put("flowableProcessId", savedTicket.getId().toString());
        }

        trace.put("transactionId", transaction.getId());
        trace.put("amount", transaction.getAmount());
        trace.put("type", transaction.getType());
        trace.put("status", transaction.getStatus());
        return trace;
    }

    private void recordAgentTrace(
            UUID sessionId,
            UUID userId,
            Transaction transaction,
            AgentDecision decision,
            Map<String, Object> trace) {
        if (sessionId == null) {
            return;
        }

        bankingAgentRepository.findBySessionIdAndUserId(sessionId, userId)
            .ifPresent(agent -> {
                agent.setDecision(decision);
                agent.setLastTransactionId(transaction.getId());
                agent.setContext(com.fasterxml.jackson.databind.json.JsonMapper.builder().build().valueToTree(trace));
                bankingAgentRepository.save(agent);
            });
    }

    private TicketType mapToTicketType(com.fintech.banking.domain.enums.TransactionType type) {
        // Maps transaction type to support ticket type
        return TicketType.TRANSFER_VALIDATION;
    }
}

package com.fintech.banking.service;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.TransactionRepository;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class FlowableTaskCompletionService {

    private final FlowableService flowableService;
    private final TransactionRepository transactionRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final AccountRepository accountRepository;
    private final NotificationService notificationService;
    private final SupportTicketService supportTicketService;

    public FlowableTaskCompletionService(
            FlowableService flowableService,
            TransactionRepository transactionRepository,
            SupportTicketRepository supportTicketRepository,
            AccountRepository accountRepository,
            NotificationService notificationService,
            SupportTicketService supportTicketService) {
        this.flowableService = flowableService;
        this.transactionRepository = transactionRepository;
        this.supportTicketRepository = supportTicketRepository;
        this.accountRepository = accountRepository;
        this.notificationService = notificationService;
        this.supportTicketService = supportTicketService;
    }

    public Map<String, Object> completeTask(String taskId, Map<String, Object> body) {
        Task task = flowableService.getTaskById(taskId);
        String processInstanceId = task != null ? task.getProcessInstanceId() : null;
        Map<String, Object> processVars = flowableService.getProcessVariables(processInstanceId);

        Map<String, Object> vars = body == null ? new HashMap<>() : new HashMap<>(body);
        boolean approved = readBoolean(vars.get("approved"), processVars.get("approved"));
        Object decisionFallback = vars.containsKey("decision") || vars.containsKey("approved")
                ? null
                : processVars.get("decision");
        String decision = readDecision(
                vars.get("decision"),
                decisionFallback,
                processVars.get("intent"),
                approved);
        validateDataUpdateDecision(task, decision);
        if (task != null
                && "taskValidationAdmin".equals(task.getTaskDefinitionKey())
                && "REQUEST_INFO".equals(decision)) {
            vars.put("infoCount", readInteger(processVars.get("infoCount")) + 1);
        }
        approved = "APPROVE".equals(decision) || "BLOQUER".equals(decision);
        final boolean decisionApproved = approved;
        vars.put("approved", approved);
        vars.put("decision", decision);
        flowableService.completeTask(taskId, vars);
        if (!"REQUEST_INFO".equals(decision)
                && !"CONTACTER".equals(decision)
                && !"ESCALATE".equals(decision)
                && !"CONTINUE".equals(decision)) {
            notificationService.notifyAdminsWorkflowResolved(taskId, decision);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("taskId", taskId);
        result.put("approved", approved);
        result.put("decision", decision);
        result.put("processInstanceId", processInstanceId);

        try {
            Object txIdObj = processVars.get("transactionId");
            if (txIdObj != null) {
                UUID txId = UUID.fromString(String.valueOf(txIdObj));
                Optional<Transaction> txOpt = transactionRepository.findById(txId);
                if (txOpt.isPresent()) {
                    handleTransactionOutcome(txOpt.get(), decisionApproved);
                }
                result.put("transactionId", txId);
            }

            Object supportTicketIdObj = processVars.get("supportTicketId");
            Optional<SupportTicket> supportTicket = Optional.empty();
            if (supportTicketIdObj != null) {
                Long ticketId = Long.parseLong(String.valueOf(supportTicketIdObj));
                supportTicket = supportTicketRepository.findById(ticketId);
            } else if (processInstanceId != null) {
                // Backward compatibility for processes started before the ticket
                // id was included in the process variables.
                supportTicket = supportTicketRepository.findByFlowableProcessId(processInstanceId);
            }
            if (supportTicket.isPresent()) {
                SupportTicket ticket = supportTicket.get();
                handleTicketOutcome(ticket, decision);
                result.put("supportTicketId", ticket.getId());
            }
        } catch (Exception ex) {
            result.put("completionWarning", ex.getMessage());
        }

        return result;
    }

    private boolean readBoolean(Object primary, Object fallback) {
        Object value = primary != null ? primary : fallback;
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private int readInteger(Object value) {
        if (value instanceof Number number) {
            return Math.max(0, number.intValue());
        }
        if (value == null) {
            return 0;
        }
        try {
            return Math.max(0, Integer.parseInt(String.valueOf(value)));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid workflow information request count", ex);
        }
    }

    private String readDecision(Object primary, Object fallback, Object intent, boolean approved) {
        Object value = primary != null ? primary : fallback;
        if (value == null || String.valueOf(value).isBlank()) {
            String normalizedIntent = intent == null
                    ? ""
                    : String.valueOf(intent).trim().toUpperCase();
            if ("FRAUD".equals(normalizedIntent) || "STOLEN_CARD".equals(normalizedIntent)
                    || "CLAIM".equals(normalizedIntent)) {
                return approved ? "BLOQUER" : "FAUX_POSITIF";
            }
            return approved ? "APPROVE" : "REJECT";
        }
        String normalized = String.valueOf(value).trim().toUpperCase();
        if (!normalized.equals("APPROVE") && !normalized.equals("REJECT")
                && !normalized.equals("REQUEST_INFO") && !normalized.equals("BLOQUER")
                && !normalized.equals("CONTACTER") && !normalized.equals("FAUX_POSITIF")
                && !normalized.equals("ESCALATE") && !normalized.equals("CONTINUE")) {
            throw new IllegalArgumentException("Unsupported task decision: " + value);
        }
        return normalized;
    }

    private void validateDataUpdateDecision(Task task, String decision) {
        if (task == null || task.getTaskDefinitionKey() == null) {
            return;
        }
        String taskDefinitionKey = task.getTaskDefinitionKey();
        boolean valid = switch (taskDefinitionKey) {
            case "dataUpdateTask", "taskValidationAdmin" -> "APPROVE".equals(decision)
                    || "REJECT".equals(decision)
                    || "REQUEST_INFO".equals(decision)
                    || "ESCALATE".equals(decision);
            case "followupTask" -> "CONTINUE".equals(decision);
            case "escalatedReviewTask" -> "APPROVE".equals(decision)
                    || "REJECT".equals(decision)
                    || "REQUEST_INFO".equals(decision);
            default -> true;
        };
        if (!valid) {
            throw new IllegalArgumentException(
                    "Decision " + decision + " is not valid for workflow task " + taskDefinitionKey);
        }
    }

    private void handleTransactionOutcome(Transaction transaction, boolean approved) {
        if (approved) {
            Account source = transaction.getSourceAccount();
            Account target = transaction.getTargetAccount();
            if (source != null && target != null) {
                source.debit(transaction.getAmount());
                target.credit(transaction.getAmount());
                accountRepository.save(source);
                accountRepository.save(target);
            }
            transaction.setStatus(TransactionStatus.COMPLETED);
            transactionRepository.save(transaction);

            UUID userId = source != null && source.getUser() != null ? source.getUser().getId() : null;
            if (userId != null) {
                notificationService.notifyTransferExecuted(userId, transaction.getAmount().toString());
            }
            return;
        }

        transaction.setStatus(TransactionStatus.FAILED);
        transactionRepository.save(transaction);
        UUID userId = transaction.getSourceAccount() != null && transaction.getSourceAccount().getUser() != null
                ? transaction.getSourceAccount().getUser().getId()
                : null;
        if (userId != null) {
            notificationService.notifyTransferRejected(userId, "Administrator rejected the transfer");
        }
    }

    private void handleTicketOutcome(SupportTicket ticket, String decision) {
        TicketStatus targetStatus = switch (decision) {
            case "APPROVE", "BLOQUER", "FAUX_POSITIF" -> TicketStatus.RESOLVED;
            case "REJECT" -> TicketStatus.CLOSED;
            case "REQUEST_INFO", "CONTACTER", "ESCALATE" -> TicketStatus.IN_PROGRESS;
            case "CONTINUE" -> null;
            default -> throw new IllegalArgumentException("Unsupported ticket decision: " + decision);
        };

        if (targetStatus == null) {
            return;
        }

        // Keep status timestamps and client notifications consistent for every
        // entry point that completes a Flowable task.
        if ("REQUEST_INFO".equals(decision) || "ESCALATE".equals(decision) || "REJECT".equals(decision)) {
            supportTicketService.updateTicketStatusFromWorkflow(ticket.getId(), targetStatus);
        } else {
            supportTicketService.updateTicketStatus(ticket.getId(), targetStatus);
        }
    }

}
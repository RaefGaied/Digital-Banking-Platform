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
        String decision = readDecision(
                vars.get("decision"),
                processVars.get("decision"),
                processVars.get("intent"),
                approved);
        if ("BLOQUER".equals(decision)) {
            approved = true;
        }
        vars.put("approved", approved);
        vars.put("decision", decision);
        flowableService.completeTask(taskId, vars);
        notificationService.notifyAdminsWorkflowResolved(taskId, decision);
        final boolean decisionApproved = approved;

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
                && !normalized.equals("CONTACTER") && !normalized.equals("FAUX_POSITIF")) {
            throw new IllegalArgumentException("Unsupported task decision: " + value);
        }
        return normalized;
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
            case "REQUEST_INFO", "CONTACTER" -> TicketStatus.IN_PROGRESS;
            default -> throw new IllegalArgumentException("Unsupported ticket decision: " + decision);
        };

        // Keep status timestamps and client notifications consistent for every
        // entry point that completes a Flowable task.
        supportTicketService.updateTicketStatus(ticket.getId(), targetStatus);
    }
}
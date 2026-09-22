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
import java.util.UUID;

@Service
public class FlowableTaskCompletionService {

    private final FlowableService flowableService;
    private final TransactionRepository transactionRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final AccountRepository accountRepository;
    private final NotificationService notificationService;

    public FlowableTaskCompletionService(
            FlowableService flowableService,
            TransactionRepository transactionRepository,
            SupportTicketRepository supportTicketRepository,
            AccountRepository accountRepository,
            NotificationService notificationService) {
        this.flowableService = flowableService;
        this.transactionRepository = transactionRepository;
        this.supportTicketRepository = supportTicketRepository;
        this.accountRepository = accountRepository;
        this.notificationService = notificationService;
    }

    public Map<String, Object> completeTask(String taskId, Map<String, Object> body) {
        Task task = flowableService.getTaskById(taskId);
        String processInstanceId = task != null ? task.getProcessInstanceId() : null;
        Map<String, Object> processVars = flowableService.getProcessVariables(processInstanceId);

        Map<String, Object> vars = body == null ? new HashMap<>() : new HashMap<>(body);
        boolean approved = readBoolean(vars.get("approved"), processVars.get("approved"));
        String decision = readDecision(vars.get("decision"), processVars.get("decision"), approved);
        vars.put("approved", approved);
        vars.put("decision", decision);
        flowableService.completeTask(taskId, vars);

        Map<String, Object> result = new HashMap<>();
        result.put("taskId", taskId);
        result.put("approved", approved);
        result.put("decision", decision);
        result.put("processInstanceId", processInstanceId);

        try {
            Object txIdObj = processVars.get("transactionId");
            if (txIdObj != null) {
                UUID txId = UUID.fromString(String.valueOf(txIdObj));
                transactionRepository.findById(txId).ifPresent(transaction -> handleTransactionOutcome(transaction, approved));
                result.put("transactionId", txId);
            }

            Object supportTicketIdObj = processVars.get("supportTicketId");
            if (supportTicketIdObj != null) {
                Long ticketId = Long.parseLong(String.valueOf(supportTicketIdObj));
                supportTicketRepository.findById(ticketId).ifPresent(ticket -> handleTicketOutcome(ticket, approved));
                result.put("supportTicketId", ticketId);
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

    private String readDecision(Object primary, Object fallback, boolean approved) {
        Object value = primary != null ? primary : fallback;
        if (value == null || String.valueOf(value).isBlank()) {
            return approved ? "APPROVE" : "REJECT";
        }
        String normalized = String.valueOf(value).trim().toUpperCase();
        if (!normalized.equals("APPROVE") && !normalized.equals("REJECT")
                && !normalized.equals("REQUEST_INFO")) {
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

    private void handleTicketOutcome(SupportTicket ticket, boolean approved) {
        ticket.setStatus(approved ? TicketStatus.RESOLVED : TicketStatus.IN_PROGRESS);
        supportTicketRepository.save(ticket);

        if (ticket.getUserId() == null) {
            return;
        }

        if (approved) {
            notificationService.notifyTicketResolved(ticket.getUserId(), ticket.getId());
        } else {
            notificationService.notifyTicketUpdated(ticket.getUserId(), ticket.getId(), "Your ticket has been updated by an administrator.");
        }
    }
}
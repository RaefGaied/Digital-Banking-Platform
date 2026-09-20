package com.fintech.banking.workflow.delegate;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Verifies that the source account has sufficient balance for the requested
 * transfer amount. Sets the {@code soldeSuffisant} process variable.
 */
@Slf4j
@Component("verifSoldeDelegate")
@RequiredArgsConstructor
public class VerifyBalanceDelegate implements JavaDelegate {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    @Override
    public void execute(DelegateExecution execution) {
        BigDecimal amount = toBigDecimal(execution.getVariable("amount"));
        boolean sufficient = false;

        Optional<Account> sourceAccount = resolveSourceAccount(execution);
        if (sourceAccount.isPresent() && amount != null) {
            sufficient = sourceAccount.get().getBalance().compareTo(amount) >= 0;
        }

        execution.setVariable("soldeSuffisant", sufficient);
        log.info("verifSoldeDelegate: process={} soldeSuffisant={}", execution.getProcessInstanceId(), sufficient);
    }

    private Optional<Account> resolveSourceAccount(DelegateExecution execution) {
        Object transactionIdRaw = execution.getVariable("transactionId");
        if (transactionIdRaw != null) {
            try {
                UUID transactionId = UUID.fromString(transactionIdRaw.toString());
                Optional<Transaction> transaction = transactionRepository.findById(transactionId);
                if (transaction.isPresent() && transaction.get().getSourceAccount() != null) {
                    return Optional.of(transaction.get().getSourceAccount());
                }
            } catch (IllegalArgumentException ex) {
                log.warn("verifSoldeDelegate: invalid transactionId '{}'", transactionIdRaw);
            }
        }

        String userIdRaw = (String) execution.getVariable("userId");
        if (userIdRaw != null) {
            try {
                UUID userId = UUID.fromString(userIdRaw);
                List<Account> accounts = accountRepository.findByUserId(userId);
                return accounts.stream().max((a, b) -> a.getBalance().compareTo(b.getBalance()));
            } catch (IllegalArgumentException ex) {
                log.warn("verifSoldeDelegate: invalid userId '{}'", userIdRaw);
            }
        }
        return Optional.empty();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}

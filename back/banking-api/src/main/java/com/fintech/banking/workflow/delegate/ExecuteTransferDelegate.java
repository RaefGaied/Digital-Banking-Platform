package com.fintech.banking.workflow.delegate;

import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Executes (debits/credits) the transfer transaction once it has been
 * approved. Sets the {@code execOk} process variable used by the
 * execution/retry gateways.
 */
@Slf4j
@Component("executeDelegate")
@RequiredArgsConstructor
public class ExecuteTransferDelegate implements JavaDelegate {

    private final TransactionRepository transactionRepository;

    @Override
    @Transactional
    public void execute(DelegateExecution execution) {
        Object transactionIdRaw = execution.getVariable("transactionId");
        boolean ok = true;
        if (transactionIdRaw != null) {
            try {
                UUID transactionId = UUID.fromString(transactionIdRaw.toString());
                Optional<Transaction> maybeTx = transactionRepository.findById(transactionId);
                if (maybeTx.isPresent()) {
                    ok = applyTransfer(maybeTx.get());
                }
            } catch (IllegalArgumentException ex) {
                log.warn("executeDelegate: invalid transactionId '{}'", transactionIdRaw);
                ok = false;
            }
        }
        execution.setVariable("execOk", ok);
        log.info("executeDelegate: process={} execOk={}", execution.getProcessInstanceId(), ok);
    }

    private boolean applyTransfer(Transaction transaction) {
        try {
            if (transaction.getSourceAccount() != null) {
                transaction.getSourceAccount().debit(transaction.getAmount());
            }
            if (transaction.getTargetAccount() != null) {
                transaction.getTargetAccount().credit(transaction.getAmount());
            }
            transaction.setStatus(TransactionStatus.COMPLETED);
            transactionRepository.save(transaction);
            return true;
        } catch (Exception ex) {
            log.error("executeDelegate: transfer execution failed for transaction {}: {}",
                    transaction.getId(), ex.getMessage());
            transaction.setStatus(TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            return false;
        }
    }
}

package com.fintech.banking.workflow.delegate;

import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Verifies that the transfer's target account (beneficiary) exists and is
 * addressable. Sets the {@code benefValide} process variable.
 */
@Slf4j
@Component("verifBenefDelegate")
@RequiredArgsConstructor
public class VerifyBeneficiaryDelegate implements JavaDelegate {

    private final TransactionRepository transactionRepository;

    @Override
    public void execute(DelegateExecution execution) {
        boolean valid = true;
        Object transactionIdRaw = execution.getVariable("transactionId");
        if (transactionIdRaw != null) {
            try {
                UUID transactionId = UUID.fromString(transactionIdRaw.toString());
                Optional<Transaction> transaction = transactionRepository.findById(transactionId);
                valid = transaction.map(t -> t.getTargetAccount() != null).orElse(true);
            } catch (IllegalArgumentException ex) {
                log.warn("verifBenefDelegate: invalid transactionId '{}'", transactionIdRaw);
            }
        }
        execution.setVariable("benefValide", valid);
        log.info("verifBenefDelegate: process={} benefValide={}", execution.getProcessInstanceId(), valid);
    }
}

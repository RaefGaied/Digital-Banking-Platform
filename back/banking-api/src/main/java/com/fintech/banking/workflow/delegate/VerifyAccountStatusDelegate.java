package com.fintech.banking.workflow.delegate;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.enums.AccountStatus;
import com.fintech.banking.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Verifies that the requesting user has at least one active account.
 * Sets the {@code compteActif} process variable consumed by the
 * transfer and fraud BPMN processes.
 */
@Slf4j
@Component("verifCompteDelegate")
@RequiredArgsConstructor
public class VerifyAccountStatusDelegate implements JavaDelegate {

    private final AccountRepository accountRepository;

    @Override
    public void execute(DelegateExecution execution) {
        String userIdRaw = (String) execution.getVariable("userId");
        boolean active = false;
        if (userIdRaw != null) {
            try {
                UUID userId = UUID.fromString(userIdRaw);
                List<Account> accounts = accountRepository.findByUserId(userId);
                active = accounts.stream().anyMatch(a -> a.getStatus() == AccountStatus.ACTIVE);
            } catch (IllegalArgumentException ex) {
                log.warn("verifCompteDelegate: invalid userId '{}': {}", userIdRaw, ex.getMessage());
            }
        }
        execution.setVariable("compteActif", active);
        log.info("verifCompteDelegate: process={} compteActif={}", execution.getProcessInstanceId(), active);
    }
}

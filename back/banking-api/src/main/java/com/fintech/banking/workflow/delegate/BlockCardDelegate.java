package com.fintech.banking.workflow.delegate;

import com.fintech.banking.domain.entity.Card;
import com.fintech.banking.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Blocks the user's active card(s) when an admin decides "BLOQUER" during
 * fraud analysis. Sets the {@code blocageOk} process variable.
 */
@Slf4j
@Component("bloquerCarteDelegate")
@RequiredArgsConstructor
public class BlockCardDelegate implements JavaDelegate {

    private final CardRepository cardRepository;

    @Override
    @Transactional
    public void execute(DelegateExecution execution) {
        String userIdRaw = (String) execution.getVariable("userId");
        boolean blocked = false;
        if (userIdRaw != null) {
            try {
                UUID userId = UUID.fromString(userIdRaw);
                List<Card> activeCards = cardRepository.findByUserIdAndActiveTrue(userId);
                if (!activeCards.isEmpty()) {
                    activeCards.forEach(card -> card.setActive(false));
                    cardRepository.saveAll(activeCards);
                }
                blocked = true;
            } catch (Exception ex) {
                log.error("bloquerCarteDelegate: failed to block cards for user {}: {}", userIdRaw, ex.getMessage());
                blocked = false;
            }
        }
        execution.setVariable("blocageOk", blocked);
        log.info("bloquerCarteDelegate: process={} blocageOk={}", execution.getProcessInstanceId(), blocked);
    }
}

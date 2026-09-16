package com.fintech.banking.kafka;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("!test")
public class TransactionEventConsumer {

    @KafkaListener(topics = "transactions", groupId = "banking-group")
    public void consume(TransactionEvent event) {
        log.info("[KAFKA] Transaction received: id={}, type={}, status={}, amount={}",
                event.getTransactionId(),
                event.getType(),
                event.getStatus(),
                event.getAmount());

        // This could trigger: email, push notification, audit persistence, etc.
        log.info("[KAFKA] Processing complete for transaction: {}", event.getTransactionId());
    }
}

package com.fintech.banking.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TransactionEventProducer {

    private static final String TOPIC = "transactions";

    private final KafkaTemplate<String, TransactionEvent> kafkaTemplate;

    public void publish(TransactionEvent event) {
        log.info("Publishing transaction event: type={}, amount={}, id={}",
                event.getType(), event.getAmount(), event.getTransactionId());
        kafkaTemplate.send(TOPIC, event.getTransactionId().toString(), event);
    }
}

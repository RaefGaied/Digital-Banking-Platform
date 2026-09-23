package com.fintech.banking.kafka;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.RedisConnectionFailureException;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.EmailService;
import com.fintech.banking.domain.enums.TransactionStatus;
import lombok.RequiredArgsConstructor;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.Set;

@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class TransactionEventConsumer {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = "transactions", groupId = "banking-group")
    public void consume(TransactionEvent event) {
        log.info("[KAFKA] Transaction received: id={}, type={}, status={}, amount={}",
                event.getTransactionId(),
                event.getType(),
                event.getStatus(),
                event.getAmount());

        // This could trigger: email, push notification, audit persistence, etc.
        log.info("[KAFKA] Processing complete for transaction: {}", event.getTransactionId());
        if (event.getStatus() == TransactionStatus.COMPLETED) {
            Set<String> recipients = new LinkedHashSet<>();
            for (String accountNumber : new String[]{event.getSourceAccountNumber(), event.getTargetAccountNumber()}) {
                if (accountNumber != null) {
                    accountRepository.findByNumber(accountNumber)
                            .map(account -> account.getUser().getId())
                            .flatMap(userRepository::findById)
                            .map(user -> user.getEmail())
                            .ifPresent(recipients::add);
                }
            }
            recipients.forEach(email -> sendReceiptOnce(email, event));
        }
    }

    private void sendReceiptOnce(String recipient, TransactionEvent event) {
        if (event.getTransactionId() == null) {
            log.warn("[KAFKA] Skipping receipt without transaction id for {}", recipient);
            return;
        }

        String key = "transaction-receipt:" + event.getTransactionId() + ":" + recipient;
        Boolean firstDelivery;
        try {
            firstDelivery = redisTemplate.opsForValue()
                    .setIfAbsent(key, "sent", Duration.ofDays(7));
        } catch (RedisConnectionFailureException ex) {
            log.error("[KAFKA] Redis unavailable; sending receipt without deduplication for transaction {}",
                    event.getTransactionId(), ex);
            firstDelivery = true;
        }
        if (!Boolean.TRUE.equals(firstDelivery)) {
            log.info("[KAFKA] Skipping duplicate receipt for transaction {} and recipient {}",
                    event.getTransactionId(), recipient);
            return;
        }

        emailService.sendTransactionReceipt(recipient, event);
    }
}

package com.fintech.banking.kafka;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.EmailService;
import com.fintech.banking.domain.enums.TransactionStatus;
import lombok.RequiredArgsConstructor;

@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class TransactionEventConsumer {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

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
            String accountNumber = event.getSourceAccountNumber() != null
                    ? event.getSourceAccountNumber() : event.getTargetAccountNumber();
            accountRepository.findByNumber(accountNumber)
                    .map(account -> account.getUser().getId())
                    .flatMap(userRepository::findById)
                    .map(user -> user.getEmail())
                    .ifPresent(email -> emailService.sendTransactionReceipt(email, event));
        }
    }
}

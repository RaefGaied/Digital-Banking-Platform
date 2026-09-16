package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.PaymentKey;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.PaymentKeyType;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.domain.enums.TransactionType;
import com.fintech.banking.dto.request.PaymentTransferRequest;
import com.fintech.banking.dto.request.RegisterPaymentKeyRequest;
import com.fintech.banking.dto.response.PaymentKeyResponse;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.kafka.TransactionEvent;
import com.fintech.banking.kafka.TransactionEventProducer;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.PaymentKeyRepository;
import com.fintech.banking.repository.TransactionRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.AuditLogService;
import com.fintech.banking.service.PaymentKeyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentKeyServiceImpl implements PaymentKeyService {

    private final PaymentKeyRepository paymentKeyRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionEventProducer eventProducer;
    private final AuditLogService auditLogService;

    private Account getAccountByEmail(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        var accounts = accountRepository.findByUserId(user.getId());
        if (accounts.isEmpty()) throw new IllegalArgumentException("Account not found");
        return accounts.get(0);
    }

    private PaymentKeyResponse toResponse(PaymentKey key) {
        Account account = accountRepository.findByUserId(key.getUser().getId()).get(0);
        return PaymentKeyResponse.builder()
                .id(key.getId())
                .keyType(key.getKeyType())
                .keyValue(key.getKeyValue())
                .ownerName(key.getUser().getName())
                .accountNumber(account.getNumber())
                .agency(account.getAgency())
                .active(key.getActive())
                .verified(key.getVerified())
                .verificationMethod(key.getVerificationMethod())
                .verifiedAt(key.getVerifiedAt())
                .createdAt(key.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public PaymentKeyResponse registerKey(String email, RegisterPaymentKeyRequest request) {
        if (paymentKeyRepository.existsByKeyValue(request.getKeyValue())) {
            throw new IllegalArgumentException("Payment key already registered");
        }

        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String keyValue = request.getKeyType() == PaymentKeyType.RANDOM
                ? UUID.randomUUID().toString()
                : request.getKeyValue();

        PaymentKey paymentKey = PaymentKey.builder()
                .user(user)
                .keyType(request.getKeyType())
                .keyValue(keyValue)
                .build();

        paymentKeyRepository.save(paymentKey);
        auditLogService.log(email, "PAYMENT_KEY_REGISTER", "PaymentKey", paymentKey.getId().toString(), "Payment key registered: " + keyValue, "system");
        log.info("[PAYMENT] Key registered: {} - {}", request.getKeyType(), keyValue);
        return toResponse(paymentKey);
    }

    @Override
    public List<PaymentKeyResponse> getMyKeys(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return paymentKeyRepository.findByUserIdAndActiveTrue(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public PaymentKeyResponse findKey(String keyValue) {
        PaymentKey key = paymentKeyRepository.findByKeyValueAndActiveTrue(keyValue)
                .orElseThrow(() -> new IllegalArgumentException("Payment key not found"));
        return toResponse(key);
    }

    @Override
    @Transactional
    public TransactionResponse transfer(String email, PaymentTransferRequest request) {
        Account source = getAccountByEmail(email);

        PaymentKey targetKey = paymentKeyRepository.findByKeyValueAndActiveTrue(request.getPaymentKey())
                .orElseThrow(() -> new IllegalArgumentException("Payment key not found"));

        Account target = accountRepository.findByUserId(targetKey.getUser().getId())
                .stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Destination account not found"));

        if (source.getId().equals(target.getId())) {
            throw new IllegalArgumentException("Cannot transfer to the same account");
        }

        source.debit(request.getAmount());
        target.credit(request.getAmount());
        accountRepository.save(source);
        accountRepository.save(target);

        String desc = request.getDescription() != null ? request.getDescription() : "Payment to " + targetKey.getKeyValue();

        Transaction transaction = transactionRepository.save(Transaction.builder()
                .sourceAccount(source)
                .targetAccount(target)
                .amount(request.getAmount())
                .type(TransactionType.TRANSFER)
                .status(TransactionStatus.COMPLETED)
                .description(desc)
                .build());

        eventProducer.publish(TransactionEvent.builder()
                .transactionId(transaction.getId())
                .type(transaction.getType())
                .status(transaction.getStatus())
                .amount(transaction.getAmount())
                .description(desc)
                .sourceAccountNumber(source.getNumber())
                .targetAccountNumber(target.getNumber())
                .occurredAt(LocalDateTime.now())
                .build());

        auditLogService.log(email, "PAYMENT_TRANSFER", "Transaction", transaction.getId().toString(),
                "Payment sent to " + request.getPaymentKey() + " - " + request.getAmount(), "system");

        log.info("[PAYMENT] Transfer completed: {} -> {} {}", source.getNumber(), target.getNumber(), request.getAmount());

        return TransactionResponse.builder()
                .id(transaction.getId())
                .amount(transaction.getAmount())
                .type(transaction.getType())
                .status(transaction.getStatus())
                .description(desc)
                .sourceAccountNumber(source.getNumber())
                .targetAccountNumber(target.getNumber())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}

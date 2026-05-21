package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.PixKey;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.PixKeyType;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.domain.enums.TransactionType;
import com.fintech.banking.dto.request.PixTransferRequest;
import com.fintech.banking.dto.request.RegisterPixKeyRequest;
import com.fintech.banking.dto.response.PixKeyResponse;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.kafka.TransactionEvent;
import com.fintech.banking.kafka.TransactionEventProducer;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.PixKeyRepository;
import com.fintech.banking.repository.TransactionRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.AuditLogService;
import com.fintech.banking.service.PixService;
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
public class PixServiceImpl implements PixService {

    private final PixKeyRepository pixKeyRepository;
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

    private PixKeyResponse toResponse(PixKey key) {
        Account account = accountRepository.findByUserId(key.getUser().getId()).get(0);
        return PixKeyResponse.builder()
                .id(key.getId())
                .keyType(key.getKeyType())
                .keyValue(key.getKeyValue())
                .ownerName(key.getUser().getName())
                .accountNumber(account.getNumber())
                .agency(account.getAgency())
                .active(key.getActive())
                .createdAt(key.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public PixKeyResponse registerKey(String email, RegisterPixKeyRequest request) {
        if (pixKeyRepository.existsByKeyValue(request.getKeyValue())) {
                        throw new IllegalArgumentException("PIX key already registered");
        }

        var user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String keyValue = request.getKeyType() == PixKeyType.RANDOM
                ? UUID.randomUUID().toString()
                : request.getKeyValue();

        PixKey pixKey = PixKey.builder()
                .user(user)
                .keyType(request.getKeyType())
                .keyValue(keyValue)
                .build();

        pixKeyRepository.save(pixKey);
                auditLogService.log(email, "PIX_KEY_REGISTER", "PixKey", pixKey.getId().toString(), "PIX key registered: " + keyValue, "system");
                log.info("[PIX] Key registered: {} - {}", request.getKeyType(), keyValue);
        return toResponse(pixKey);
    }

    @Override
    public List<PixKeyResponse> getMyKeys(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return pixKeyRepository.findByUserIdAndActiveTrue(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public PixKeyResponse findKey(String pixKey) {
        PixKey key = pixKeyRepository.findByKeyValueAndActiveTrue(pixKey)
                                .orElseThrow(() -> new IllegalArgumentException("PIX key not found"));
        return toResponse(key);
    }

    @Override
    @Transactional
    public TransactionResponse transfer(String email, PixTransferRequest request) {
        Account source = getAccountByEmail(email);

        PixKey targetKey = pixKeyRepository.findByKeyValueAndActiveTrue(request.getPixKey())
                .orElseThrow(() -> new IllegalArgumentException("PIX key not found"));

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

        String desc = request.getDescription() != null ? request.getDescription() : "PIX to " + targetKey.getKeyValue();

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

        auditLogService.log(email, "PIX_TRANSFER", "Transaction", transaction.getId().toString(),
                "PIX sent to " + request.getPixKey() + " - R$ " + request.getAmount(), "system");

        log.info("[PIX] Transfer completed: {} -> {} R$ {}", source.getNumber(), target.getNumber(), request.getAmount());

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

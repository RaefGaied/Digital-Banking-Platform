package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.domain.enums.TransactionType;
import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.kafka.TransactionEvent;
import com.fintech.banking.kafka.TransactionEventProducer;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.TransactionRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionEventProducer eventProducer;

    private Account getAccountByEmail(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        var accounts = accountRepository.findByUserId(user.getId());
        if (accounts.isEmpty()) throw new IllegalArgumentException("Account not found");
        return accounts.get(0);
    }

    private TransactionResponse toResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .amount(t.getAmount())
                .type(t.getType())
                .status(t.getStatus())
                .description(t.getDescription())
                .sourceAccountNumber(t.getSourceAccount() != null ? t.getSourceAccount().getNumber() : null)
                .targetAccountNumber(t.getTargetAccount() != null ? t.getTargetAccount().getNumber() : null)
                .createdAt(t.getCreatedAt())
                .build();
    }

    private void publishEvent(Transaction t) {
        eventProducer.publish(TransactionEvent.builder()
                .transactionId(t.getId())
                .type(t.getType())
                .status(t.getStatus())
                .amount(t.getAmount())
                .description(t.getDescription())
                .sourceAccountNumber(t.getSourceAccount() != null ? t.getSourceAccount().getNumber() : null)
                .targetAccountNumber(t.getTargetAccount() != null ? t.getTargetAccount().getNumber() : null)
                .occurredAt(LocalDateTime.now())
                .build());
    }

    @Override
    @Transactional
    @CacheEvict(value = "accounts", key = "#email")
    public TransactionResponse deposit(String email, TransactionRequest request) {
        Account account = getAccountByEmail(email);
        account.credit(request.getAmount());
        accountRepository.save(account);
        Transaction transaction = transactionRepository.save(Transaction.builder()
                .targetAccount(account)
                .amount(request.getAmount())
                .type(TransactionType.DEPOSIT)
                .status(TransactionStatus.COMPLETED)
                .description(request.getDescription())
                .build());
        publishEvent(transaction);
        return toResponse(transaction);
    }

    @Override
    @Transactional
    @CacheEvict(value = "accounts", key = "#email")
    public TransactionResponse withdraw(String email, TransactionRequest request) {
        Account account = getAccountByEmail(email);
        account.debit(request.getAmount());
        accountRepository.save(account);
        Transaction transaction = transactionRepository.save(Transaction.builder()
                .sourceAccount(account)
                .amount(request.getAmount())
                .type(TransactionType.WITHDRAWAL)
                .status(TransactionStatus.COMPLETED)
                .description(request.getDescription())
                .build());
        publishEvent(transaction);
        return toResponse(transaction);
    }

    @Override
    @Transactional
    @CacheEvict(value = "accounts", key = "#email")
    public TransactionResponse transfer(String email, TransactionRequest request) {
        Account source = getAccountByEmail(email);
        Account target = accountRepository.findByNumber(request.getTargetAccountNumber())
            .orElseThrow(() -> new IllegalArgumentException("Destination account not found"));
        source.debit(request.getAmount());
        target.credit(request.getAmount());
        accountRepository.save(source);
        accountRepository.save(target);
        Transaction transaction = transactionRepository.save(Transaction.builder()
                .sourceAccount(source)
                .targetAccount(target)
                .amount(request.getAmount())
                .type(TransactionType.TRANSFER)
                .status(TransactionStatus.COMPLETED)
                .description(request.getDescription())
                .build());
        publishEvent(transaction);
        return toResponse(transaction);
    }

    @Override
    public List<TransactionResponse> getHistory(String email) {
        Account account = getAccountByEmail(email);
        return transactionRepository.findAllByAccountId(account.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}

package com.fintech.banking.service;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AccountStatus;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.domain.enums.TransactionType;
import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.dto.response.AtmWithdrawalReceipt;
import com.fintech.banking.dto.response.WithdrawalInitiationResponse;
import com.fintech.banking.kafka.TransactionEvent;
import com.fintech.banking.kafka.TransactionEventProducer;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.TransactionRepository;
import com.fintech.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WithdrawalService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final TransactionEventProducer eventProducer;
    private final NotificationService notificationService;

    @Value("${app.withdrawal.code-validity-minutes:30}")
    private int codeValidityMinutes;

    @Transactional
    @CacheEvict(value = "accounts", key = "#email")
    public WithdrawalInitiationResponse initiateWithdrawal(String email, TransactionRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than zero");
        }
        if (codeValidityMinutes < 1) {
            throw new IllegalStateException("Withdrawal code validity must be configured to at least one minute");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Account selectedAccount = accountRepository.findByUserId(user.getId()).stream()
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        Account account = accountRepository.findByIdForUpdate(selectedAccount.getId())
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("Withdrawals are not available for this account");
        }

        account.debit(request.getAmount());
        accountRepository.save(account);

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(codeValidityMinutes);
        String code = String.format(Locale.ROOT, "%08d", RANDOM.nextInt(100_000_000));
        Transaction transaction = transactionRepository.save(Transaction.builder()
                .sourceAccount(account)
                .amount(request.getAmount())
                .type(TransactionType.WITHDRAWAL)
                .status(TransactionStatus.PENDING)
                .description(request.getDescription())
                .withdrawalCodeHash(passwordEncoder.encode(code))
                .withdrawalCodeExpiresAt(expiresAt)
                .withdrawalFailedAttempts(0)
                .build());

        emailService.sendWithdrawalCode(
                user.getEmail(),
                user.getName(),
                code,
                transaction.getId().toString(),
                codeValidityMinutes);
        notificationService.notifyWithdrawalPending(user.getId(), request.getAmount().toString());

        return response(transaction, "Code sent to your registered email. Present the reference and code at a FinBank counter.");
    }

    @Transactional(noRollbackFor = {
            InvalidWithdrawalCodeException.class,
            WithdrawalExpiredException.class
    })
    @CacheEvict(value = "accounts", allEntries = true)
    public AtmWithdrawalReceipt redeem(UUID reference, String code) {
        Transaction transaction = findWithdrawalForUpdate(reference);
        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new WithdrawalUnavailableException("Withdrawal code is no longer active");
        }
        if (transaction.getWithdrawalCodeHash() == null || transaction.getWithdrawalCodeExpiresAt() == null) {
            throw new WithdrawalUnavailableException("Withdrawal code is unavailable");
        }
        if (!transaction.getWithdrawalCodeExpiresAt().isAfter(LocalDateTime.now())) {
            expireAndRefund(transaction);
            throw new WithdrawalExpiredException("Withdrawal code has expired; reserved funds have been returned");
        }
        if (transaction.getWithdrawalFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new WithdrawalUnavailableException("Withdrawal code is locked after too many attempts");
        }
        if (!passwordEncoder.matches(code, transaction.getWithdrawalCodeHash())) {
            transaction.setWithdrawalFailedAttempts(transaction.getWithdrawalFailedAttempts() + 1);
            transactionRepository.save(transaction);
            throw new InvalidWithdrawalCodeException("Invalid withdrawal code");
        }

        LocalDateTime redeemedAt = LocalDateTime.now();
        transaction.setStatus(TransactionStatus.COMPLETED);
        transaction.setWithdrawalRedeemedAt(redeemedAt);
        transactionRepository.save(transaction);
        notificationService.notifyWithdrawalCompleted(
                transaction.getSourceAccount().getUser().getId(),
                transaction.getAmount().toString());
        publishEvent(transaction);

        return AtmWithdrawalReceipt.builder()
                .reference(transaction.getId())
                .transactionId(transaction.getId())
                .amount(transaction.getAmount())
                .redeemedAt(redeemedAt)
                .status(transaction.getStatus().name())
                .message("Code accepted. The counter agent may now hand the cash to the customer.")
                .build();
    }

    @Transactional(noRollbackFor = WithdrawalUnavailableException.class)
    @CacheEvict(value = "accounts", allEntries = true)
    public WithdrawalInitiationResponse cancelWithdrawal(String email, UUID reference) {
        Transaction transaction = findWithdrawalForUpdate(reference);
        if (!email.equals(transaction.getSourceAccount().getUser().getEmail())) {
            throw new IllegalArgumentException("Withdrawal reference not found");
        }
        if (transaction.getStatus() != TransactionStatus.PENDING
                || transaction.getWithdrawalCodeHash() == null) {
            throw new WithdrawalUnavailableException("Withdrawal code is no longer active");
        }
        if (!transaction.getWithdrawalCodeExpiresAt().isAfter(LocalDateTime.now())) {
            expireAndRefund(transaction);
            return response(transaction, "Withdrawal code expired; reserved funds have been returned.");
        }

        refund(transaction);
        return response(transaction, "Withdrawal cancelled; reserved funds have been returned.");
    }

    @Transactional
    @CacheEvict(value = "accounts", allEntries = true)
    public WithdrawalInitiationResponse getWithdrawalStatus(String email, UUID reference) {
        Transaction transaction = findWithdrawalForUpdate(reference);
        if (!email.equals(transaction.getSourceAccount().getUser().getEmail())) {
            throw new IllegalArgumentException("Withdrawal reference not found");
        }
        if (transaction.getStatus() == TransactionStatus.PENDING
                && transaction.getWithdrawalCodeExpiresAt() != null
                && !transaction.getWithdrawalCodeExpiresAt().isAfter(LocalDateTime.now())) {
            expireAndRefund(transaction);
        }
        return response(transaction, "Withdrawal status");
    }

    @Scheduled(fixedDelayString = "${app.withdrawal.expiration-scan-ms:60000}")
    @Transactional
    @CacheEvict(value = "accounts", allEntries = true)
    public int expirePendingWithdrawals() {
        List<Transaction> expired = transactionRepository.findExpiredPendingWithdrawals(
                TransactionType.WITHDRAWAL,
                TransactionStatus.PENDING,
                LocalDateTime.now());
        expired.forEach(this::expireAndRefund);
        return expired.size();
    }

    private Transaction findWithdrawalForUpdate(UUID reference) {
        Transaction transaction = transactionRepository.findByIdForUpdate(reference)
                .orElseThrow(() -> new IllegalArgumentException("Withdrawal reference not found"));
        if (transaction.getType() != TransactionType.WITHDRAWAL) {
            throw new IllegalArgumentException("Withdrawal reference not found");
        }
        return transaction;
    }

    private void expireAndRefund(Transaction transaction) {
        refund(transaction);
    }

    private void refund(Transaction transaction) {
        Account account = accountRepository.findByIdForUpdate(transaction.getSourceAccount().getId())
                .orElseThrow(() -> new IllegalStateException("Withdrawal account no longer exists"));
        account.credit(transaction.getAmount());
        accountRepository.save(account);
        transaction.setStatus(TransactionStatus.FAILED);
        transactionRepository.save(transaction);
        notificationService.notifyWithdrawalRefunded(
                account.getUser().getId(),
                transaction.getAmount().toString());
        publishEvent(transaction);
    }

    private WithdrawalInitiationResponse response(Transaction transaction, String message) {
        return WithdrawalInitiationResponse.builder()
                .id(transaction.getId())
                .reference(transaction.getId())
                .transactionId(transaction.getId())
                .type(TransactionType.WITHDRAWAL)
                .amount(transaction.getAmount())
                .status(transaction.getStatus())
                .expiresAt(transaction.getWithdrawalCodeExpiresAt())
                .description(transaction.getDescription())
                .sourceAccountNumber(transaction.getSourceAccount().getNumber())
                .createdAt(transaction.getCreatedAt())
                .message(message)
                .build();
    }

    private void publishEvent(Transaction transaction) {
        eventProducer.publish(TransactionEvent.builder()
                .transactionId(transaction.getId())
                .type(transaction.getType())
                .status(transaction.getStatus())
                .amount(transaction.getAmount())
                .description(transaction.getDescription())
                .sourceAccountNumber(transaction.getSourceAccount().getNumber())
                .occurredAt(LocalDateTime.now())
                .build());
    }

    public static class InvalidWithdrawalCodeException extends RuntimeException {
        public InvalidWithdrawalCodeException(String message) {
            super(message);
        }
    }

    public static class WithdrawalExpiredException extends RuntimeException {
        public WithdrawalExpiredException(String message) {
            super(message);
        }
    }

    public static class WithdrawalUnavailableException extends RuntimeException {
        public WithdrawalUnavailableException(String message) {
            super(message);
        }
    }
}

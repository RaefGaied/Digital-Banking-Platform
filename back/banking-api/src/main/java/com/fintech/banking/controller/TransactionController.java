package com.fintech.banking.controller;

import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.service.TransactionService;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.TransactionRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.EmailService;
import com.fintech.banking.kafka.TransactionEvent;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> deposit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.deposit(userDetails.getUsername(), request));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.withdraw(userDetails.getUsername(), request));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.transfer(userDetails.getUsername(), request));
    }

    @GetMapping("/history")
    public ResponseEntity<List<TransactionResponse>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(transactionService.getHistory(userDetails.getUsername()));
    }

    @GetMapping("/{transactionId}/receipt")
    public ResponseEntity<byte[]> downloadReceipt(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        var user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean owner = (transaction.getSourceAccount() != null && transaction.getSourceAccount().getUser().getId().equals(user.getId()))
                || (transaction.getTargetAccount() != null && transaction.getTargetAccount().getUser().getId().equals(user.getId()));
        if (!owner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        TransactionEvent event = TransactionEvent.builder()
                .transactionId(transaction.getId())
                .type(transaction.getType())
                .status(transaction.getStatus())
                .amount(transaction.getAmount())
                .sourceAccountNumber(transaction.getSourceAccount() == null ? null : transaction.getSourceAccount().getNumber())
                .targetAccountNumber(transaction.getTargetAccount() == null ? null : transaction.getTargetAccount().getNumber())
                .description(transaction.getDescription())
                .occurredAt(transaction.getCreatedAt())
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"finbank-transaction-" + transactionId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(emailService.pdfBytes(event));
    }
}

package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.TransactionType;
import com.fintech.banking.domain.enums.TransactionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class WithdrawalInitiationResponse {
    private UUID id;
    private UUID reference;
    private UUID transactionId;
    private TransactionType type;
    private BigDecimal amount;
    private TransactionStatus status;
    private LocalDateTime expiresAt;
    private String description;
    private String sourceAccountNumber;
    private LocalDateTime createdAt;
    private String message;
}
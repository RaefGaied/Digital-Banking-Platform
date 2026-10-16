package com.fintech.banking.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AtmWithdrawalReceipt {
    private UUID reference;
    private UUID transactionId;
    private BigDecimal amount;
    private LocalDateTime redeemedAt;
    private String status;
    private String message;
}
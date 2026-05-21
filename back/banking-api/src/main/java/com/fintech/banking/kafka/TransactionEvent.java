package com.fintech.banking.kafka;

import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.domain.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionEvent {

    private UUID transactionId;
    private TransactionType type;
    private TransactionStatus status;
    private BigDecimal amount;
    private String sourceAccountNumber;
    private String targetAccountNumber;
    private String description;
    private LocalDateTime occurredAt;
}

package com.fintech.banking.dto.response;

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
public class TransactionResponse {

    private UUID id;
    private BigDecimal amount;
    private TransactionType type;
    private TransactionStatus status;
    private String description;
    private String sourceAccountNumber;
    private String targetAccountNumber;
    private LocalDateTime createdAt;
}

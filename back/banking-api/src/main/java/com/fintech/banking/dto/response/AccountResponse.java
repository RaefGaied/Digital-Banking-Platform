package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.AccountStatus;
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
public class AccountResponse {

    private UUID id;
    private String agency;
    private String number;
    private BigDecimal balance;
    private AccountStatus status;
    private String ownerName;
    private LocalDateTime createdAt;
}
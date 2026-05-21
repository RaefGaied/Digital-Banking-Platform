package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.InvestmentStatus;
import com.fintech.banking.domain.enums.InvestmentType;
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
public class InvestmentResponse {
    private UUID id;
    private InvestmentType investmentType;
    private BigDecimal amount;
    private BigDecimal annualRate;
    private BigDecimal currentValue;
    private BigDecimal profitLoss;
    private Double profitLossPercent;
    private InvestmentStatus status;
    private LocalDateTime investedAt;
    private LocalDateTime redeemedAt;
}

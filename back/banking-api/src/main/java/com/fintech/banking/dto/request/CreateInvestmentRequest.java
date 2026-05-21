package com.fintech.banking.dto.request;

import com.fintech.banking.domain.enums.InvestmentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateInvestmentRequest {

    @NotNull(message = "Investment type is required")
    private InvestmentType investmentType;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Minimum amount is R$ 1.00")
    private BigDecimal amount;
}

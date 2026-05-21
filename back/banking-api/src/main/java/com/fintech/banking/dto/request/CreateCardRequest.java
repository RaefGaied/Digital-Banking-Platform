package com.fintech.banking.dto.request;

import com.fintech.banking.domain.enums.CardBrand;
import com.fintech.banking.domain.enums.CardType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateCardRequest {

    @NotNull(message = "Tipo do cart\u00e3o \u00e9 obrigat\u00f3rio")
    private CardType cardType;

    @NotNull(message = "Bandeira \u00e9 obrigat\u00f3ria")
    private CardBrand brand;

    @NotBlank(message = "Nome do titular \u00e9 obrigat\u00f3rio")
    private String holderName;

    @NotBlank(message = "N\u00famero do cart\u00e3o \u00e9 obrigat\u00f3rio")
    @Size(min = 4, max = 4, message = "\u00daltimos 4 d\u00edgitos")
    private String lastFour;

    @NotNull
    @Min(1) @Max(12)
    private Integer expiryMonth;

    @NotNull
    private Integer expiryYear;

    private BigDecimal creditLimit;
}

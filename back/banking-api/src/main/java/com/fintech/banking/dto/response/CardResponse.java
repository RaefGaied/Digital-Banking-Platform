package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.CardBrand;
import com.fintech.banking.domain.enums.CardType;
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
public class CardResponse {
    private UUID id;
    private CardType cardType;
    private CardBrand brand;
    private String holderName;
    private String lastFour;
    private Integer expiryMonth;
    private Integer expiryYear;
    private BigDecimal creditLimit;
    private BigDecimal availableLimit;
    private Boolean active;
    private LocalDateTime createdAt;
}

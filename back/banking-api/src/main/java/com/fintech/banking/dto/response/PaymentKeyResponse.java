package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.PaymentKeyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentKeyResponse {

    private UUID id;
    private PaymentKeyType keyType;
    private String keyValue;
    private String ownerName;
    private String accountNumber;
    private String agency;
    private Boolean active;
    private Boolean verified;
    private String verificationMethod;
    private LocalDateTime verifiedAt;
    private LocalDateTime createdAt;
}

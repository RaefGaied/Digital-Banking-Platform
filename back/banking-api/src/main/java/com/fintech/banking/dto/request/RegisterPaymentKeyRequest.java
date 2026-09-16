package com.fintech.banking.dto.request;

import com.fintech.banking.domain.enums.PaymentKeyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterPaymentKeyRequest {

    @NotNull(message = "Key type is required")
    private PaymentKeyType keyType;

    @NotBlank(message = "Key value is required")
    private String keyValue;
}

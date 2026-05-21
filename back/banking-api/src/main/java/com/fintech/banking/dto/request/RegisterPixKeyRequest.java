package com.fintech.banking.dto.request;

import com.fintech.banking.domain.enums.PixKeyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterPixKeyRequest {

    @NotNull(message = "Key type is required")
    private PixKeyType keyType;

    @NotBlank(message = "Key value is required")
    private String keyValue;
}

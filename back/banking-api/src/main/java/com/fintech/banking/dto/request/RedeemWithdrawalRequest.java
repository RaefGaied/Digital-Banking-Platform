package com.fintech.banking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.UUID;

@Data
public class RedeemWithdrawalRequest {

    @NotNull
    private UUID reference;

    @NotBlank
    @Pattern(regexp = "\\d{8}", message = "Withdrawal code must contain exactly 8 digits")
    private String code;
}
package com.fintech.banking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AtmNetworkStatusResponse {
    private boolean simulated;
    private boolean available;
    private String message;
}
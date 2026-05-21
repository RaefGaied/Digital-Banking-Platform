package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.PixKeyType;
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
public class PixKeyResponse {

    private UUID id;
    private PixKeyType keyType;
    private String keyValue;
    private String ownerName;
    private String accountNumber;
    private String agency;
    private Boolean active;
    private LocalDateTime createdAt;
}

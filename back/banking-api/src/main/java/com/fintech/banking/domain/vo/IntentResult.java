package com.fintech.banking.domain.vo;

import com.fintech.banking.domain.enums.IntentType;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class IntentResult {

    private IntentType intent;

    private JsonNode parameters;

    private Double confidence;

    private String message;

    private Boolean isSensitive;

    public boolean isConfident() {
        return confidence != null && confidence >= 0.7;
    }

    public boolean requiresInfo() {
        return confidence != null && confidence < 0.7;
    }
}

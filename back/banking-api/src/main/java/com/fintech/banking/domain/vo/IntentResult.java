package com.fintech.banking.domain.vo;

import com.fintech.banking.domain.enums.IntentType;
import com.fasterxml.jackson.databind.JsonNode;
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

    public IntentResult() {
    }

    public IntentResult(IntentType intent, JsonNode parameters, Double confidence, String message, Boolean isSensitive) {
        this.intent = intent;
        this.parameters = parameters;
        this.confidence = confidence;
        this.message = message;
        this.isSensitive = isSensitive;
    }

    public IntentType getIntent() {
        return intent;
    }

    public void setIntent(IntentType intent) {
        this.intent = intent;
    }

    public JsonNode getParameters() {
        return parameters;
    }

    public void setParameters(JsonNode parameters) {
        this.parameters = parameters;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Boolean getIsSensitive() {
        return isSensitive;
    }

    public void setIsSensitive(Boolean isSensitive) {
        this.isSensitive = isSensitive;
    }
}

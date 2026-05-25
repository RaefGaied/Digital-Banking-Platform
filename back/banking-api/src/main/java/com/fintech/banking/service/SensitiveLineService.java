package com.fintech.banking.service;

import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.Set;

@Service
public class SensitiveLineService {

    private static final Set<IntentType> HIGH_RISK_INTENTS = EnumSet.of(
            IntentType.FRAUD,
            IntentType.STOLEN_CARD,
            IntentType.CLAIM,
            IntentType.UPDATE_DATA
    );

    private final BigDecimal transferThreshold;

    public SensitiveLineService(@Value("${banking.sensitive-line.transfer-threshold:5000}") BigDecimal transferThreshold) {
        this.transferThreshold = transferThreshold;
    }

    public boolean isSensitive(IntentType intent, JsonNode parameters) {
        if (intent == null) {
            return false;
        }

        if (HIGH_RISK_INTENTS.contains(intent)) {
            return true;
        }

        if (intent != IntentType.TRANSFER) {
            return false;
        }

        BigDecimal amount = extractAmount(parameters);
        return amount != null && amount.compareTo(transferThreshold) > 0;
    }

    public AgentDecision evaluate(IntentResult intentResult) {
        if (intentResult == null) {
            return AgentDecision.REQUEST_INFO;
        }

        if (intentResult.getConfidence() == null || intentResult.getConfidence() < 0.7) {
            return AgentDecision.REQUEST_INFO;
        }

        if (isSensitive(intentResult.getIntent(), intentResult.getParameters())) {
            return AgentDecision.TRIGGER_BPMN;
        }

        return AgentDecision.AUTO_EXECUTE;
    }

    private BigDecimal extractAmount(JsonNode parameters) {
        if (parameters == null || !parameters.has("amount")) {
            return null;
        }

        JsonNode amountNode = parameters.get("amount");
        if (amountNode.isNumber()) {
            return amountNode.decimalValue();
        }

        if (amountNode.isTextual()) {
            try {
                return new BigDecimal(amountNode.asText().replace(',', '.'));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }
}
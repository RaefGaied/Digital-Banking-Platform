package com.fintech.banking.service;

import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class RuleBasedIntentDetectionService implements IntentDetectionService {

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public IntentResult detectIntent(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        String lower = text.toLowerCase(Locale.ROOT);
        IntentType intent = null;
        double confidence = 0.4;

        if (lower.matches(".*\\b(transfer|virement|pix|pay|payment|send)\\b.*")) {
            intent = IntentType.TRANSFER;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(balance|solde|saldo)\\b.*")) {
            intent = IntentType.BALANCE;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(history|transactions|historique)\\b.*")) {
            intent = IntentType.HISTORY;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(fraud|fraude|stolen|volé|roubo)\\b.*")) {
            intent = IntentType.FRAUD;
            confidence = 0.95;
        } else if (lower.matches(".*\\b(stolen card|carte volée|stolen_card)\\b.*")) {
            intent = IntentType.STOLEN_CARD;
            confidence = 0.95;
        } else if (lower.matches(".*\\b(claim|reclamation|réclamation)\\b.*")) {
            intent = IntentType.CLAIM;
            confidence = 0.85;
        } else if (lower.matches(".*\\b(update|change|modifier|mise à jour)\\b.*")) {
            intent = IntentType.UPDATE_DATA;
            confidence = 0.8;
        }

        ObjectNode params = mapper.createObjectNode();

        IntentResult result = new IntentResult();
        result.setIntent(intent);
        result.setParameters(params);
        result.setConfidence(confidence);
        result.setMessage("rule-based");
        result.setIsSensitive(intent == IntentType.FRAUD
                || intent == IntentType.STOLEN_CARD
                || intent == IntentType.CLAIM
                || intent == IntentType.UPDATE_DATA);

        return result;
    }
}

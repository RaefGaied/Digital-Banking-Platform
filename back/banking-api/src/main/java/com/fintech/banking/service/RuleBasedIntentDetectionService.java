package com.fintech.banking.service;

import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Locale;

@Service
public class RuleBasedIntentDetectionService implements IntentDetectionService {

    private final ObjectMapper mapper = new ObjectMapper();
    private final SensitiveLineService sensitiveLineService;

    private static final Pattern AMOUNT_PATTERN = Pattern.compile("(?i)(?:transfer|virement|send|payer|payment|envoyer)(?:[^\\d]{0,20})?(\\d+(?:[.,]\\d{1,2})?)\\s*(?:€|eur|euro|euros)?");
    private static final Pattern BENEFICIARY_PATTERN = Pattern.compile("(?i)(?:to|vers|a|à)\\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})");

    public RuleBasedIntentDetectionService(SensitiveLineService sensitiveLineService) {
        this.sensitiveLineService = sensitiveLineService;
    }

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
        extractTransferParameters(text, params);

        IntentResult result = IntentResult.builder()
                .intent(intent)
                .parameters(params)
                .confidence(confidence)
                .message("rule-based")
                .isSensitive(sensitiveLineService.isSensitive(intent, params))
                .build();

        return result;
    }

    private void extractTransferParameters(String text, ObjectNode params) {
        Matcher amountMatcher = AMOUNT_PATTERN.matcher(text);
        if (amountMatcher.find()) {
            String rawAmount = amountMatcher.group(1).replace(',', '.');
            try {
                params.put("amount", new BigDecimal(rawAmount));
                params.put("currency", "EUR");
            } catch (NumberFormatException ignored) {
                // Keep the result usable if the amount cannot be parsed precisely.
            }
        }

        Matcher beneficiaryMatcher = BENEFICIARY_PATTERN.matcher(text);
        if (beneficiaryMatcher.find()) {
            params.put("beneficiary", beneficiaryMatcher.group(1).trim());
        }
    }
}

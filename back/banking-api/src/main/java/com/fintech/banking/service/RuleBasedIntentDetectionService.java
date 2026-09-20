package com.fintech.banking.service;

import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RuleBasedIntentDetectionService implements IntentDetectionService {

    private final ObjectMapper mapper = new ObjectMapper();
    private static final Pattern AMOUNT_PATTERN = Pattern.compile("(\\d+[,.]?\\d*)");
    private static final Pattern ACCOUNT_PATTERN = Pattern.compile("(?:compte|account|num(?:\\u00e9|e)?ro|no\\.|n°)\\s*([A-Za-z0-9-]{6,})", Pattern.CASE_INSENSITIVE);
    private static final Pattern STANDALONE_ACCOUNT_PATTERN = Pattern.compile("(?<![\\d\\w])\\d[\\d-]{5,}(?![\\d\\w])");
    private static final Pattern HISTORY_LIMIT_PATTERN = Pattern.compile("last\\s+(\\d+)", Pattern.CASE_INSENSITIVE);

    @Override
    public IntentResult detectIntent(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        String lower = text.toLowerCase(Locale.ROOT);
        IntentType intent = null;
        double confidence = 0.4;

        if (lower.matches(".*\\b(transfer|transfert|virement|send|envoyer|verser|transférer|transferer|vire|virer)\\b.*")
            || lower.matches("^(fait le|fais le|fait-le|fais-le|vas[- ]y|go)$")) {
            intent = IntentType.TRANSFER;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(balance|solde|saldo)\\b.*")) {
            intent = IntentType.BALANCE;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(history|transactions|historique|relevé|releve)\\b.*")) {
            intent = IntentType.HISTORY;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(créer|creer|créé|cree|create|ouvrir|obtenir|demander)\\b.*\\b(carte|card)\\b.*")
                || lower.matches(".*\\b(carte|card)\\b.*\\b(crédit|credit|bancaire|nouvelle|new)\\b.*")
                || lower.matches(".*\\b(carte|card)\\b.*\\b(cree|crée|created|créée|a été|a ete|existe|exist)\\b.*")
                || lower.matches(".*\\b(creation|création|creation de carte|demande de carte|carte.*crée|carte.*cree|carte.*created)\\b.*")) {
            intent = IntentType.CARD_CREATION;
            confidence = 0.9;
        } else if ((lower.contains("carte") && lower.contains("vol"))
            || lower.contains("stolen card") || lower.contains("stolen_card") || lower.contains("card stolen")) {
            intent = IntentType.STOLEN_CARD;
            confidence = 0.95;
        } else if (lower.matches(".*\\b(carte|card)\\b.*\\b(bloquer|bloquée|bloquee|activer|activation|limite|expire|perdue|lost|stolen|problème|probleme)\\b.*")) {
            intent = IntentType.CARD_SUPPORT;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(payer|paiement|payment|merchant|achat|purchase)\\b.*")) {
            intent = IntentType.PAYMENT;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(retrait|retirer|withdraw|cash|distributeur|atm)\\b.*")) {
            intent = IntentType.WITHDRAWAL;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(investir|investissement|investment|placement|épargne|epargne|cdb|lci|lca)\\b.*")) {
            intent = IntentType.INVESTMENT;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(compte|account|agence|numéro de compte|numero de compte)\\b.*")) {
            intent = IntentType.ACCOUNT;
            confidence = 0.85;
        } else if (lower.matches(".*\\b(pix|clé pix|cle pix|payment key)\\b.*")) {
            intent = IntentType.PIX;
            confidence = 0.9;
        } else if (lower.matches(".*\\b(profil|profile|mot de passe|password|sécurité|securite|2fa|authentification)\\b.*")) {
            intent = IntentType.PROFILE;
            confidence = 0.85;
        } else if (lower.matches(".*\\b(notification|notifications|alerte|alert|message reçu|message recu)\\b.*")) {
            intent = IntentType.NOTIFICATIONS;
            confidence = 0.85;
        } else if (lower.matches(".*\\b(aide|help|support|service client|question|assistance)\\b.*")) {
            intent = IntentType.SUPPORT;
            confidence = 0.75;
        } else if (lower.matches(".*\\b(fraud|fraude|stolen|volé|roubo|suspicious)\\b.*")) {
            intent = IntentType.FRAUD;
            confidence = 0.95;
        } else if (lower.matches(".*\\b(claim|reclamation|réclamation|plainte)\\b.*")) {
            intent = IntentType.CLAIM;
            confidence = 0.85;
        } else if (lower.matches(".*\\b(update|change|modifier|mise à jour|mettre à jour|actualiser)\\b.*")) {
            intent = IntentType.UPDATE_SENSITIVE_DATA;
            confidence = 0.8;
        }

        ObjectNode params = mapper.createObjectNode();
        extractAmount(text, params);
        extractAccountNumber(text, params);
        extractHistoryLimit(text, params);

        IntentResult result = new IntentResult();
        result.setIntent(intent);
        result.setParameters(params);
        result.setConfidence(confidence);
        result.setMessage("rule-based");
        result.setIsSensitive(intent == IntentType.FRAUD
                || intent == IntentType.STOLEN_CARD
                || intent == IntentType.CLAIM
                || intent == IntentType.UPDATE_SENSITIVE_DATA);
        result.setDetectedLanguage(com.fintech.banking.util.LanguageDetector.detect(text));

        return result;
    }

    private void extractAmount(String text, ObjectNode params) {
        Matcher matcher = AMOUNT_PATTERN.matcher(text.replace(',', '.'));
        while (matcher.find()) {
            if (isPartOfAccountNumber(text, matcher.start(), matcher.end())) {
                continue;
            }
            String value = matcher.group(1);
            try {
                BigDecimal amount = new BigDecimal(value);
                if (amount.compareTo(BigDecimal.ZERO) > 0) {
                    params.put("amount", amount);
                    return;
                }
            } catch (NumberFormatException ignored) {
            }
        }
    }

    private boolean isPartOfAccountNumber(String text, int start, int end) {
        Matcher accountMatcher = ACCOUNT_PATTERN.matcher(text);
        while (accountMatcher.find()) {
            if (start >= accountMatcher.start(1) && end <= accountMatcher.end(1)) {
                return true;
            }
        }
        return false;
    }

    private void extractAccountNumber(String text, ObjectNode params) {
        Matcher matcher = ACCOUNT_PATTERN.matcher(text);
        if (matcher.find()) {
            params.put("targetAccountNumber", matcher.group(1));
            return;
        }
        Matcher standalone = STANDALONE_ACCOUNT_PATTERN.matcher(text);
        if (standalone.find()) {
            String candidate = standalone.group();
            if (!candidate.contains(".") && !candidate.contains(",")) {
                params.put("targetAccountNumber", candidate);
            }
        }
    }

    private void extractHistoryLimit(String text, ObjectNode params) {
        Matcher matcher = HISTORY_LIMIT_PATTERN.matcher(text);
        if (matcher.find()) {
            try {
                params.put("limit", Integer.parseInt(matcher.group(1)));
            } catch (NumberFormatException ignored) {
            }
        }
    }
}

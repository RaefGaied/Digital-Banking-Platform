package com.fintech.banking.service;

import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

/**
 * Intent detection backed by a local Ollama model. The rule-based detector remains
 * the last-resort implementation when Ollama is unavailable or returns invalid data.
 */
@Service
@Primary
@ConditionalOnProperty(prefix = "ai.ollama", name = "enabled", havingValue = "true")
@Slf4j
public class OllamaIntentDetectionService implements IntentDetectionService {

    private static final String SYSTEM_PROMPT = """
            You classify banking messages. Return only a JSON object with exactly these
            fields: intent, parameters, confidence, message, isSensitive, detectedLanguage.
            intent must be one of: TRANSFER, BALANCE, HISTORY, CARD_CREATION, CARD_SUPPORT,
            PAYMENT, WITHDRAWAL, INVESTMENT, ACCOUNT, PIX, PROFILE, NOTIFICATIONS, SUPPORT,
            FRAUD, STOLEN_CARD, CLAIM, UPDATE_SENSITIVE_DATA, or null.
            parameters must be a JSON object (use {} when there are no parameters).
            confidence must be a number from 0 to 1. isSensitive must be a boolean.
            detectedLanguage must be "FR" or "EN" depending on the language of the
            client message. Reply in French if the client writes in French; reply in
            English if the client writes in English (bilingual FR/EN support).
            """;

    private final ChatClient chatClient;
    private final IntentDetectionService fallback;

    public OllamaIntentDetectionService(ChatClient.Builder chatClientBuilder,
                                        RuleBasedIntentDetectionService fallback) {
        this.chatClient = chatClientBuilder.build();
        this.fallback = fallback;
    }

    @Override
    public IntentResult detectIntent(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        try {
            IntentResult result = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(text)
                    .call()
                    .entity(IntentResult.class);
            if (isValid(result, text)) {
                return result;
            }
        } catch (RuntimeException ex) {
            log.warn("Ollama intent detection failed; using rule-based fallback: {}", ex.getMessage());
        }
        return fallback.detectIntent(text);
    }

    private boolean isValid(IntentResult result, String originalText) {
        if (result == null || result.getIntent() == null
                || result.getConfidence() == null
                || result.getConfidence() < 0 || result.getConfidence() > 1) {
            return false;
        }
        if (result.getParameters() == null) {
            result.setParameters(com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode());
        }
        if (result.getIsSensitive() == null) {
            IntentType intent = result.getIntent();
            result.setIsSensitive(intent == IntentType.FRAUD
                    || intent == IntentType.STOLEN_CARD
                    || intent == IntentType.CLAIM
                    || intent == IntentType.UPDATE_SENSITIVE_DATA);
        }
        if (result.getDetectedLanguage() == null || result.getDetectedLanguage().isBlank()) {
            result.setDetectedLanguage(com.fintech.banking.util.LanguageDetector.detect(originalText));
        }
        return true;
    }
}

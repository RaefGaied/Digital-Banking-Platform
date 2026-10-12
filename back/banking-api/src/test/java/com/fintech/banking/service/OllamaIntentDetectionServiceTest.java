package com.fintech.banking.service;

import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class OllamaIntentDetectionServiceTest {

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
            Use conversation context only to interpret references and follow-up questions.
            Classify the current message, not an earlier request. Never reuse an amount,
            destination account, or confirmation from history as authorization for a
            financial action; require the user to provide the details again.
            """;

    @Test
    void sendsHighConfidenceBankingCommandsThroughOllamaBeforeUsingJavaRules() {
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        ChatClient client = mock(ChatClient.class, RETURNS_DEEP_STUBS);
        var parameters = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        parameters.put("amount", 100);
        parameters.put("targetAccountNumber", "204060-8");
        IntentResult modelResult = new IntentResult(
                IntentType.TRANSFER,
                parameters,
                0.95,
                null,
                false);
        modelResult.setDetectedLanguage("EN");

        when(builder.build()).thenReturn(client);
        when(client.prompt()
                .system(SYSTEM_PROMPT)
                .user("Transfer 100 to account 204060-8")
                .call()
                .entity(IntentResult.class))
                .thenReturn(modelResult);

        IntentResult result = new OllamaIntentDetectionService(
                builder, new RuleBasedIntentDetectionService())
                .detectIntent("Transfer 100 to account 204060-8");

        assertEquals(IntentType.TRANSFER, result.getIntent());
        assertEquals(0.95, result.getConfidence());
        assertNotNull(result.getParameters());
        assertEquals(100, result.getParameters().get("amount").asInt());
        assertEquals("204060-8", result.getParameters().get("targetAccountNumber").asText());
        assertEquals(false, result.getIsSensitive());
        assertEquals("EN", result.getDetectedLanguage());
        verify(client.prompt().system(SYSTEM_PROMPT).user("Transfer 100 to account 204060-8").call())
                .entity(IntentResult.class);
    }

    @Test
    void keepsExplicitSensitiveFraudIntentWhenMessageAlsoMentionsPayment() {
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        ChatClient client = mock(ChatClient.class, RETURNS_DEEP_STUBS);
        when(builder.build()).thenReturn(client);

        String message = "Je souhaite signaler une fraude : je ne reconnais pas un paiement de 120 euros effectué aujourd'hui";
        IntentResult result = new OllamaIntentDetectionService(
                builder, new RuleBasedIntentDetectionService())
                .detectIntent(message);

        assertEquals(IntentType.FRAUD, result.getIntent());
        assertEquals(true, result.getIsSensitive());
        org.mockito.Mockito.verifyNoInteractions(client);
    }

    @Test
    void fallsBackToRulesWhenOllamaFails() {
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        ChatClient client = mock(ChatClient.class, RETURNS_DEEP_STUBS);

        when(builder.build()).thenReturn(client);
        when(client.prompt()
                .system(SYSTEM_PROMPT)
                .user("Vire 250 vers le compte 204060-8")
                .call()
                .entity(IntentResult.class))
                .thenThrow(new RuntimeException("Ollama unavailable"));

        IntentResult result = new OllamaIntentDetectionService(
                builder, new RuleBasedIntentDetectionService())
                .detectIntent("Vire 250 vers le compte 204060-8");

        assertEquals(IntentType.TRANSFER, result.getIntent());
        assertEquals("204060-8", result.getParameters()
                .get("targetAccountNumber").asText());
    }

    @Test
    void generatesContextualReplyUsingRecentConversationAndVerifiedHelpContent() {
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        ChatClient client = mock(ChatClient.class, RETURNS_DEEP_STUBS);
        when(builder.build()).thenReturn(client);
        when(client.prompt()
                .system(org.mockito.ArgumentMatchers.anyString())
                .user(org.mockito.ArgumentMatchers.<String>argThat(prompt ->
                        prompt.contains("Current user message:\nHow do I follow it?")
                                && prompt.contains("ticket #24")
                                && prompt.contains("Verified help content")))
                .call()
                .content())
                .thenReturn("Open Help & Support and select ticket #24 to see its current status.");

        String reply = new OllamaIntentDetectionService(
                builder, new RuleBasedIntentDetectionService())
                .generateReply(
                        "How do I follow it?",
                        "BOT: Your request is open in ticket #24.",
                        "Tickets are listed in Help & Support.");

        assertEquals("Open Help & Support and select ticket #24 to see its current status.", reply);
    }
}

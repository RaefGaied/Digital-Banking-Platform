package com.fintech.banking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.domain.enums.SenderType;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.vo.IntentResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChatService {

    private static final UUID SYSTEM_SENDER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final MessageService messageService;
    private final IntentDetectionService intentDetectionService;
    private final BankingAgentService bankingAgentService;
    private final SupportTicketService supportTicketService;
    private final SessionService sessionService;

    public Message handleUserMessage(UUID sessionId, UUID userId, String content) {
        Session session = sessionService.getSessionById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        if (!session.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Session does not belong to user");
        }

        if (session.getStatus() == SessionStatus.CLOSED || session.isExpired()) {
            throw new IllegalStateException("Session is not active");
        }

        IntentResult intentResult = null;
        try {
            intentResult = intentDetectionService.detectIntent(content);
        } catch (Exception ex) {
            log.warn("Intent detection failed for session {}: {}", sessionId, ex.getMessage());
        }

        String intentName = intentResult != null && intentResult.getIntent() != null
                ? intentResult.getIntent().name()
                : null;
        JsonNode parameters = intentResult != null ? intentResult.getParameters() : null;

        Message userMessage = messageService.createMessage(
                sessionId,
                userId,
                SenderType.USER,
                content,
                false,
                intentName,
                parameters);

        BankingAgent agent = bankingAgentService.getAgentBySessionId(sessionId)
                .orElseGet(() -> bankingAgentService.createAgent(sessionId, userId));

        AgentDecision decision = bankingAgentService.determineDecision(agent, intentResult);
        Map<String, Object> trace = new HashMap<>();
        trace.put("intent", intentName);
        trace.put("confidence", intentResult != null ? intentResult.getConfidence() : null);
        trace.put("isSensitive", intentResult != null ? intentResult.getIsSensitive() : null);
        trace.put("decision", decision.name());
        trace.put("sessionId", sessionId.toString());
        trace.put("userId", userId.toString());
        if (parameters != null) {
            trace.put("parameters", parameters);
        }

        bankingAgentService.updateContext(agent.getId(), trace);
        bankingAgentService.updateDecision(agent.getId(), decision);

        String botContent;
        switch (decision) {
            case REQUEST_INFO:
                botContent = "Je ne suis pas sûr de votre demande. Pouvez-vous fournir plus de détails ?";
                break;
            case TRIGGER_BPMN:
                botContent = handleSensitiveChat(sessionId, userId, content, intentResult);
                break;
            case AUTO_EXECUTE:
            default:
                botContent = "Votre demande a été prise en charge. Je suis là si vous avez d'autres questions.";
                break;
        }

        messageService.createMessage(
                sessionId,
                SYSTEM_SENDER_ID,
                SenderType.BOT,
                botContent,
                false,
                null,
                null);

        return userMessage;
    }

    private String handleSensitiveChat(UUID sessionId, UUID userId, String content, IntentResult intentResult) {
        IntentType intent = intentResult != null ? intentResult.getIntent() : null;
        TicketType ticketType = mapIntentToTicketType(intent);
        String subject = buildSubject(intent);
        String description = "Chat support request: " + content + "\nIntent: " + (intent != null ? intent.name() : "UNKNOWN")
                + "\nConfidence: " + (intentResult != null ? intentResult.getConfidence() : "null");

        Map<String, Object> variables = new HashMap<>();
        variables.put("userId", userId.toString());
        variables.put("sessionId", sessionId.toString());
        variables.put("content", content);
        variables.put("intent", intent != null ? intent.name() : "UNKNOWN");
        if (intentResult != null && intentResult.getParameters() != null) {
            variables.put("parameters", intentResult.getParameters());
        }

        String processKey = determineProcessKey(intent);
        try {
            supportTicketService.createTicketWithWorkflow(
                    userId,
                    subject,
                    description,
                    ticketType,
                    userId,
                    processKey,
                    variables);
        } catch (Exception ex) {
            log.error("Failed to create workflow ticket for session {}: {}", sessionId, ex.getMessage());
            return "Votre demande est importante. Nous avons créé un ticket pour la support et nous vous recontacterons sous peu.";
        }

        return "Votre demande nécessite une vérification. Nous avons créé un ticket de support et notre équipe reviendra vers vous sous peu.";
    }

    private TicketType mapIntentToTicketType(IntentType intent) {
        if (intent == null) {
            return TicketType.GENERAL;
        }
        return switch (intent) {
            case FRAUD, STOLEN_CARD, CLAIM -> TicketType.FRAUD;
            case UPDATE_DATA -> TicketType.DATA_UPDATE;
            default -> TicketType.GENERAL;
        };
    }

    private String buildSubject(IntentType intent) {
        if (intent == null) {
            return "Demande de support client";
        }
        return switch (intent) {
            case FRAUD -> "Signalement de fraude";
            case STOLEN_CARD -> "Carte volée";
            case CLAIM -> "Réclamation client";
            case UPDATE_DATA -> "Demande de modification de données";
            default -> "Assistance bancaire";
        };
    }

    private String determineProcessKey(IntentType intent) {
        if (intent == null) {
            return "transferValidationProcess";
        }
        return switch (intent) {
            case FRAUD, STOLEN_CARD, CLAIM -> "fraudValidationProcess";
            case UPDATE_DATA -> "dataUpdateValidationProcess";
            default -> "transferValidationProcess";
        };
    }
}

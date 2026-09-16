package com.fintech.banking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.domain.enums.SenderType;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.service.AgentToolService;
import com.fintech.banking.service.AgentWorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChatService {

    private static final String SYSTEM_EMAIL = "system@finbank.local";

    private final MessageService messageService;
    private final IntentDetectionService intentDetectionService;
    private final BankingAgentService bankingAgentService;
    private final AgentWorkflowService agentWorkflowService;
    private final AgentToolService agentToolService;
    private final SupportTicketService supportTicketService;
    private final SessionService sessionService;
    private final UserRepository userRepository;
    private final KnowledgeBaseService knowledgeBaseService;
    private final RagKnowledgeService ragKnowledgeService;
    private final PythonAgentGateway pythonAgentGateway;

    public Message handleUserMessage(UUID sessionId, UUID userId, String content) {
        return handleUserMessage(sessionId, userId, content, null);
    }

    public Message handleUserMessage(UUID sessionId, UUID userId, String content, String authorizationHeader) {
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

        // Give the Python agent first chance for authenticated chat requests.
        Optional<String> pythonReply = pythonAgentGateway.ask(content, authorizationHeader);
        if (pythonReply.isPresent()) {
            UUID systemSenderId = userRepository.findByEmail(SYSTEM_EMAIL)
                    .map(com.fintech.banking.domain.entity.User::getId)
                    .orElseThrow(() -> new IllegalStateException("System assistant user not found"));

            messageService.createMessage(
                    sessionId,
                    systemSenderId,
                    SenderType.BOT,
                    pythonReply.get(),
                    false,
                    null,
                    null);
            return userMessage;
        }

        BankingAgent agent = bankingAgentService.getAgentBySessionId(sessionId)
                .orElseGet(() -> bankingAgentService.createAgent(sessionId, userId));

        AgentDecision decision = bankingAgentService.determineDecision(agent, intentResult);
        Map<String, Object> details = new HashMap<>();
        details.put("sessionId", sessionId.toString());
        details.put("userId", userId.toString());
        if (parameters != null) {
            details.put("parameters", parameters);
        }

        String knowledgeContext = ragKnowledgeService.buildContextSnippet(content);
        if (knowledgeContext.isBlank()) {
            knowledgeContext = knowledgeBaseService.buildContextSnippet(content);
        }
        if (!knowledgeContext.isBlank()) {
            details.put("knowledgeContext", knowledgeContext);
        }

        String recentContext = buildSessionContext(sessionId, content);
        if (!recentContext.isBlank()) {
            details.put("sessionContext", recentContext);
        }

        agentWorkflowService.recordAgentAction(agent.getId(), "process_user_message", intentResult, decision, details);

        String botContent;
        AgentDecision toolDecision = decision;

        if (bankingAgentService.hasPendingToolAction(agent)) {
            AgentToolService.AgentToolResult pendingResult = agentToolService.handlePendingToolConfirmation(agent, session, content, intentResult);
            if (pendingResult != null) {
                if (pendingResult.getDecisionOverride() != null) {
                    toolDecision = pendingResult.getDecisionOverride();
                    bankingAgentService.updateDecision(agent.getId(), toolDecision);
                }
                Map<String, Object> toolDetails = new HashMap<>(details);
                if (pendingResult.getDetails() != null) {
                    toolDetails.putAll(pendingResult.getDetails());
                }
                agentWorkflowService.recordAgentAction(agent.getId(), pendingResult.getAction(), intentResult, toolDecision, toolDetails);
                botContent = pendingResult.getBotMessage();
            } else {
                botContent = localized(content,
                        "I could not process your confirmation. Please try again by answering yes or no.",
                        "Je n'ai pas pu traiter votre confirmation. Veuillez réessayer en répondant par oui ou non.");
            }
        } else if (decision == AgentDecision.AUTO_EXECUTE) {
            AgentToolService.AgentToolResult toolResult = agentToolService.executeToolAction(agent, session, intentResult, content);
            if (toolResult != null) {
                if (toolResult.getDecisionOverride() != null) {
                    toolDecision = toolResult.getDecisionOverride();
                    bankingAgentService.updateDecision(agent.getId(), toolDecision);
                }
                if ((toolResult.isRequiresConfirmation() || "request_card_details".equals(toolResult.getAction()))
                    && toolResult.getArguments() != null) {
                    Map<String, Object> pendingFields = new HashMap<>();
                    pendingFields.put("pendingToolAction", toolResult.getAction());
                    pendingFields.put("pendingToolArguments", toolResult.getArguments());
                    bankingAgentService.updateContextFields(agent.getId(), pendingFields);
                }
                Map<String, Object> toolDetails = new HashMap<>(details);
                if (toolResult.getDetails() != null) {
                    toolDetails.putAll(toolResult.getDetails());
                }
                agentWorkflowService.recordAgentAction(agent.getId(), toolResult.getAction(), intentResult, toolDecision, toolDetails);
                botContent = toolResult.getBotMessage();
            } else {
                botContent = localized(content,
                        "Your request has been received. I am here if you have any other questions.",
                        "Votre demande a été prise en charge. Je suis là si vous avez d'autres questions.");
            }
        } else if (decision == AgentDecision.TRIGGER_BPMN) {
            botContent = handleSensitiveChat(sessionId, userId, content, intentResult);
        } else if (decision == AgentDecision.REQUEST_INFO && knowledgeContext.isBlank()) {
            botContent = pythonAgentGateway.ask(content, authorizationHeader)
                .orElse(localized(content,
                    "I am not sure what you mean. Could you provide more details?",
                    "Je ne suis pas sûr de votre demande. Pouvez-vous fournir plus de détails ?"));
        } else if (decision == AgentDecision.REQUEST_INFO) {
            String summarizedContext = summarizeKnowledgeContext(content, knowledgeContext);
            botContent = summarizedContext;
        } else {
            botContent = localized(content,
                    "I am not sure what you mean. Could you provide more details?",
                    "Je ne suis pas sûr de votre demande. Pouvez-vous fournir plus de détails ?");
        }

        UUID systemSenderId = userRepository.findByEmail(SYSTEM_EMAIL)
                .map(com.fintech.banking.domain.entity.User::getId)
                .orElseThrow(() -> new IllegalStateException("System assistant user not found"));

        messageService.createMessage(
                sessionId,
                systemSenderId,
                SenderType.BOT,
                botContent,
                false,
                null,
                null);

        return userMessage;
    }

    private String summarizeKnowledgeContext(String question, String knowledgeContext) {
        boolean english = isEnglish(question);
        String intro = english ? "Here is what you should know: " : "Voici ce qu'il faut savoir : ";
        String followUp = english ? " Could you provide more details?" : " Pouvez-vous préciser votre demande ?";
        if (knowledgeContext == null || knowledgeContext.isBlank()) {
            return english
                    ? "I am not sure what you mean. Could you provide more details?"
                    : "Je ne suis pas sûr de votre demande. Pouvez-vous fournir plus de détails ?";
        }

        List<String> answers = new ArrayList<>();
        for (String block : knowledgeContext.split("\\n\\s*\\n")) {
            String answer = Arrays.stream(block.split("\\n"))
                    .map(String::trim)
                    .filter(line -> line.startsWith("A:"))
                    .map(line -> line.substring(2).trim())
                    .findFirst()
                    .orElse("");
            if (!answer.isBlank() && isSameLanguage(answer, english)) {
                answers.add(answer);
            }
        }

        if (answers.isEmpty()) {
            answers.addAll(extractAnswers(knowledgeContext));
        }
        if (answers.isEmpty()) {
            return intro + knowledgeContext;
        }

        String primary = answers.get(0);
        if (answers.size() == 1) {
            return intro + primary;
        }

        String secondary = answers.size() > 1 ? answers.get(1) : "";
        return intro + primary + (secondary.isBlank() ? "" : " " + secondary) + followUp;
    }

    private List<String> extractAnswers(String knowledgeContext) {
        List<String> answers = new ArrayList<>();
        for (String block : knowledgeContext.split("\\n\\s*\\n")) {
            Arrays.stream(block.split("\\n"))
                    .map(String::trim)
                    .filter(line -> line.startsWith("A:"))
                    .map(line -> line.substring(2).trim())
                    .filter(answer -> !answer.isBlank())
                    .findFirst()
                    .ifPresent(answers::add);
        }
        return answers;
    }

    private boolean isSameLanguage(String text, boolean english) {
        return isEnglish(text) == english;
    }

    private boolean isEnglish(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String normalized = " " + text.toLowerCase(Locale.ROOT) + " ";
        long englishHints = Arrays.stream(new String[]{
                " how ", " what ", " where ", " card ", " blocked ", " never ", " contact ", " verify ", " secure "
        }).filter(normalized::contains).count();
        long frenchHints = Arrays.stream(new String[]{
                " comment ", " quelle ", " carte ", " bloquee ", " bloquée ", " contactez ", " vérifier ", " sécuriser "
        }).filter(normalized::contains).count();
        return englishHints > frenchHints;
    }

    private String buildSessionContext(UUID sessionId, String latestMessage) {
        try {
            var recentMessages = messageService.getSessionMessagesList(sessionId);
            StringBuilder context = new StringBuilder();
            int count = 0;
            for (var message : recentMessages) {
                if (message.getContent() == null || message.getContent().isBlank()) {
                    continue;
                }
                if (count >= 5) {
                    break;
                }
                context.append(message.getSenderType()).append(": ").append(message.getContent()).append("\n");
                count++;
            }
            if (latestMessage != null && !latestMessage.isBlank()) {
                context.append("latest:").append(latestMessage);
            }
            return context.toString().trim();
        } catch (Exception ex) {
            log.warn("Unable to build session context for {}", sessionId, ex);
            return "";
        }
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
            return localized(content,
                    "Your request is important. We created a support ticket and will contact you shortly.",
                    "Votre demande est importante. Nous avons créé un ticket de support et nous vous recontacterons sous peu.");
        }

        return localized(content,
                "Your request requires verification. We created a support ticket and our team will get back to you shortly.",
                "Votre demande nécessite une vérification. Nous avons créé un ticket de support et notre équipe reviendra vers vous sous peu.");
    }

    private String localized(String userMessage, String english, String french) {
        return isEnglish(userMessage) ? english : french;
    }

    private TicketType mapIntentToTicketType(IntentType intent) {
        if (intent == null) {
            return TicketType.GENERAL;
        }
        return switch (intent) {
            case FRAUD, STOLEN_CARD, CLAIM -> TicketType.FRAUD;
            case UPDATE_SENSITIVE_DATA -> TicketType.DATA_UPDATE;
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
            case UPDATE_SENSITIVE_DATA -> "Demande de modification de données";
            default -> "Assistance bancaire";
        };
    }

    private String determineProcessKey(IntentType intent) {
        if (intent == null) {
            return "transferValidationProcess";
        }
        return switch (intent) {
            case FRAUD, STOLEN_CARD, CLAIM -> "fraudValidationProcess";
            case UPDATE_SENSITIVE_DATA -> "dataUpdateValidationProcess";
            default -> "transferValidationProcess";
        };
    }
}

package com.fintech.banking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.domain.enums.SenderType;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.exception.AiProvidersUnavailableException;
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
import java.text.Normalizer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChatService {

    private static final String SYSTEM_EMAIL = "system@finbank.local";
    private static final int AGENT_CONTEXT_MESSAGE_LIMIT = 16;
    private static final int AGENT_CONTEXT_CHARACTER_LIMIT = 10000;
    private static final Pattern TICKET_REFERENCE_PATTERN = Pattern.compile(
            "\\bticket\\s*(?:de\\s+support\\s*)?(?:n[°o]\\s*)?#?\\s*(\\d+)\\b",
            Pattern.CASE_INSENSITIVE);

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

        if (!isAnyAiProviderAvailable()) {
            throw new AiProvidersUnavailableException();
        }

        String conversationContext = buildSessionContext(sessionId);
        IntentResult intentResult = null;
        try {
            intentResult = intentDetectionService.detectIntent(content, conversationContext);
        } catch (Exception ex) {
            log.warn("Intent detection failed for session {}: {}", sessionId, ex.getMessage());
        }

        boolean emailChangeHowTo = isEmailChangeHowToRequest(content);
        boolean emailUpdateRequest = isEmailUpdateRequest(content) && !emailChangeHowTo;
        if (emailUpdateRequest) {
            if (intentResult == null) {
                intentResult = new IntentResult();
            }
            intentResult.setIntent(IntentType.UPDATE_SENSITIVE_DATA);
            intentResult.setConfidence(1.0);
            intentResult.setMessage("deterministic-email-change-request");
            intentResult.setIsSensitive(true);
            intentResult.setDetectedLanguage(com.fintech.banking.util.LanguageDetector.detect(content));
            intentResult.setParameters(com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode());
        }

        String intentName = intentResult != null && intentResult.getIntent() != null
                ? intentResult.getIntent().name()
                : null;
        JsonNode parameters = intentResult != null ? intentResult.getParameters() : null;
        String detectedLang = intentResult != null && intentResult.getDetectedLanguage() != null
                ? intentResult.getDetectedLanguage()
                : com.fintech.banking.util.LanguageDetector.detect(content);

        if (isAccountPrivacyRequest(content)) {
            if (intentResult == null) {
                intentResult = new IntentResult();
            }
            intentResult.setIntent(com.fintech.banking.domain.enums.IntentType.ACCOUNT);
            intentResult.setConfidence(1.0);
            intentResult.setIsSensitive(false);
            intentName = com.fintech.banking.domain.enums.IntentType.ACCOUNT.name();
        }

        Message userMessage = messageService.createMessage(
                sessionId,
                userId,
                SenderType.USER,
                content,
                false,
                intentName,
                parameters,
                detectedLang,
                false,
                null);

        BankingAgent agent = bankingAgentService.getAgentBySessionId(sessionId)
                .orElseGet(() -> bankingAgentService.createAgent(sessionId, userId));

        AgentDecision decision = bankingAgentService.determineDecision(agent, intentResult);
        Map<String, Object> details = new HashMap<>();
        details.put("sessionId", sessionId.toString());
        details.put("userId", userId.toString());
        if (!conversationContext.isBlank()) {
            details.put("sessionContext", conversationContext);
        }
        if (parameters != null) {
            details.put("parameters", parameters);
        }

        String knowledgeContext = "";
        boolean usedRag = false;
        boolean ticketTrackingRequest = isTicketTrackingRequest(content);
        boolean newTicketRequest = isNewSupportTicketRequest(content);
        boolean newTicketDescription = isNewSupportTicketDescription(content, conversationContext);
        if (decision == AgentDecision.REQUEST_INFO && !ticketTrackingRequest
                && !newTicketRequest && !newTicketDescription) {
            // The local FAQ is synchronous and cheap. Only invoke the Ollama
            // embedding path when the local knowledge base has no answer.
            knowledgeContext = knowledgeBaseService.buildContextSnippet(content);
            if (knowledgeContext.isBlank()) {
                String ragContext = ragKnowledgeService.buildContextSnippet(content);
                usedRag = !ragContext.isBlank();
                knowledgeContext = usedRag ? ragContext : "";
            }
            if (!knowledgeContext.isBlank()) {
                details.put("knowledgeContext", knowledgeContext);
            }

        }

        agentWorkflowService.recordAgentAction(agent.getId(), "process_user_message", intentResult, decision, details);

        String botContent;
        AgentDecision toolDecision = decision;
        boolean botUsedRag = false;
        String botRagSource = null;

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
        } else if (emailChangeHowTo) {
            botContent = localized(content,
                    "After your email-change ticket is approved, open Profile > Complete email change. Enter your new email address and current password, then submit. Approval does not change the email automatically. After the update, you will be signed out and must log in with the new email. You do not need to open another ticket.",
                    "Après l’approbation de votre ticket de changement d’e-mail, ouvrez Profil > Compléter la modification de l’e-mail. Saisissez votre nouvelle adresse et votre mot de passe actuel, puis validez. L’approbation ne modifie pas automatiquement l’adresse. Une fois le changement effectué, vous serez déconnecté et devrez vous reconnecter avec la nouvelle adresse. Il n’est pas nécessaire d’ouvrir un autre ticket.");
        } else if (newTicketDescription) {
            botContent = decision == AgentDecision.TRIGGER_BPMN
                    ? handleSensitiveChat(sessionId, userId, agent.getId(), content, intentResult, true)
                    : createGeneralSupportTicket(sessionId, userId, agent.getId(), content, intentResult);
        } else if (newTicketRequest) {
            botContent = localized(content,
                    "Of course. To open a new ticket separate from your email request, describe the issue or request here. I will send it to the support team.",
                    "Bien sûr. Pour ouvrir un nouveau ticket, distinct de votre demande d’e-mail, décrivez ici le problème ou la demande. Je le transmettrai à l’équipe support.");
        } else if (ticketTrackingRequest) {
            botContent = buildTicketTrackingReply(userId, content, conversationContext);
        } else if (intentResult != null && intentResult.getIntent() == IntentType.SUPPORT) {
            botContent = generateContextualReply(
                    sessionId, userId, agent.getId(), content, conversationContext,
                    knowledgeContext, authorizationHeader, intentResult, decision);
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
                botContent = generateContextualReply(
                        sessionId, userId, agent.getId(), content, conversationContext,
                        knowledgeContext, authorizationHeader, intentResult, decision);
            }
        } else if (decision == AgentDecision.TRIGGER_BPMN) {
            botContent = handleSensitiveChat(sessionId, userId, agent.getId(), content, intentResult, false);
        } else if (decision == AgentDecision.REQUEST_INFO && knowledgeContext.isBlank()) {
            botContent = generateContextualReply(
                    sessionId, userId, agent.getId(), content, conversationContext,
                    knowledgeContext, authorizationHeader, intentResult, decision);
        } else if (decision == AgentDecision.REQUEST_INFO) {
            String generatedReply = generateContextualReply(
                    sessionId, userId, agent.getId(), content, conversationContext,
                    knowledgeContext, authorizationHeader, intentResult, decision);
            botContent = generatedReply != null && !generatedReply.isBlank()
                    ? generatedReply
                    : summarizeKnowledgeContext(content, knowledgeContext);
            botUsedRag = usedRag;
            botRagSource = extractSource(knowledgeContext);
        } else {
            botContent = generateContextualReply(
                    sessionId, userId, agent.getId(), content, conversationContext,
                    knowledgeContext, authorizationHeader, intentResult, decision);
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
                null,
                detectedLang,
                botUsedRag,
                botRagSource);

        return userMessage;
    }

    private boolean isAccountPrivacyRequest(String content) {
        if (content == null || content.isBlank()) {
            return false;
        }
        String normalized = content.toLowerCase(Locale.ROOT);
        boolean accountReference = normalized.matches(".*\\b(compte|comptes|account|accounts|num(?:é|e)ro|numeros?|numbers?)\\b.*");
        boolean thirdPartyOrEnumeration = normalized.matches(".*\\b(sarah|someone|somebody|another|other|others|tous|toutes|all|every|everyone|available|exist|existing)\\b.*");
        return accountReference && thirdPartyOrEnumeration;
    }

    /** Extracts the first "Source: X" line from a RAG/knowledge-base context snippet. */
    private String extractSource(String knowledgeContext) {
        if (knowledgeContext == null || knowledgeContext.isBlank()) {
            return null;
        }
        return Arrays.stream(knowledgeContext.split("\\n"))
                .map(String::trim)
                .filter(line -> line.startsWith("Source:"))
                .map(line -> line.substring("Source:".length()).trim())
                .findFirst()
                .orElse(null);
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

    private String buildSessionContext(UUID sessionId) {
        try {
            List<Message> recentMessages = messageService.getRecentSessionMessages(
                    sessionId,
                    AGENT_CONTEXT_MESSAGE_LIMIT);
            List<String> chronologicalTurns = new ArrayList<>();
            for (int index = recentMessages.size() - 1; index >= 0; index--) {
                Message message = recentMessages.get(index);
                if (Boolean.TRUE.equals(message.getIsInternal())
                        || message.getContent() == null
                        || message.getContent().isBlank()) {
                    continue;
                }
                String content = message.getContent().trim();
                if (content.length() > 2000) {
                    content = content.substring(content.length() - 2000);
                }
                chronologicalTurns.add(message.getSenderType().name() + ": " + content);
            }

            String context = String.join("\n", chronologicalTurns);
            if (context.length() > AGENT_CONTEXT_CHARACTER_LIMIT) {
                context = context.substring(context.length() - AGENT_CONTEXT_CHARACTER_LIMIT);
            }
            return context;
        } catch (RuntimeException ex) {
            log.warn("Unable to load recent conversation context for session {}", sessionId, ex);
            return "";
        }
    }

    private String handleSensitiveChat(
            UUID sessionId,
            UUID userId,
            UUID agentId,
            String content,
            IntentResult intentResult,
            boolean explicitlyRequestedNewTicket) {
        IntentType intent = intentResult != null ? intentResult.getIntent() : null;
        TicketType ticketType = mapIntentToTicketType(intent);
        boolean emailUpdate = intent == IntentType.UPDATE_SENSITIVE_DATA && isEmailUpdateRequest(content);
        if (emailUpdate && !explicitlyRequestedNewTicket) {
            var existingEmailTicket = supportTicketService.findLatestEmailChangeTicket(userId);
            if (existingEmailTicket.isPresent()) {
                var existingTicket = existingEmailTicket.get();
                if ("RESOLVED".equals(existingTicket.getStatus().name())) {
                    return localized(content,
                            "Your email verification ticket #" + existingTicket.getId() + " has been approved. Your login email has not changed yet. Open Profile > Complete email change, enter the new address, and confirm your current password. You do not need another ticket.",
                            "Votre demande de vérification de l’e-mail, ticket #" + existingTicket.getId() + ", a été approuvée. Votre adresse de connexion n’a pas encore changé. Ouvrez Profil > Compléter la modification de l’e-mail, saisissez la nouvelle adresse et confirmez votre mot de passe actuel. Vous n’avez pas besoin d’un nouveau ticket.");
                }
                if ("OPEN".equals(existingTicket.getStatus().name())
                        || "IN_PROGRESS".equals(existingTicket.getStatus().name())) {
                    return localized(content,
                            "Your email-change request is already being reviewed in ticket #" + existingTicket.getId() + ". Track it under Help & Support > Your recent tickets. You do not need to open another ticket.",
                            "Votre demande de modification d’e-mail est déjà en cours d’examen dans le ticket #" + existingTicket.getId() + ". Suivez-le dans Aide et support > Vos tickets récents. Vous n’avez pas besoin d’ouvrir un autre ticket.");
                }
            }
        }
        String subject = buildSubject(intent, emailUpdate);
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
        SupportTicket ticket;
        try {
            ticket = supportTicketService.createTicketWithWorkflow(
                    userId,
                    subject,
                    description,
                    ticketType,
                    userId,
                    processKey,
                    variables);
        } catch (Exception ex) {
            log.error("Failed to create workflow ticket for session {}: {}", sessionId, ex.getMessage());
            agentWorkflowService.recordAgentAction(
                    agentId,
                    "create_support_ticket_failed",
                    intentResult,
                    AgentDecision.TRIGGER_BPMN,
                    Map.of("ticketType", ticketType.name()));
            return localized(content,
                    "We could not open a verification ticket just now, so your request has not been submitted. Please retry or contact support from Help & Support.",
                    "Nous n'avons pas pu ouvrir le ticket de vérification pour le moment : votre demande n'a pas été transmise. Veuillez réessayer ou contacter l'assistance depuis Aide et support.");
        }

        agentWorkflowService.recordAgentAction(
                agentId,
                "create_support_ticket",
                intentResult,
                AgentDecision.TRIGGER_BPMN,
                Map.of(
                        "supportTicketId", ticket.getId(),
                        "ticketProcess", processKey,
                        "ticketType", ticketType.name()));

        if (emailUpdate) {
            return localized(content,
                    "Your email address has not been changed yet because this request requires identity verification. Support ticket #" + ticket.getId() + " is open. Track it under Help & Support > Your recent tickets. Never share your password or a one-time verification code in chat.",
                    "Votre adresse e-mail n'a pas encore été modifiée, car cette demande nécessite une vérification d'identité. Le ticket de support #" + ticket.getId() + " est ouvert. Suivez-le dans Aide et support > Vos tickets récents. Ne partagez jamais votre mot de passe ni un code de vérification à usage unique dans le chat.");
        }

        return localized(content,
                "Your request requires verification. Support ticket #" + ticket.getId() + " is open. Track it under Help & Support > Your recent tickets.",
                "Votre demande nécessite une vérification. Le ticket de support #" + ticket.getId() + " est ouvert. Suivez-le dans Aide et support > Vos tickets récents.");
    }

    private String localized(String userMessage, String english, String french) {
        return isEnglish(userMessage) ? english : french;
    }

    private String generateContextualReply(
            UUID sessionId,
            UUID userId,
            UUID agentId,
            String content,
            String conversationContext,
            String knowledgeContext,
            String authorizationHeader,
            IntentResult intentResult,
            AgentDecision decision) {
        String reply = intentDetectionService.generateReply(content, conversationContext, knowledgeContext);
        if (!isUsefulGeneratedReply(reply)) {
            reply = pythonAgentGateway.ask(content, conversationContext, authorizationHeader).orElse(null);
        }
        if (isUsefulGeneratedReply(reply)) {
            Map<String, Object> replyDetails = new HashMap<>();
            replyDetails.put("sessionId", sessionId.toString());
            replyDetails.put("userId", userId.toString());
            replyDetails.put("provider", "ollama_or_python_fallback");
            if (!knowledgeContext.isBlank()) {
                replyDetails.put("usedVerifiedHelpContext", true);
            }
            agentWorkflowService.recordAgentAction(
                    agentId, "generate_contextual_reply", intentResult, decision, replyDetails);
            return reply.trim();
        }

        log.warn("No useful conversational response was generated for session {}", sessionId);
        return localized(content,
                "I could not determine exactly what you need from that message. What are you trying to do, or which step is blocking you?",
                "Je n’ai pas compris précisément votre besoin. Que cherchez-vous à faire, ou à quelle étape êtes-vous bloqué ?");
    }

    private boolean isAnyAiProviderAvailable() {
        boolean ollamaAvailable;
        try {
            ollamaAvailable = intentDetectionService.isAvailable();
        } catch (RuntimeException ex) {
            log.warn("Could not verify Ollama availability: {}", ex.getMessage());
            ollamaAvailable = false;
        }
        if (ollamaAvailable) {
            return true;
        }

        try {
            return pythonAgentGateway.isAvailable();
        } catch (RuntimeException ex) {
            log.warn("Could not verify Python AI agent availability: {}", ex.getMessage());
            return false;
        }
    }

    private boolean isUsefulGeneratedReply(String reply) {
        if (reply == null || reply.isBlank()) {
            return false;
        }
        String normalized = reply.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N} ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        boolean genericEnglishMenu = normalized.startsWith("i can help with your")
                && normalized.contains("balance")
                && normalized.contains("transactions")
                && normalized.contains("transfers")
                && normalized.contains("support");
        boolean genericFrenchMenu = normalized.startsWith("je peux vous aider avec")
                && normalized.contains("compte")
                && normalized.contains("cartes")
                && normalized.contains("virements")
                && normalized.contains("ticket support");
        return !genericEnglishMenu && !genericFrenchMenu;
    }

    private boolean isTicketTrackingRequest(String content) {
        if (content == null || content.isBlank()) {
            return false;
        }
        String normalized = content.toLowerCase(Locale.ROOT);
        boolean ticketMentioned = normalized.contains("ticket") || normalized.contains("dossier");
        boolean asksForStatus = normalized.contains("suivre")
                || normalized.contains("suivi")
                || normalized.contains("statut")
                || normalized.contains("status")
                || normalized.contains("où en est")
                || normalized.contains("ou en est")
                || normalized.contains("track")
                || normalized.contains("progress");
        return ticketMentioned && asksForStatus;
    }

    private boolean isNewSupportTicketRequest(String content) {
        String normalized = normalizeForMatching(content);
        boolean mentionsTicket = normalized.matches("(?s).*\\b(ticket|dossier)\\b.*");
        boolean requestsCreation = normalized.matches(
                "(?s).*(creer|ouvrir|faire|create|open|raise|nouveau|nouvelle|new).*");
        return mentionsTicket && requestsCreation;
    }

    private boolean isNewSupportTicketDescription(String content, String conversationContext) {
        if (content == null || content.isBlank()) {
            return false;
        }
        if (isNewSupportTicketRequest(content) && content.trim().length() > 80) {
            return true;
        }
        if (conversationContext == null || conversationContext.isBlank()) {
            return false;
        }

        String latestUserMessage = null;
        String latestBotMessage = null;
        int latestUserLine = -1;
        int latestBotLine = -1;
        String[] turns = conversationContext.split("\\R");
        for (int index = 0; index < turns.length; index++) {
            if (turns[index].startsWith("USER: ")) {
                latestUserMessage = turns[index].substring("USER: ".length());
                latestUserLine = index;
            } else if (turns[index].startsWith("BOT: ")) {
                latestBotMessage = turns[index].substring("BOT: ".length());
                latestBotLine = index;
            }
        }
        return latestUserMessage != null
                && latestBotMessage != null
                && latestBotLine > latestUserLine
                && isNewSupportTicketRequest(latestUserMessage)
                && normalizeForMatching(latestBotMessage).contains("decrivez ici le probleme");
    }

    private String createGeneralSupportTicket(
            UUID sessionId,
            UUID userId,
            UUID agentId,
            String content,
            IntentResult intentResult) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("userId", userId.toString());
        variables.put("sessionId", sessionId.toString());
        variables.put("content", content);
        variables.put("intent", IntentType.SUPPORT.name());

        try {
            SupportTicket ticket = supportTicketService.createTicketWithWorkflow(
                    userId,
                    "Nouvelle demande de support",
                    "Demande de support créée depuis le chat : " + content,
                    TicketType.GENERAL,
                    userId,
                    null,
                    variables);
            agentWorkflowService.recordAgentAction(
                    agentId,
                    "create_general_support_ticket",
                    intentResult,
                    AgentDecision.REQUEST_INFO,
                    Map.of("supportTicketId", ticket.getId(), "ticketType", TicketType.GENERAL.name()));
            return localized(content,
                    "Your support ticket #" + ticket.getId()
                            + " has been created and sent to the support team. Status: open. You can follow it under Help & Support > Your recent tickets.",
                    "Votre ticket de support #" + ticket.getId()
                            + " a été créé et transmis à l’équipe support. Statut : ouvert. Vous pouvez le suivre dans Aide et support > Vos tickets récents.");
        } catch (RuntimeException ex) {
            log.error("Failed to create general support ticket for session {}", sessionId, ex);
            return localized(content,
                    "I could not create your support ticket just now. Your request has not been submitted; please try again from Help & Support.",
                    "Je n’ai pas pu créer votre ticket de support pour le moment. Votre demande n’a pas été transmise ; veuillez réessayer depuis Aide et support.");
        }
    }

    private String normalizeForMatching(String text) {
        return Normalizer.normalize(text == null ? "" : text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
    }

    private String buildTicketTrackingReply(UUID userId, String message, String conversationContext) {
        Matcher matcher = TICKET_REFERENCE_PATTERN.matcher(
                conversationContext == null ? "" : conversationContext);
        Long ticketId = null;
        while (matcher.find()) {
            try {
                ticketId = Long.parseLong(matcher.group(1));
            } catch (NumberFormatException ex) {
                log.debug("Ignoring out-of-range ticket reference in conversation context");
            }
        }

        SupportTicket ticket = ticketId == null
                ? null
                : supportTicketService.getTicketById(ticketId)
                        .filter(candidate -> userId.equals(candidate.getUserId()))
                        .orElse(null);
        if (ticket == null) {
            return localized(message,
                    "Open Help & Support > Your recent tickets, then select your ticket to see its status, date, and details.",
                    "Ouvrez Aide et support > Vos tickets récents, puis sélectionnez votre ticket pour consulter son statut, sa date et ses détails.");
        }

        String status = localized(message, englishTicketStatus(ticket.getStatus()), frenchTicketStatus(ticket.getStatus()));
        return localized(message,
                "Your ticket #" + ticket.getId() + " is currently " + status
                        + ". Open Help & Support > Your recent tickets and select it to see its date and details.",
                "Votre ticket #" + ticket.getId() + " est actuellement " + status
                        + ". Ouvrez Aide et support > Vos tickets récents et sélectionnez-le pour consulter sa date et ses détails.");
    }

    private String englishTicketStatus(TicketStatus status) {
        return switch (status) {
            case OPEN -> "open";
            case IN_PROGRESS -> "in progress";
            case RESOLVED -> "resolved";
            case CLOSED -> "closed";
        };
    }

    private String frenchTicketStatus(TicketStatus status) {
        return switch (status) {
            case OPEN -> "ouvert";
            case IN_PROGRESS -> "en cours";
            case RESOLVED -> "résolu";
            case CLOSED -> "clos";
        };
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

    private String buildSubject(IntentType intent, boolean emailUpdate) {
        if (emailUpdate) {
            return localized("modifier mon email",
                    "Email address change verification",
                    "Vérification de modification d'adresse e-mail");
        }
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

    private boolean isEmailUpdateRequest(String content) {
        if (content == null) {
            return false;
        }
        String normalized = normalizeForIntentMatching(content)
                .replace("chnager", "changer")
                .replace("chager", "changer");
        boolean mentionsEmail = normalized.matches("(?s).*\\b(email|e-mail|courriel|mail)\\b.*");
        boolean asksForChange = normalized.matches("(?s).*\\b(change|update|modify|modifier|modification|changer|changez|changement|mettre\\s+a\\s+jour|mise\\s+a\\s+jour)\\b.*");
        return mentionsEmail && asksForChange;
    }

    private boolean isEmailChangeHowToRequest(String content) {
        if (content == null) {
            return false;
        }
        String normalized = normalizeForIntentMatching(content);
        boolean mentionsEmail = normalized.matches("(?s).*\\b(email|e-mail|courriel|mail)\\b.*");
        boolean asksForInstructions = normalized.matches(
                "(?s).*(\\bcomment\\b|\\betape(s)?\\b|\\bexpliqu(er|e|es|ez)\\b|\\bfonctionne(r)?\\b|\\bou\\b|\\bapres\\b|\\bprocedure\\b|\\bhow\\b|\\bstep(s)?\\b|\\bexplain\\b|\\bwork(s)?\\b|\\bwhere\\b|\\bafter\\b).*");
        return mentionsEmail && asksForInstructions
                && normalized.matches("(?s).*(\\bchang(er|er|ement|e|ee)\\b|\\bmodifier\\b|\\bmodification\\b).*");
    }

    private String normalizeForIntentMatching(String content) {
        return java.text.Normalizer.normalize(content, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
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

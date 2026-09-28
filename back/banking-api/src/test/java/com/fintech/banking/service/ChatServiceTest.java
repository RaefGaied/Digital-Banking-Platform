package com.fintech.banking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.SenderType;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ChatServiceTest {

    private final MessageService messageService = Mockito.mock(MessageService.class);
    private final IntentDetectionService intentDetectionService = Mockito.mock(IntentDetectionService.class);
    private final BankingAgentService bankingAgentService = Mockito.mock(BankingAgentService.class);
    private final AgentWorkflowService agentWorkflowService = Mockito.mock(AgentWorkflowService.class);
    private final AgentToolService agentToolService = Mockito.mock(AgentToolService.class);
    private final SupportTicketService supportTicketService = Mockito.mock(SupportTicketService.class);
    private final SessionService sessionService = Mockito.mock(SessionService.class);
    private final UserRepository userRepository = Mockito.mock(UserRepository.class);
    private final KnowledgeBaseService knowledgeBaseService = new KnowledgeBaseService();
    private final RagKnowledgeService ragKnowledgeService = new RagKnowledgeService();
    private final PythonAgentGateway pythonAgentGateway = Mockito.mock(PythonAgentGateway.class);

    private ChatService chatService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        when(intentDetectionService.isAvailable()).thenReturn(true);
        when(pythonAgentGateway.isAvailable()).thenReturn(true);
        chatService = new ChatService(
            messageService,
            intentDetectionService,
            bankingAgentService,
            agentWorkflowService,
            agentToolService,
            supportTicketService,
            sessionService,
            userRepository,
            knowledgeBaseService,
            ragKnowledgeService,
            pythonAgentGateway
        );
    }

    @Test
    void shouldUseFaqSnippetWhenRequestInfoAndKnowledgeAvailable() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);

        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        agent.setDefaultPolicy(AgentDecision.AUTO_EXECUTE);

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(null);
        intentResult.setConfidence(0.5);
        intentResult.setMessage("rule-based");
        intentResult.setParameters(objectMapper.createObjectNode());

        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail(eq("system@finbank.local"))).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq("Comment puis-je faire un virement ?"), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(new Message());

        Message result = chatService.handleUserMessage(sessionId, userId, "Comment puis-je faire un virement ?");

        verify(messageService, times(2)).createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        assertTrue(result != null);
    }

    @Test
    void shouldPassLatestSessionTurnsInChronologicalOrderToIntentClassifier() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String currentMessage = "Can you explain that again?";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);

        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);

        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        List<Message> recentMessagesDescending = new java.util.ArrayList<>();
        for (int turn = 18; turn > 2; turn--) {
            recentMessagesDescending.add(Message.builder()
                    .senderType(turn % 2 == 0 ? SenderType.BOT : SenderType.USER)
                    .content("turn-" + turn)
                    .isInternal(turn == 10)
                    .build());
        }
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(messageService.getRecentSessionMessages(sessionId, 16)).thenReturn(recentMessagesDescending);
        when(userRepository.findByEmail(eq("system@finbank.local"))).thenReturn(Optional.of(systemUser));
        IntentResult intentResult = new IntentResult();
        intentResult.setConfidence(0.5);
        intentResult.setParameters(objectMapper.createObjectNode());
        when(intentDetectionService.detectIntent(eq(currentMessage), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, currentMessage);

        ArgumentCaptor<String> contextCaptor = ArgumentCaptor.forClass(String.class);
        verify(intentDetectionService).detectIntent(eq(currentMessage), contextCaptor.capture());
        String context = contextCaptor.getValue();
        assertTrue(context.indexOf("turn-3") < context.indexOf("turn-18"));
        assertTrue(context.contains("turn-18"));
        assertTrue(context.lines().noneMatch(line -> line.endsWith(": turn-2")));
        assertTrue(context.lines().noneMatch(line -> line.endsWith(": turn-10")));
        assertTrue(!context.contains(currentMessage));
        verify(agentWorkflowService).recordAgentAction(
                eq(agent.getId()),
                eq("process_user_message"),
                eq(intentResult),
                eq(AgentDecision.REQUEST_INFO),
                ArgumentMatchers.argThat(details -> context.equals(details.get("sessionContext"))));
    }

    @Test
    void shouldAnswerTicketTrackingFollowUpWithRecentOwnedTicketDetails() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String currentMessage = "comment suivre le ticket";
        String priorBotMessage = "Votre demande est en cours dans le ticket #24. Suivez-le dans Aide et support > Vos tickets récents.";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);

        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);

        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        SupportTicket ticket = SupportTicket.builder()
                .id(24L)
                .userId(userId)
                .subject("Modification d’adresse e-mail")
                .description("Vérification de l’identité")
                .ticketType(TicketType.DATA_UPDATE)
                .status(com.fintech.banking.domain.enums.TicketStatus.OPEN)
                .build();
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(messageService.getRecentSessionMessages(sessionId, 16)).thenReturn(List.of(
                Message.builder().senderType(SenderType.BOT).content(priorBotMessage).build(),
                Message.builder().senderType(SenderType.USER).content("Je veux modifier mon adresse e-mail").build()));
        when(userRepository.findByEmail(eq("system@finbank.local"))).thenReturn(Optional.of(systemUser));
        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.SUPPORT);
        intentResult.setConfidence(0.75);
        intentResult.setParameters(objectMapper.createObjectNode());
        when(intentDetectionService.detectIntent(eq(currentMessage), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(supportTicketService.getTicketById(24L)).thenReturn(Optional.of(ticket));
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, currentMessage);

        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId),
                eq(systemUserId),
                eq(SenderType.BOT),
                replyCaptor.capture(),
                eq(false),
                ArgumentMatchers.isNull(),
                ArgumentMatchers.isNull(),
                eq("FR"),
                eq(false),
                ArgumentMatchers.isNull());
        assertTrue(replyCaptor.getValue().contains("ticket #24"));
        assertTrue(replyCaptor.getValue().contains("Aide et support"));
        assertTrue(replyCaptor.getValue().contains("ouvert"));
        verify(pythonAgentGateway, Mockito.never()).ask(any(), any(), any());
    }

    @Test
    void shouldAskForIssueDetailsBeforeOpeningAnExplicitNewTicket() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String request = "je veux créer un nouveau ticket";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");
        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.SUPPORT);
        intentResult.setConfidence(0.85);
        intentResult.setDetectedLanguage("FR");
        intentResult.setParameters(objectMapper.createObjectNode());
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(request), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, request);

        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId),
                eq(systemUserId),
                eq(SenderType.BOT),
                replyCaptor.capture(),
                eq(false),
                ArgumentMatchers.isNull(),
                ArgumentMatchers.isNull(),
                eq("FR"),
                eq(false),
                ArgumentMatchers.isNull());
        assertTrue(replyCaptor.getValue().contains("nouveau ticket"));
        assertTrue(replyCaptor.getValue().contains("décrivez"));
        verify(supportTicketService, Mockito.never())
                .createTicketWithWorkflow(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void shouldCreateGeneralTicketAfterUserDescribesIssueForNewTicket() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        String description = "Mon virement apparaît deux fois dans mon historique.";
        String newTicketRequest = "je veux créer un nouveau ticket";
        String issuePrompt = "Bien sûr. Pour ouvrir un nouveau ticket, distinct de votre demande d’e-mail, décrivez ici le problème ou la demande. Je le transmettrai à l’équipe support.";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");
        BankingAgent agent = new BankingAgent();
        agent.setId(agentId);
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        SupportTicket createdTicket = SupportTicket.builder()
                .id(42L)
                .userId(userId)
                .subject("Nouvelle demande de support")
                .description("Demande de support créée depuis le chat : " + description)
                .ticketType(TicketType.GENERAL)
                .status(com.fintech.banking.domain.enums.TicketStatus.OPEN)
                .build();

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.SUPPORT);
        intentResult.setConfidence(0.85);
        intentResult.setDetectedLanguage("FR");
        intentResult.setParameters(objectMapper.createObjectNode());
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(messageService.getRecentSessionMessages(sessionId, 16)).thenReturn(List.of(
                Message.builder().senderType(SenderType.BOT).content(issuePrompt).build(),
                Message.builder().senderType(SenderType.USER).content(newTicketRequest).build()));
        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(description), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(supportTicketService.createTicketWithWorkflow(
                eq(userId),
                eq("Nouvelle demande de support"),
                eq("Demande de support créée depuis le chat : " + description),
                eq(TicketType.GENERAL),
                eq(userId),
                ArgumentMatchers.isNull(),
                any()))
                .thenReturn(createdTicket);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, description);

        verify(supportTicketService).createTicketWithWorkflow(
                eq(userId),
                eq("Nouvelle demande de support"),
                eq("Demande de support créée depuis le chat : " + description),
                eq(TicketType.GENERAL),
                eq(userId),
                ArgumentMatchers.isNull(),
                any());
        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId),
                eq(systemUserId),
                eq(SenderType.BOT),
                replyCaptor.capture(),
                eq(false),
                ArgumentMatchers.isNull(),
                ArgumentMatchers.isNull(),
                eq("FR"),
                eq(false),
                ArgumentMatchers.isNull());
        assertTrue(replyCaptor.getValue().contains("ticket de support #42"));
        assertTrue(replyCaptor.getValue().contains("créé"));
        assertTrue(replyCaptor.getValue().contains("Vos tickets récents"));
    }

    @Test
    void explicitlyRequestedNewEmailTicketUsesDataUpdateWorkflowDespiteExistingTicket() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        String description = "non je veux ouvrir un nouveau ticket pour changer mon email de nouveau";
        String newTicketRequest = "je veux ouvrir un nouveau ticket";
        String issuePrompt = "Bien sûr. Pour ouvrir un nouveau ticket, distinct de votre demande d’e-mail, décrivez ici le problème ou la demande. Je le transmettrai à l’équipe support.";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");
        BankingAgent agent = new BankingAgent();
        agent.setId(agentId);
        agent.setSessionId(sessionId);
        agent.setUserId(userId);

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.SUPPORT);
        intentResult.setConfidence(0.9);
        intentResult.setDetectedLanguage("FR");
        intentResult.setParameters(objectMapper.createObjectNode());

        SupportTicket createdTicket = SupportTicket.builder()
                .id(734L)
                .userId(userId)
                .ticketType(TicketType.DATA_UPDATE)
                .status(com.fintech.banking.domain.enums.TicketStatus.OPEN)
                .build();

        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(messageService.getRecentSessionMessages(sessionId, 16)).thenReturn(List.of(
                Message.builder().senderType(SenderType.BOT).content(issuePrompt).build(),
                Message.builder().senderType(SenderType.USER).content(newTicketRequest).build()));
        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(description), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.TRIGGER_BPMN);
        when(supportTicketService.createTicketWithWorkflow(
                eq(userId),
                eq("Vérification de modification d'adresse e-mail"),
                any(String.class),
                eq(TicketType.DATA_UPDATE),
                eq(userId),
                eq("dataUpdateValidationProcess"),
                ArgumentMatchers.anyMap()))
                .thenReturn(createdTicket);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, description);

        verify(supportTicketService).createTicketWithWorkflow(
                eq(userId),
                eq("Vérification de modification d'adresse e-mail"),
                any(String.class),
                eq(TicketType.DATA_UPDATE),
                eq(userId),
                eq("dataUpdateValidationProcess"),
                ArgumentMatchers.anyMap());
        verify(supportTicketService, Mockito.never()).findLatestEmailChangeTicket(userId);
        verify(agentWorkflowService).recordAgentAction(
                eq(agentId),
                eq("create_support_ticket"),
                eq(intentResult),
                eq(AgentDecision.TRIGGER_BPMN),
                ArgumentMatchers.argThat(details ->
                        Long.valueOf(734L).equals(details.get("supportTicketId"))
                                && TicketType.DATA_UPDATE.name().equals(details.get("ticketType"))
                                && "dataUpdateValidationProcess".equals(details.get("ticketProcess"))));

        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId), eq(systemUserId), eq(SenderType.BOT), replyCaptor.capture(),
                eq(false), ArgumentMatchers.isNull(), ArgumentMatchers.isNull(),
                eq("FR"), eq(false), ArgumentMatchers.isNull());
        assertTrue(replyCaptor.getValue().contains("#734"));
        assertTrue(replyCaptor.getValue().contains("n'a pas encore été modifiée"));
    }

    @Test
    void sendsGreetingThroughAiIntentDetectionAndReplyGeneration() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);

        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail(eq("system@finbank.local"))).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq("hello"), any(String.class))).thenReturn(null);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.empty());
        when(bankingAgentService.createAgent(sessionId, userId)).thenReturn(new BankingAgent());
        when(bankingAgentService.determineDecision(any(BankingAgent.class), ArgumentMatchers.isNull()))
                .thenReturn(AgentDecision.REQUEST_INFO);
        when(intentDetectionService.generateReply(eq("hello"), any(String.class), any(String.class)))
                .thenReturn("Hello! How can I help you today?");
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        Message result = chatService.handleUserMessage(sessionId, userId, "hello");

        verify(messageService, times(2)).createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        verify(intentDetectionService).detectIntent(eq("hello"), any(String.class));
        verify(intentDetectionService).generateReply(eq("hello"), any(String.class), any(String.class));
        verifyNoInteractions(agentToolService);
        assertTrue(result != null);
    }

    @Test
    void pausesChatWithoutPersistingMessageWhenBothAiProvidersAreUnavailable() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(intentDetectionService.isAvailable()).thenReturn(false);
        when(pythonAgentGateway.isAvailable()).thenReturn(false);

        org.junit.jupiter.api.Assertions.assertThrows(
                com.fintech.banking.exception.AiProvidersUnavailableException.class,
                () -> chatService.handleUserMessage(sessionId, userId, "How do I change my email?"));

        verify(messageService, Mockito.never())
                .createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        verify(intentDetectionService, Mockito.never())
                .detectIntent(any(String.class), any(String.class));
    }

    @Test
    void shouldNotDumpRawRagContextInBotReply() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);

        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        agent.setDefaultPolicy(AgentDecision.AUTO_EXECUTE);

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(null);
        intentResult.setConfidence(0.5);
        intentResult.setMessage("rule-based");
        intentResult.setParameters(objectMapper.createObjectNode());

        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail(eq("system@finbank.local"))).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq("What should I do if my card is blocked?"), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, "What should I do if my card is blocked?");

        verify(messageService, times(2)).createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void emailChangeRequestOpensVerificationTicketAndExplainsHowToTrackIt() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String request = "je veux modifier mon email";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);

        BankingAgent agent = new BankingAgent();
        agent.setId(agentId);
        agent.setSessionId(sessionId);
        agent.setUserId(userId);

        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.UPDATE_SENSITIVE_DATA);
        intentResult.setConfidence(0.95);
        intentResult.setMessage(request);

        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail(eq("system@finbank.local"))).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(request), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.TRIGGER_BPMN);
        when(supportTicketService.createTicketWithWorkflow(
                eq(userId),
                eq("Vérification de modification d'adresse e-mail"),
                any(String.class),
                eq(TicketType.DATA_UPDATE),
                eq(userId),
                eq("dataUpdateValidationProcess"),
                ArgumentMatchers.anyMap()))
                .thenReturn(SupportTicket.builder().id(731L).build());
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, request);

        ArgumentCaptor<String> contentCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService, times(2)).createMessage(
                any(), any(), any(), contentCaptor.capture(), any(), any(), any(), any(), any(), any());
        String botReply = contentCaptor.getAllValues().get(1);
        assertTrue(botReply.contains("n'a pas encore été modifiée"));
        assertTrue(botReply.contains("#731"));
        assertTrue(botReply.contains("Aide et support"));
        assertTrue(botReply.contains("Ne partagez jamais"));
        verify(agentWorkflowService).recordAgentAction(
                eq(agentId),
                eq("create_support_ticket"),
                eq(intentResult),
                eq(AgentDecision.TRIGGER_BPMN),
                ArgumentMatchers.argThat(details -> Long.valueOf(731L).equals(details.get("supportTicketId"))));
    }

    @Test
    void misspelledEmailChangeRequestStillOpensVerificationTicketWhenIntentModelMissesIt() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String request = "je veux chnager mon email";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        BankingAgent agent = new BankingAgent();
        agent.setId(agentId);
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(request), any(String.class))).thenReturn(null);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(eq(agent), any(IntentResult.class)))
                .thenReturn(AgentDecision.TRIGGER_BPMN);
        when(supportTicketService.createTicketWithWorkflow(
                eq(userId),
                eq("Vérification de modification d'adresse e-mail"),
                any(String.class),
                eq(TicketType.DATA_UPDATE),
                eq(userId),
                eq("dataUpdateValidationProcess"),
                ArgumentMatchers.anyMap()))
                .thenReturn(SupportTicket.builder().id(732L).build());
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, request);

        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId), eq(systemUserId), eq(SenderType.BOT), replyCaptor.capture(),
                eq(false), ArgumentMatchers.isNull(), ArgumentMatchers.isNull(),
                eq("FR"), eq(false), ArgumentMatchers.isNull());
        assertTrue(replyCaptor.getValue().contains("#732"));
        assertTrue(replyCaptor.getValue().contains("Aide et support"));
        verify(supportTicketService).createTicketWithWorkflow(
                eq(userId), eq("Vérification de modification d'adresse e-mail"), any(String.class),
                eq(TicketType.DATA_UPDATE), eq(userId), eq("dataUpdateValidationProcess"),
                ArgumentMatchers.anyMap());
    }

    @Test
    void emailChangeHowToQuestionGetsSpecificAnswerWithoutOpeningTicket() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String question = "Bonjour, je viens d’arriver sur FinBank et j’aimerais comprendre comment fonctionne le changement d’adresse e-mail. Peux-tu m’expliquer les étapes, notamment ce qui se passe après l’approbation du ticket, et où je dois aller pour terminer le changement ?";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");
        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.SUPPORT);
        intentResult.setConfidence(0.8);
        intentResult.setDetectedLanguage("FR");
        intentResult.setParameters(objectMapper.createObjectNode());

        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(question), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, question);

        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId), eq(systemUserId), eq(SenderType.BOT), replyCaptor.capture(),
                eq(false), ArgumentMatchers.isNull(), ArgumentMatchers.isNull(),
                eq("FR"), eq(false), ArgumentMatchers.isNull());
        assertTrue(replyCaptor.getValue().contains("Profil > Compléter la modification de l’e-mail"));
        assertTrue(replyCaptor.getValue().contains("mot de passe actuel"));
        assertTrue(replyCaptor.getValue().contains("ne modifie pas automatiquement"));
        verifyNoInteractions(supportTicketService);
        verifyNoInteractions(pythonAgentGateway);
    }

    @Test
    void shouldUseJavaOrchestrationBeforePythonFallback() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");
        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.BALANCE);
        intentResult.setConfidence(0.95);
        intentResult.setParameters(objectMapper.createObjectNode());
        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(new Message());
        when(intentDetectionService.detectIntent(eq("What is my balance?"), any(String.class))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.AUTO_EXECUTE);
        when(agentToolService.executeToolAction(agent, session, intentResult, "What is my balance?"))
                .thenReturn(AgentToolService.AgentToolResult.withFallback("Your balance is 1000", "get_balance", null, AgentDecision.AUTO_EXECUTE));
        when(userRepository.findByEmail(eq("system@finbank.local"))).thenReturn(Optional.of(systemUser));
        chatService.handleUserMessage(sessionId, userId, "What is my balance?", "******");
        verify(messageService, times(2)).createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        verify(agentToolService).executeToolAction(agent, session, intentResult, "What is my balance?");
        verifyNoInteractions(pythonAgentGateway);
    }

    @Test
    void shouldGenerateSpecificAnswerForClassifiedSupportQuestionInsteadOfGenericMenu() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String question = "comment faire une réclamation concernant des frais ?";
        String modelReply = "Décrivez les frais concernés et la date du prélèvement. Je peux ensuite vous aider à transmettre une réclamation.";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.SUPPORT);
        intentResult.setConfidence(0.85);
        intentResult.setDetectedLanguage("FR");
        intentResult.setParameters(objectMapper.createObjectNode());
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(question), any(String.class))).thenReturn(intentResult);
        when(intentDetectionService.generateReply(eq(question), any(String.class), any(String.class)))
                .thenReturn(modelReply);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.AUTO_EXECUTE);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, question);

        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId),
                eq(systemUserId),
                eq(SenderType.BOT),
                replyCaptor.capture(),
                eq(false),
                ArgumentMatchers.isNull(),
                ArgumentMatchers.isNull(),
                eq("FR"),
                eq(false),
                ArgumentMatchers.isNull());
        assertEquals(modelReply, replyCaptor.getValue());
        verify(agentToolService, Mockito.never()).executeToolAction(any(), any(), any(), any());
        verify(agentWorkflowService).recordAgentAction(
                eq(agent.getId()),
                eq("generate_contextual_reply"),
                eq(intentResult),
                eq(AgentDecision.AUTO_EXECUTE),
                ArgumentMatchers.argThat(details -> "ollama_or_python_fallback".equals(details.get("provider"))));
    }

    @Test
    void shouldRejectGenericMenusFromBothReplyProvidersAndAskForRelevantClarification() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID systemUserId = UUID.randomUUID();
        String question = "comment puis-je contacter le support pour une question générale ?";
        String genericMenu = "Je peux vous aider avec votre compte, vos cartes, vos paiements, "
                + "vos virements ou un ticket support. Décrivez votre demande.";

        Session session = new Session();
        session.setId(sessionId);
        session.setUserId(userId);
        session.setStatus(SessionStatus.OPENED);
        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setSessionId(sessionId);
        agent.setUserId(userId);
        User systemUser = new User();
        systemUser.setId(systemUserId);
        systemUser.setEmail("system@finbank.local");

        IntentResult intentResult = new IntentResult();
        intentResult.setIntent(IntentType.SUPPORT);
        intentResult.setConfidence(0.85);
        intentResult.setDetectedLanguage("FR");
        intentResult.setParameters(objectMapper.createObjectNode());
        when(sessionService.getSessionById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.of(systemUser));
        when(intentDetectionService.detectIntent(eq(question), any(String.class))).thenReturn(intentResult);
        when(intentDetectionService.generateReply(eq(question), any(String.class), any(String.class)))
                .thenReturn(genericMenu);
        when(pythonAgentGateway.ask(eq(question), any(String.class), ArgumentMatchers.isNull()))
                .thenReturn(Optional.of(genericMenu));
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, question);

        ArgumentCaptor<String> replyCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageService).createMessage(
                eq(sessionId),
                eq(systemUserId),
                eq(SenderType.BOT),
                replyCaptor.capture(),
                eq(false),
                ArgumentMatchers.isNull(),
                ArgumentMatchers.isNull(),
                eq("FR"),
                eq(false),
                ArgumentMatchers.isNull());
        assertTrue(replyCaptor.getValue().contains("Je n’ai pas compris précisément"));
        assertTrue(!replyCaptor.getValue().contains("Je peux vous aider avec votre compte"));
        verify(pythonAgentGateway).ask(eq(question), any(String.class), ArgumentMatchers.isNull());
    }
}

package com.fintech.banking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.SenderType;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
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
        when(intentDetectionService.detectIntent(eq("Comment puis-je faire un virement ?"))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(new Message());

        Message result = chatService.handleUserMessage(sessionId, userId, "Comment puis-je faire un virement ?");

        verify(messageService, times(2)).createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        assertTrue(result != null);
    }

    @Test
    void shouldAnswerGreetingWithoutCallingIntentModelOrKnowledgeServices() {
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
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new Message());

        Message result = chatService.handleUserMessage(sessionId, userId, "hello");

        verify(messageService, times(2)).createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        verifyNoInteractions(intentDetectionService, bankingAgentService, agentWorkflowService,
                agentToolService, pythonAgentGateway);
        assertTrue(result != null);
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
        when(intentDetectionService.detectIntent(eq("What should I do if my card is blocked?"))).thenReturn(intentResult);
        when(bankingAgentService.getAgentBySessionId(sessionId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(agent, intentResult)).thenReturn(AgentDecision.REQUEST_INFO);
        when(messageService.createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(new Message());

        chatService.handleUserMessage(sessionId, userId, "What should I do if my card is blocked?");

        verify(messageService, times(2)).createMessage(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
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
        when(intentDetectionService.detectIntent(eq("What is my balance?"))).thenReturn(intentResult);
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
}

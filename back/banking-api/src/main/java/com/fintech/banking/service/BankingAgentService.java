package com.fintech.banking.service;

import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.repository.BankingAgentRepository;
import com.fintech.banking.repository.SessionRepository;
import com.fintech.banking.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BankingAgentService {

    private final BankingAgentRepository bankingAgentRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * Creates a new banking agent for a session
     */
    @Transactional
    public BankingAgent createAgent(UUID sessionId, UUID userId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));

        userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!session.getUserId().equals(userId)) {
            throw new RuntimeException("Session does not belong to user");
        }

        Optional<BankingAgent> existingAgent = bankingAgentRepository.findBySessionIdAndUserId(sessionId, userId);
        if (existingAgent.isPresent()) {
            return existingAgent.get();
        }

        BankingAgent agent = BankingAgent.builder()
            .sessionId(sessionId)
            .userId(userId)
            .defaultPolicy(AgentDecision.AUTO_EXECUTE)
            .build();

        agent = bankingAgentRepository.save(agent);
        session.setAgentId(agent.getId());
        sessionRepository.save(session);
        log.info("Banking agent created for session: {}", sessionId);
        return agent;
    }

    public List<BankingAgent> getAgentsByUserId(UUID userId) {
        return bankingAgentRepository.findByUserId(userId);
    }

    public Optional<BankingAgent> getAgentByIdAndUserId(UUID agentId, UUID userId) {
        return bankingAgentRepository.findById(agentId)
            .filter(agent -> agent.getUserId().equals(userId));
    }

    /**
     * Gets agent by session ID
     */
    public Optional<BankingAgent> getAgentBySessionId(UUID sessionId) {
        return bankingAgentRepository.findBySessionId(sessionId);
    }

    /**
     * Gets agent by ID
     */
    public Optional<BankingAgent> getAgentById(UUID agentId) {
        return bankingAgentRepository.findById(agentId);
    }

    /**
     * Updates agent context (conversation state, user preferences, etc.)
     */
    @Transactional
    public BankingAgent updateContext(UUID agentId, JsonNode context) {
        BankingAgent agent = bankingAgentRepository.findById(agentId)
            .orElseThrow(() -> new RuntimeException("Agent not found"));

        agent.setContext(context);
        return bankingAgentRepository.save(agent);
    }

    /**
     * Updates agent context as Java object (will be serialized to JSON)
     */
    @Transactional
    public BankingAgent updateContext(UUID agentId, Object contextObject) {
        JsonNode context = objectMapper.valueToTree(contextObject);
        return updateContext(agentId, context);
    }

    /**
     * Records the last transaction the agent processed
     */
    @Transactional
    public BankingAgent recordLastTransaction(UUID agentId, UUID transactionId) {
        BankingAgent agent = bankingAgentRepository.findById(agentId)
            .orElseThrow(() -> new RuntimeException("Agent not found"));

        agent.setLastTransactionId(transactionId);
        return bankingAgentRepository.save(agent);
    }

    /**
     * Updates agent decision
     */
    @Transactional
    public BankingAgent updateDecision(UUID agentId, AgentDecision decision) {
        BankingAgent agent = bankingAgentRepository.findById(agentId)
            .orElseThrow(() -> new RuntimeException("Agent not found"));

        agent.setDecision(decision);
        return bankingAgentRepository.save(agent);
    }

    /**
     * Sets the default policy for the agent
     */
    @Transactional
    public BankingAgent setDefaultPolicy(UUID agentId, AgentDecision policy) {
        BankingAgent agent = bankingAgentRepository.findById(agentId)
            .orElseThrow(() -> new RuntimeException("Agent not found"));

        agent.setDefaultPolicy(policy);
        return bankingAgentRepository.save(agent);
    }

    /**
     * Determines the best decision based on intent result and policies
     * Business Rules:
     * - If confidence < 0.7 → REQUEST_INFO
     * - If high-risk intent or amount → TRIGGER_BPMN
     * - Otherwise → AUTO_EXECUTE or fall back to default policy
     */
    public AgentDecision determineDecision(BankingAgent agent, IntentResult intentResult) {
        if (intentResult == null) {
            return agent.getDefaultPolicy() != null ? agent.getDefaultPolicy() : AgentDecision.REQUEST_INFO;
        }

        // Check confidence level
        if (intentResult.getConfidence() == null || intentResult.getConfidence() < 0.7) {
            return AgentDecision.REQUEST_INFO;
        }

        // Check if intent is sensitive
        if (intentResult.getIsSensitive() != null && intentResult.getIsSensitive()) {
            return AgentDecision.TRIGGER_BPMN;
        }

        return AgentDecision.AUTO_EXECUTE;
    }

    /**
     * Extracts context information from agent for retrieval
     */
    public <T> T getContextAs(UUID agentId, Class<T> contextClass) {
        BankingAgent agent = bankingAgentRepository.findById(agentId)
            .orElseThrow(() -> new RuntimeException("Agent not found"));

        if (agent.getContext() == null) {
            return null;
        }

        return objectMapper.convertValue(agent.getContext(), contextClass);
    }

    /**
     * Checks if agent can proceed with operation based on policy
     */
    public boolean canProceedWithDecision(BankingAgent agent, AgentDecision requiredDecision) {
        AgentDecision actualDecision = agent.getDecision() != null ? agent.getDecision() : agent.getDefaultPolicy();
        return actualDecision == requiredDecision || actualDecision == AgentDecision.AUTO_EXECUTE;
    }

    /**
     * Logs agent interaction for audit
     */
    @Transactional
    public void logInteraction(UUID agentId, String action, JsonNode details) {
        BankingAgent agent = bankingAgentRepository.findById(agentId)
            .orElseThrow(() -> new RuntimeException("Agent not found"));

        // Could store in interaction history or audit log
        log.info("Agent interaction logged - Agent: {}, Action: {}", agentId, action);
    }
}

package com.fintech.banking.mcp;

import com.fintech.banking.dto.response.AccountResponse;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.service.AccountService;
import com.fintech.banking.service.BankingAgentService;
import com.fintech.banking.service.FlowableService;
import com.fintech.banking.service.FlowableTaskCompletionService;
import com.fintech.banking.service.KnowledgeBaseService;
import com.fintech.banking.service.TransactionService;
import com.fintech.banking.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flowable.task.api.Task;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDateTime;

@Component
public class BankingMcpTools {

    private final AccountService accountService;
    private final TransactionService transactionService;
    private final KnowledgeBaseService knowledgeBaseService;
    private final BankingAgentService bankingAgentService;
    private final FlowableService flowableService;
    private final FlowableTaskCompletionService flowableTaskCompletionService;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    public BankingMcpTools(AccountService accountService,
                           TransactionService transactionService,
                           KnowledgeBaseService knowledgeBaseService,
                           BankingAgentService bankingAgentService,
                           FlowableService flowableService,
                           FlowableTaskCompletionService flowableTaskCompletionService,
                           ObjectMapper objectMapper,
                           UserRepository userRepository) {
        this.accountService = accountService;
        this.transactionService = transactionService;
        this.knowledgeBaseService = knowledgeBaseService;
        this.bankingAgentService = bankingAgentService;
        this.flowableService = flowableService;
        this.flowableTaskCompletionService = flowableTaskCompletionService;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
    }

    @Tool(
            name = "get_my_account",
            description = "Returns only the authenticated user's own account details. Never use this to find another customer's account.")
    public AccountResponse getMyAccount() {
        return accountService.getMyAccount(authenticatedEmail());
    }

    @Tool(
            name = "get_my_transaction_history",
            description = "Returns the authenticated user's recent transaction history.")
    public List<TransactionResponse> getMyTransactionHistory() {
        return transactionService.getHistory(authenticatedEmail());
    }

    @Tool(
            name = "search_banking_knowledge",
            description = "Searches the banking FAQ knowledge base for informational questions. It cannot execute transactions.")
    public List<String> searchBankingKnowledge(
            @ToolParam(description = "The user's banking question", required = true) String query) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Query must not be blank");
        }
        return knowledgeBaseService.search(query.trim());
    }

    @Tool(
            name = "prepare_transfer",
            description = "Validates transfer details and returns a pending confirmation plan. It never debits an account or executes a transfer.")
    public Map<String, Object> prepareTransfer(
            @ToolParam(description = "Positive transfer amount", required = true) BigDecimal amount,
            @ToolParam(description = "Destination account number explicitly provided by the user", required = true) String destinationAccount) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Transfer amount must be positive");
        }
        if (destinationAccount == null || destinationAccount.isBlank()) {
            throw new IllegalArgumentException("Destination account is required");
        }
        return Map.of(
                "status", "PENDING_CONFIRMATION",
                "amount", amount,
                "destinationAccount", destinationAccount.trim(),
                "message", "Ask the authenticated user for explicit confirmation before calling the transfer REST workflow.");
    }

    @Tool(name = "create_agent", description = "Create or return the banking agent linked to an owned session.")
    public BankingAgent createAgent(
            @ToolParam(description = "Session identifier", required = true) String sessionId) {
        return bankingAgentService.createAgent(UUID.fromString(sessionId), authenticatedUserId());
    }

    @Tool(name = "get_agent_by_session", description = "Fetch the banking agent for an owned session.")
    public BankingAgent getAgentBySession(
            @ToolParam(description = "Session identifier", required = true) String sessionId) {
        BankingAgent agent = bankingAgentService.getAgentBySessionId(UUID.fromString(sessionId))
                .orElseThrow(() -> new IllegalArgumentException("Agent not found"));
        requireOwner(agent);
        return agent;
    }

    @Tool(name = "get_agent", description = "Fetch an owned banking agent.")
    public BankingAgent getAgent(
            @ToolParam(description = "Agent identifier", required = true) String agentId) {
        return ownedAgent(agentId);
    }

    @Tool(name = "update_agent_context", description = "Persist context for an owned banking agent.")
    public BankingAgent updateAgentContext(
            @ToolParam(description = "Agent identifier", required = true) String agentId,
            @ToolParam(description = "JSON object containing contextual fields", required = true) String contextJson) {
        ownedAgent(agentId);
        try {
            return bankingAgentService.updateContext(UUID.fromString(agentId), objectMapper.readTree(contextJson));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Context must be valid JSON", ex);
        }
    }

    @Tool(name = "update_agent_decision", description = "Store a decision for an owned banking agent.")
    public BankingAgent updateAgentDecision(
            @ToolParam(description = "Agent identifier", required = true) String agentId,
            @ToolParam(description = "Decision name", required = true) String decision) {
        ownedAgent(agentId);
        return bankingAgentService.updateDecision(UUID.fromString(agentId),
                AgentDecision.valueOf(decision.toUpperCase()));
    }

    @Tool(name = "record_agent_transaction", description = "Link a transaction to an owned banking agent.")
    public BankingAgent recordAgentTransaction(
            @ToolParam(description = "Agent identifier", required = true) String agentId,
            @ToolParam(description = "Transaction identifier", required = true) String transactionId) {
        ownedAgent(agentId);
        return bankingAgentService.recordLastTransaction(UUID.fromString(agentId), UUID.fromString(transactionId));
    }

    @Tool(name = "determine_agent_decision", description = "Apply backend agent policy rules to an owned agent.")
    public Map<String, Object> determineAgentDecision(
            @ToolParam(description = "Agent identifier", required = true) String agentId,
            @ToolParam(description = "Intent name", required = true) String intent,
            @ToolParam(description = "Confidence from 0 to 1", required = true) Double confidence,
            @ToolParam(description = "Whether the request is sensitive", required = true) Boolean sensitive) {
        BankingAgent agent = ownedAgent(agentId);
        IntentResult result = new IntentResult();
        result.setIntent(IntentType.valueOf(intent.toUpperCase()));
        result.setConfidence(confidence);
        result.setIsSensitive(Boolean.TRUE.equals(sensitive));
        AgentDecision decision = bankingAgentService.determineDecision(agent, result);
        bankingAgentService.updateDecision(agent.getId(), decision);
        BigDecimal threshold = BigDecimal.valueOf(5000);
        BigDecimal amount = result.getParameters() == null
                ? null
                : result.getParameters().path("amount").decimalValue();
        String reason = decision == AgentDecision.REQUEST_INFO
                ? "LOW_CONFIDENCE"
                : decision == AgentDecision.TRIGGER_BPMN
                ? (amount != null && amount.compareTo(threshold) > 0
                    ? "TRANSFER_AMOUNT_ABOVE_THRESHOLD" : "SENSITIVE_INTENT")
                : "AUTOMATIC_DECISION";
        Map<String, Object> trace = new java.util.HashMap<>();
        trace.put("agentId", agent.getId().toString());
        trace.put("intent", result.getIntent() == null ? null : result.getIntent().name());
        trace.put("confidence", result.getConfidence());
        trace.put("decision", decision.name());
        trace.put("reason", reason);
        trace.put("threshold", threshold);
        trace.put("evaluatedAt", LocalDateTime.now().toString());
        bankingAgentService.appendActivityTrace(agent.getId(), trace);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("decision", decision.name());
        response.put("agentId", agent.getId().toString());
        response.put("reason", reason);
        response.put("trace", trace);
        return response;
    }

    @Tool(name = "list_admin_tasks", description = "List Flowable human-validation tasks. Requires an admin user.")
    public List<Map<String, Object>> listAdminTasks() {
        requireAdmin();
        return flowableService.listAdminTasks().stream().map(this::taskSummary).toList();
    }

    @Tool(name = "get_admin_task", description = "Fetch a Flowable human-validation task. Requires an admin user.")
    public Map<String, Object> getAdminTask(
            @ToolParam(description = "Flowable task identifier", required = true) String taskId) {
        requireAdmin();
        Task task = flowableService.getTaskById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }
        Map<String, Object> result = taskSummary(task);
        result.put("variables", flowableService.getProcessVariables(task.getProcessInstanceId()));
        return result;
    }

    @Tool(name = "complete_admin_task", description = "Complete a Flowable human-validation task. Requires an admin user.")
    public Map<String, Object> completeAdminTask(
            @ToolParam(description = "Flowable task identifier", required = true) String taskId,
            @ToolParam(description = "Approve or reject the task", required = true) Boolean approved,
            @ToolParam(description = "Optional administrative comment", required = false) String comment) {
        requireAdmin();
        return flowableTaskCompletionService.completeTask(taskId, Map.of(
                "approved", Boolean.TRUE.equals(approved),
                "comment", comment == null ? "" : comment));
    }

    private Map<String, Object> taskSummary(Task task) {
        return new java.util.HashMap<>(Map.of(
                "id", task.getId(),
                "name", task.getName(),
                "assignee", task.getAssignee() == null ? "" : task.getAssignee(),
                "processInstanceId", task.getProcessInstanceId(),
                "createdTime", String.valueOf(task.getCreateTime())));
    }

    private BankingAgent ownedAgent(String agentId) {
        return bankingAgentService.getAgentByIdAndUserId(UUID.fromString(agentId), authenticatedUserId())
                .orElseThrow(() -> new IllegalArgumentException("Agent not found"));
    }

    private void requireOwner(BankingAgent agent) {
        if (!authenticatedUserId().equals(agent.getUserId())) {
            throw new IllegalStateException("Agent does not belong to authenticated user");
        }
    }

    private UUID authenticatedUserId() {
        return userRepository.findByEmail(authenticatedEmail())
                .map(user -> user.getId())
                .orElseThrow(() -> new IllegalStateException("Authenticated user was not found"));
    }

    private void requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()))) {
            throw new SecurityException("Administrator role is required");
        }
    }

    private String authenticatedEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || authentication.getName().isBlank()
                || "anonymousUser".equals(authentication.getName())) {
            throw new IllegalStateException("Authenticated user is required");
        }
        return authentication.getName();
    }
}

package com.fintech.banking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.BankingAgentService;
import com.fintech.banking.service.FlowableService;
import com.fintech.banking.service.FlowableTaskCompletionService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.task.api.Task;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/mcp")
@RequiredArgsConstructor
@Slf4j
public class McpController {

    private final BankingAgentService bankingAgentService;
    private final FlowableService flowableService;
    private final FlowableTaskCompletionService flowableTaskCompletionService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.sensitive-line.threshold:5000}")
    private BigDecimal sensitiveThreshold;

    private UUID resolveAuthenticatedUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .map(User::getId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    @PostMapping("/agent/create")
    public ResponseEntity<?> createAgent(@RequestBody CreateAgentRequest request, Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            BankingAgent agent = bankingAgentService.createAgent(request.getSessionId(), userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(new ToolResponse("agent.create", new AgentResponse(agent)));
        } catch (Exception e) {
            log.error("MCP agent.create failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/agent/by-session/{sessionId}")
    public ResponseEntity<?> getAgentBySession(@PathVariable UUID sessionId, Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            return bankingAgentService.getAgentBySessionId(sessionId)
                .filter(agent -> agent.getUserId().equals(userId))
                .<ResponseEntity<?>>map(agent -> ResponseEntity.ok(new ToolResponse("agent.getBySession", new AgentResponse(agent))))
                .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("MCP agent.getBySession failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse("Failed to fetch agent"));
        }
    }

    @GetMapping("/agent/{agentId}")
    public ResponseEntity<?> getAgentById(@PathVariable UUID agentId, Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            return bankingAgentService.getAgentByIdAndUserId(agentId, userId)
                .<ResponseEntity<?>>map(agent -> ResponseEntity.ok(new ToolResponse("agent.getById", new AgentResponse(agent))))
                .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("MCP agent.getById failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse("Failed to fetch agent"));
        }
    }

    @PostMapping("/agent/{agentId}/context")
    public ResponseEntity<?> updateContext(@PathVariable UUID agentId, @RequestBody ContextRequest request, Authentication authentication) {
        try {
            resolveAuthenticatedUserId(authentication);
            BankingAgent agent = bankingAgentService.updateContext(agentId, objectMapper.valueToTree(request.getContext()));
            return ResponseEntity.ok(new ToolResponse("agent.updateContext", new AgentResponse(agent)));
        } catch (Exception e) {
            log.error("MCP agent.updateContext failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/agent/{agentId}/decision")
    public ResponseEntity<?> updateDecision(@PathVariable UUID agentId, @RequestBody DecisionRequest request, Authentication authentication) {
        try {
            resolveAuthenticatedUserId(authentication);
            BankingAgent agent = bankingAgentService.updateDecision(agentId, AgentDecision.valueOf(request.getDecision().toUpperCase()));
            return ResponseEntity.ok(new ToolResponse("agent.updateDecision", new AgentResponse(agent)));
        } catch (Exception e) {
            log.error("MCP agent.updateDecision failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/agent/{agentId}/last-transaction")
    public ResponseEntity<?> recordLastTransaction(@PathVariable UUID agentId, @RequestBody TransactionRequest request, Authentication authentication) {
        try {
            resolveAuthenticatedUserId(authentication);
            BankingAgent agent = bankingAgentService.recordLastTransaction(agentId, request.getTransactionId());
            return ResponseEntity.ok(new ToolResponse("agent.recordLastTransaction", new AgentResponse(agent)));
        } catch (Exception e) {
            log.error("MCP agent.recordLastTransaction failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/agent/determine-decision")
    public ResponseEntity<?> determineDecision(@RequestBody DetermineDecisionRequest request, Authentication authentication) {
        try {
            resolveAuthenticatedUserId(authentication);
            BankingAgent agent = bankingAgentService.getAgentById(request.getAgentId())
                .orElseThrow(() -> new IllegalArgumentException("Agent not found"));

            IntentResult intentResult = new IntentResult();
            intentResult.setConfidence(request.getConfidence());
            intentResult.setMessage(request.getMessage());
            intentResult.setIntent(request.getIntent() == null || request.getIntent().isBlank() ? null : IntentType.valueOf(request.getIntent().toUpperCase()));
            intentResult.setParameters(objectMapper.valueToTree(request.getParameters()));
            intentResult.setIsSensitive(Boolean.TRUE.equals(request.getIsSensitive()) || isSensitiveIntent(intentResult, request.getParameters()));

            AgentDecision decision = bankingAgentService.determineDecision(agent, intentResult);
            Map<String, Object> trace = new HashMap<>();
            trace.put("agentId", agent.getId());
            trace.put("intent", intentResult.getIntent() != null ? intentResult.getIntent().name() : null);
            trace.put("confidence", intentResult.getConfidence());
            trace.put("decision", decision.name());
            trace.put("reason", determineReason(intentResult, request.getParameters(), decision));
            trace.put("threshold", sensitiveThreshold);
            trace.put("parameters", request.getParameters());

            BankingAgent updated = bankingAgentService.updateContext(agent.getId(), trace);
            bankingAgentService.updateDecision(agent.getId(), decision);

            Map<String, Object> response = new HashMap<>();
            response.put("decision", decision.name());
            response.put("reason", trace.get("reason"));
            response.put("trace", trace);
            response.put("agent", new AgentResponse(updated));

            return ResponseEntity.ok(new ToolResponse("agent.determineDecision", response));
        } catch (Exception e) {
            log.error("MCP agent.determineDecision failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/flowable/admin-tasks")
    public ResponseEntity<?> listAdminTasks(Authentication authentication) {
        try {
            resolveAuthenticatedUserId(authentication);
            List<Task> tasks = flowableService.listAdminTasks();
            List<Map<String, Object>> payload = tasks.stream().map(task -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", task.getId());
                map.put("name", task.getName());
                map.put("assignee", task.getAssignee());
                map.put("createdTime", task.getCreateTime());
                map.put("processInstanceId", task.getProcessInstanceId());
                return map;
            }).toList();
            return ResponseEntity.ok(new ToolResponse("flowable.listAdminTasks", payload));
        } catch (Exception e) {
            log.error("MCP flowable.listAdminTasks failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse("Failed to list admin tasks"));
        }
    }

    @GetMapping("/flowable/tasks/{taskId}")
    public ResponseEntity<?> getTask(@PathVariable String taskId, Authentication authentication) {
        try {
            resolveAuthenticatedUserId(authentication);
            Task task = flowableService.getTaskById(taskId);
            if (task == null) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("taskId", task.getId());
            payload.put("name", task.getName());
            payload.put("assignee", task.getAssignee());
            payload.put("processInstanceId", task.getProcessInstanceId());
            payload.put("variables", flowableService.getProcessVariables(task.getProcessInstanceId()));
            return ResponseEntity.ok(new ToolResponse("flowable.getTask", payload));
        } catch (Exception e) {
            log.error("MCP flowable.getTask failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse("Failed to fetch task"));
        }
    }

    //@PreAuthorize()
    @PostMapping("/flowable/tasks/{taskId}/complete")
    public ResponseEntity<?> completeTask(@PathVariable String taskId, @RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            resolveAuthenticatedUserId(authentication);
            Map<String, Object> result = flowableTaskCompletionService.completeTask(taskId, request);
            return ResponseEntity.ok(new ToolResponse("flowable.completeTask", result));
        } catch (Exception e) {
            log.error("MCP flowable.completeTask failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
        }
    }

    private boolean isSensitiveIntent(IntentResult intentResult, Map<String, Object> parameters) {
        if (intentResult.getIntent() == null) {
            return false;
        }

        if (List.of(IntentType.FRAUD, IntentType.STOLEN_CARD, IntentType.CLAIM, IntentType.UPDATE_SENSITIVE_DATA).contains(intentResult.getIntent())) {
            return true;
        }

        BigDecimal amount = extractAmount(parameters);
        return amount != null && amount.compareTo(sensitiveThreshold) > 0;
    }

    private String determineReason(IntentResult intentResult, Map<String, Object> parameters, AgentDecision decision) {
        if (decision == AgentDecision.REQUEST_INFO) {
            return "LOW_CONFIDENCE";
        }
        if (isSensitiveIntent(intentResult, parameters)) {
            return "SENSITIVE_INTENT_OR_HIGH_VALUE";
        }
        return "AUTOMATIC_DECISION";
    }

    private BigDecimal extractAmount(Map<String, Object> parameters) {
        Object rawAmount = parameters == null ? null : parameters.get("amount");
        if (rawAmount == null) {
            return null;
        }

        try {
            return new BigDecimal(String.valueOf(rawAmount));
        } catch (Exception ex) {
            return null;
        }
    }

    @Data
    public static class CreateAgentRequest {
        private UUID sessionId;
    }

    @Data
    public static class ContextRequest {
        private Map<String, Object> context;
    }

    @Data
    public static class DecisionRequest {
        private String decision;
    }

    @Data
    public static class TransactionRequest {
        private UUID transactionId;
    }

    @Data
    public static class DetermineDecisionRequest {
        private UUID agentId;
        private String intent;
        private Double confidence;
        private String message;
        private Boolean isSensitive;
        private Map<String, Object> parameters;
    }

    @Data
    @AllArgsConstructor
    public static class ToolResponse {
        private String tool;
        private Object data;
    }

    @Data
    @AllArgsConstructor
    public static class AgentResponse {
        private UUID id;
        private UUID sessionId;
        private UUID userId;
        private JsonNode context;
        private UUID lastTransactionId;
        private AgentDecision decision;
        private AgentDecision defaultPolicy;
        private String createdAt;
        private String updatedAt;

        public AgentResponse(BankingAgent agent) {
            this.id = agent.getId();
            this.sessionId = agent.getSessionId();
            this.userId = agent.getUserId();
            this.context = agent.getContext();
            this.lastTransactionId = agent.getLastTransactionId();
            this.decision = agent.getDecision();
            this.defaultPolicy = agent.getDefaultPolicy();
            this.createdAt = agent.getCreatedAt().toString();
            this.updatedAt = agent.getUpdatedAt().toString();
        }
    }

    @Data
    @AllArgsConstructor
    public static class ErrorResponse {
        private String error;
    }
}
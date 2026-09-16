package com.fintech.banking.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.service.BankingAgentService;
import com.fintech.banking.service.FlowableService;
import com.fintech.banking.service.FlowableTaskCompletionService;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class McpToolRegistry {

    private final BankingAgentService bankingAgentService;
    private final FlowableService flowableService;
    private final FlowableTaskCompletionService flowableTaskCompletionService;
    private final ObjectMapper objectMapper;

    public McpToolRegistry(BankingAgentService bankingAgentService,
                           FlowableService flowableService,
                           FlowableTaskCompletionService flowableTaskCompletionService,
                           ObjectMapper objectMapper) {
        this.bankingAgentService = bankingAgentService;
        this.flowableService = flowableService;
        this.flowableTaskCompletionService = flowableTaskCompletionService;
        this.objectMapper = objectMapper;
    }

    public List<ToolDefinition> listTools() {
        return List.of(
            new ToolDefinition("agent.create", "Create or return the banking agent linked to a session.", schema(Map.of(
                "sessionId", stringSchema(),
                "userId", stringSchema()
            ), List.of("sessionId", "userId"))),
            new ToolDefinition("agent.getBySession", "Fetch the agent attached to a session.", schema(Map.of(
                "sessionId", stringSchema()
            ), List.of("sessionId"))),
            new ToolDefinition("agent.getById", "Fetch one agent by id.", schema(Map.of(
                "agentId", stringSchema()
            ), List.of("agentId"))),
            new ToolDefinition("agent.updateContext", "Persist structured agent context.", schema(Map.of(
                "agentId", stringSchema(),
                "context", objectSchema()
            ), List.of("agentId", "context"))),
            new ToolDefinition("agent.updateDecision", "Store the last decision taken by the agent.", schema(Map.of(
                "agentId", stringSchema(),
                "decision", stringSchema()
            ), List.of("agentId", "decision"))),
            new ToolDefinition("agent.recordLastTransaction", "Link the last processed transaction to the agent.", schema(Map.of(
                "agentId", stringSchema(),
                "transactionId", stringSchema()
            ), List.of("agentId", "transactionId"))),
            new ToolDefinition("agent.determineDecision", "Let the backend apply the Sensitive Line rules.", schema(Map.of(
                "agentId", stringSchema(),
                "intent", stringSchema(),
                "confidence", numberSchema(),
                "message", stringSchema(),
                "isSensitive", booleanSchema(),
                "parameters", objectSchema()
            ), List.of("agentId", "intent", "confidence", "parameters"))),
            new ToolDefinition("flowable.listAdminTasks", "List tasks assigned to the admin group.", schema(Map.of(), List.of())),
            new ToolDefinition("flowable.getTask", "Fetch one admin task with its process variables.", schema(Map.of(
                "taskId", stringSchema()
            ), List.of("taskId"))),
            new ToolDefinition("flowable.completeTask", "Complete an admin task and propagate the business action.", schema(Map.of(
                "taskId", stringSchema(),
                "approved", booleanSchema(),
                "comment", stringSchema()
            ), List.of("taskId", "approved")))
        );
    }

    public JsonNode callTool(String name, JsonNode arguments) {
        return switch (name) {
            case "agent.create" -> executeAgentCreate(arguments);
            case "agent.getBySession" -> executeGetAgentBySession(arguments);
            case "agent.getById" -> executeGetAgentById(arguments);
            case "agent.updateContext" -> executeUpdateContext(arguments);
            case "agent.updateDecision" -> executeUpdateDecision(arguments);
            case "agent.recordLastTransaction" -> executeRecordLastTransaction(arguments);
            case "agent.determineDecision" -> executeDetermineDecision(arguments);
            case "flowable.listAdminTasks" -> executeListAdminTasks();
            case "flowable.getTask" -> executeGetTask(arguments);
            case "flowable.completeTask" -> executeCompleteTask(arguments);
            default -> throw new IllegalArgumentException("Unknown tool: " + name);
        };
    }

    private JsonNode executeAgentCreate(JsonNode arguments) {
        UUID sessionId = uuid(arguments, "sessionId");
        UUID userId = uuid(arguments, "userId");
        BankingAgent agent = bankingAgentService.createAgent(sessionId, userId);
        return agentNode(agent);
    }

    private JsonNode executeGetAgentBySession(JsonNode arguments) {
        UUID sessionId = uuid(arguments, "sessionId");
        BankingAgent agent = bankingAgentService.getAgentBySessionId(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Agent not found for session " + sessionId));
        return agentNode(agent);
    }

    private JsonNode executeGetAgentById(JsonNode arguments) {
        UUID agentId = uuid(arguments, "agentId");
        BankingAgent agent = bankingAgentService.getAgentById(agentId)
            .orElseThrow(() -> new IllegalArgumentException("Agent not found: " + agentId));
        return agentNode(agent);
    }

    private JsonNode executeUpdateContext(JsonNode arguments) {
        UUID agentId = uuid(arguments, "agentId");
        JsonNode context = arguments.path("context");
        BankingAgent agent = bankingAgentService.updateContext(agentId, context);
        return agentNode(agent);
    }

    private JsonNode executeUpdateDecision(JsonNode arguments) {
        UUID agentId = uuid(arguments, "agentId");
        AgentDecision decision = AgentDecision.valueOf(text(arguments, "decision").toUpperCase());
        BankingAgent agent = bankingAgentService.updateDecision(agentId, decision);
        return agentNode(agent);
    }

    private JsonNode executeRecordLastTransaction(JsonNode arguments) {
        UUID agentId = uuid(arguments, "agentId");
        UUID transactionId = uuid(arguments, "transactionId");
        BankingAgent agent = bankingAgentService.recordLastTransaction(agentId, transactionId);
        return agentNode(agent);
    }

    private JsonNode executeDetermineDecision(JsonNode arguments) {
        UUID agentId = uuid(arguments, "agentId");
        BankingAgent agent = bankingAgentService.getAgentById(agentId)
            .orElseThrow(() -> new IllegalArgumentException("Agent not found: " + agentId));

        IntentResult intentResult = new IntentResult();
        String intentText = text(arguments, "intent");
        if (intentText != null && !intentText.isBlank()) {
            intentResult.setIntent(IntentType.valueOf(intentText.toUpperCase()));
        }
        intentResult.setConfidence(number(arguments, "confidence"));
        intentResult.setMessage(text(arguments, "message"));
        intentResult.setParameters(arguments.path("parameters"));
        intentResult.setIsSensitive(booleanValue(arguments, "isSensitive") || isSensitiveIntent(arguments.path("parameters")));

        AgentDecision decision = bankingAgentService.determineDecision(agent, intentResult);
        Map<String, Object> trace = new HashMap<>();
        trace.put("agentId", agentId);
        trace.put("intent", intentResult.getIntent() == null ? null : intentResult.getIntent().name());
        trace.put("confidence", intentResult.getConfidence());
        trace.put("decision", decision.name());
        trace.put("reason", decisionReason(intentResult, arguments.path("parameters"), decision));
        trace.put("threshold", 5000);
        trace.put("parameters", arguments.path("parameters"));

        bankingAgentService.updateContext(agentId, trace);
        bankingAgentService.updateDecision(agentId, decision);

        ObjectNode response = objectMapper.createObjectNode();
        response.put("decision", decision.name());
        response.put("reason", String.valueOf(trace.get("reason")));
        response.set("trace", objectMapper.valueToTree(trace));
        response.set("agent", agentNode(bankingAgentService.getAgentById(agentId).orElse(agent)));
        return response;
    }

    private JsonNode executeListAdminTasks() {
        ArrayNode tasks = objectMapper.createArrayNode();
        for (Task task : flowableService.listAdminTasks()) {
            ObjectNode item = objectMapper.createObjectNode();
            item.put("id", task.getId());
            item.put("name", task.getName());
            item.put("assignee", task.getAssignee());
            item.put("createdTime", String.valueOf(task.getCreateTime()));
            item.put("processInstanceId", task.getProcessInstanceId());
            tasks.add(item);
        }
        ObjectNode response = objectMapper.createObjectNode();
        response.set("tasks", tasks);
        return response;
    }

    private JsonNode executeGetTask(JsonNode arguments) {
        String taskId = text(arguments, "taskId");
        Task task = flowableService.getTaskById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found: " + taskId);
        }

        ObjectNode response = objectMapper.createObjectNode();
        response.put("taskId", task.getId());
        response.put("name", task.getName());
        response.put("assignee", task.getAssignee());
        response.put("processInstanceId", task.getProcessInstanceId());
        response.set("variables", objectMapper.valueToTree(flowableService.getProcessVariables(task.getProcessInstanceId())));
        return response;
    }

    private JsonNode executeCompleteTask(JsonNode arguments) {
        String taskId = text(arguments, "taskId");
        Map<String, Object> request = objectMapper.convertValue(arguments, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>(){});
        Map<String, Object> result = flowableTaskCompletionService.completeTask(taskId, request);
        return objectMapper.valueToTree(result);
    }

    private JsonNode agentNode(BankingAgent agent) {
        return objectMapper.valueToTree(agent);
    }

    private boolean isSensitiveIntent(JsonNode parameters) {
        BigDecimal amount = extractAmount(parameters);
        return amount != null && amount.compareTo(new BigDecimal("5000")) > 0;
    }

    private String decisionReason(IntentResult intentResult, JsonNode parameters, AgentDecision decision) {
        if (decision == AgentDecision.REQUEST_INFO) {
            return "LOW_CONFIDENCE";
        }
        if (intentResult.getIsSensitive() != null && intentResult.getIsSensitive()) {
            return "SENSITIVE_INTENT_OR_HIGH_VALUE";
        }
        if (isSensitiveIntent(parameters)) {
            return "SENSITIVE_INTENT_OR_HIGH_VALUE";
        }
        return "AUTOMATIC_DECISION";
    }

    private UUID uuid(JsonNode arguments, String field) {
        return UUID.fromString(text(arguments, field));
    }

    private String text(JsonNode arguments, String field) {
        JsonNode node = arguments.get(field);
        if (node == null || node.isNull() || node.asText().isBlank()) {
            throw new IllegalArgumentException("Missing required field: " + field);
        }
        return node.asText();
    }

    private Double number(JsonNode arguments, String field) {
        JsonNode node = arguments.get(field);
        return node == null || node.isNull() ? null : node.asDouble();
    }

    private boolean booleanValue(JsonNode arguments, String field) {
        JsonNode node = arguments.get(field);
        return node != null && !node.isNull() && node.asBoolean();
    }

    private BigDecimal extractAmount(JsonNode parameters) {
        if (parameters == null || parameters.isNull() || parameters.get("amount") == null || parameters.get("amount").isNull()) {
            return null;
        }

        try {
            return new BigDecimal(parameters.get("amount").asText());
        } catch (Exception ex) {
            return null;
        }
    }

    private Map<String, Object> schema(Map<String, Object> properties, List<String> required) {
        Map<String, Object> schema = new HashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);
        schema.put("additionalProperties", true);
        return schema;
    }

    private Map<String, Object> stringSchema() {
        return Map.of("type", "string");
    }

    private Map<String, Object> numberSchema() {
        return Map.of("type", "number");
    }

    private Map<String, Object> booleanSchema() {
        return Map.of("type", "boolean");
    }

    private Map<String, Object> objectSchema() {
        return Map.of("type", "object");
    }

    public record ToolDefinition(String name, String description, Map<String, Object> inputSchema) {
    }
}
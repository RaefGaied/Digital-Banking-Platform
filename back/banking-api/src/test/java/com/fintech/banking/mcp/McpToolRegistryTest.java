package com.fintech.banking.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.service.BankingAgentService;
import com.fintech.banking.service.FlowableService;
import com.fintech.banking.service.FlowableTaskCompletionService;
import com.fintech.banking.service.KnowledgeBaseService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class McpToolRegistryTest {

    private final BankingAgentService bankingAgentService = Mockito.mock(BankingAgentService.class);
    private final FlowableService flowableService = Mockito.mock(FlowableService.class);
    private final FlowableTaskCompletionService flowableTaskCompletionService = Mockito.mock(FlowableTaskCompletionService.class);
    private final KnowledgeBaseService knowledgeBaseService = Mockito.mock(KnowledgeBaseService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final McpToolRegistry registry = new McpToolRegistry(
        bankingAgentService,
        flowableService,
        flowableTaskCompletionService,
        knowledgeBaseService,
        objectMapper
    );

    @Test
    void listsExpectedTools() {
        List<McpToolRegistry.ToolDefinition> tools = registry.listTools();

        assertTrue(tools.stream().anyMatch(tool -> tool.name().equals("agent.create")));
        assertTrue(tools.stream().anyMatch(tool -> tool.name().equals("flowable.completeTask")));
    }

    @Test
    void dispatchesAgentDecisionTool() {
        UUID agentId = UUID.randomUUID();
        BankingAgent agent = new BankingAgent();
        try {
            java.lang.reflect.Field fId = BankingAgent.class.getDeclaredField("id");
            fId.setAccessible(true);
            fId.set(agent, agentId);

            java.lang.reflect.Field fSession = BankingAgent.class.getDeclaredField("sessionId");
            fSession.setAccessible(true);
            fSession.set(agent, UUID.randomUUID());

            java.lang.reflect.Field fUser = BankingAgent.class.getDeclaredField("userId");
            fUser.setAccessible(true);
            fUser.set(agent, UUID.randomUUID());

            java.lang.reflect.Field fDefault = BankingAgent.class.getDeclaredField("defaultPolicy");
            fDefault.setAccessible(true);
            fDefault.set(agent, AgentDecision.AUTO_EXECUTE);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }

        when(bankingAgentService.getAgentById(agentId)).thenReturn(Optional.of(agent));
        when(bankingAgentService.determineDecision(any(), any())).thenReturn(AgentDecision.AUTO_EXECUTE);
        when(bankingAgentService.updateContext(eq(agentId), any())).thenReturn(agent);
        when(bankingAgentService.updateDecision(eq(agentId), eq(AgentDecision.AUTO_EXECUTE))).thenAnswer(invocation -> {
            agent.setDecision(AgentDecision.AUTO_EXECUTE);
            return agent;
        });

        ObjectNode args = JsonNodeFactory.instance.objectNode();
        args.put("agentId", agentId.toString());
        args.put("intent", "TRANSFER");
        args.put("confidence", 0.9);
        ObjectNode params = JsonNodeFactory.instance.objectNode();
        params.put("amount", 2500);
        args.set("parameters", params);

        var result = registry.callTool("agent.determineDecision", args);

        assertEquals("AUTO_EXECUTE", result.get("decision").asText());
        assertEquals("AUTOMATIC_DECISION", result.get("reason").asText());
        assertEquals("AUTO_EXECUTE", result.get("agent").get("decision").asText());
    }

    @Test
    void dispatchesKnowledgeLookupTool() {
        when(knowledgeBaseService.search("virement")).thenReturn(List.of("Q: Comment puis-je faire un virement ?\nA: Décrivez le montant et le compte destinataire."));

        ObjectNode args = JsonNodeFactory.instance.objectNode();
        args.put("query", "virement");

        var result = registry.callTool("agent.getKnowledge", args);

        assertEquals("virement", result.get("query").asText());
        assertTrue(result.get("results").isArray());
        assertEquals(1, result.get("results").size());
    }

    @Test
    void dispatchesFlowableTaskCompletion() {
        UUID taskId = UUID.randomUUID();
        when(flowableTaskCompletionService.completeTask(eq(taskId.toString()), anyMap()))
            .thenReturn(Map.of("taskId", taskId.toString(), "approved", true));

        ObjectNode args = JsonNodeFactory.instance.objectNode();
        args.put("taskId", taskId.toString());
        args.put("approved", true);

        var result = registry.callTool("flowable.completeTask", args);

        assertTrue(result.get("approved").asBoolean());
        assertEquals(taskId.toString(), result.get("taskId").asText());
    }
}
package com.fintech.banking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.UserRole;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.BankingAgentService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/agents")
@RequiredArgsConstructor
@Slf4j
public class BankingAgentController {

    private final BankingAgentService bankingAgentService;
    private final UserRepository userRepository;

    private User resolveAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    private UUID resolveAuthenticatedUserId(Authentication authentication) {
        return resolveAuthenticatedUser(authentication).getId();
    }

    @GetMapping
    public ResponseEntity<?> listAgents(Authentication authentication) {
        try {
            User currentUser = resolveAuthenticatedUser(authentication);
            List<BankingAgent> agents = currentUser.getRole() == UserRole.ADMIN
                ? bankingAgentService.getAllAgents()
                : bankingAgentService.getAgentsByUserId(currentUser.getId());

            List<AgentResponse> agentResponses = agents.stream()
                .map(AgentResponse::new)
                .toList();

            return ResponseEntity.ok(new SuccessResponse("Agents retrieved", agentResponses));
        } catch (Exception e) {
            log.error("Failed to retrieve agents", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve agents"));
        }
    }

    @GetMapping("/{agentId}")
    public ResponseEntity<?> getAgent(
            @PathVariable UUID agentId,
            Authentication authentication) {
        try {
            User currentUser = resolveAuthenticatedUser(authentication);
            boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
            return bankingAgentService.getAgentByIdForAdminOrOwner(agentId, currentUser.getId(), isAdmin)
                .<ResponseEntity<?>>map(agent -> ResponseEntity.ok(new SuccessResponse("Agent retrieved", new AgentResponse(agent))))
                .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Failed to retrieve agent", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve agent"));
        }
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<?> getAgentBySession(
            @PathVariable UUID sessionId,
            Authentication authentication) {
        try {
            User currentUser = resolveAuthenticatedUser(authentication);
            boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
            return bankingAgentService.getAgentBySessionId(sessionId)
                .filter(agent -> isAdmin || agent.getUserId().equals(currentUser.getId()))
                .<ResponseEntity<?>>map(agent -> ResponseEntity.ok(new SuccessResponse("Agent retrieved", new AgentResponse(agent))))
                .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Failed to retrieve agent by session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve agent"));
        }
    }

    @GetMapping("/session/{sessionId}/activity")
    public ResponseEntity<?> getAgentActivityBySession(
            @PathVariable UUID sessionId,
            Authentication authentication) {
        try {
            User currentUser = resolveAuthenticatedUser(authentication);
            boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
            return bankingAgentService.getAgentBySessionId(sessionId)
                .filter(agent -> isAdmin || agent.getUserId().equals(currentUser.getId()))
                .<ResponseEntity<?>>map(agent -> ResponseEntity.ok(new SuccessResponse("Agent activity retrieved", buildActivityList(agent))))
                .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Failed to retrieve agent activity by session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve agent activity"));
        }
    }

    @GetMapping("/{agentId}/activity")
    public ResponseEntity<?> getAgentActivity(
            @PathVariable UUID agentId,
            Authentication authentication) {
        try {
            User currentUser = resolveAuthenticatedUser(authentication);
            boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
            return bankingAgentService.getAgentByIdForAdminOrOwner(agentId, currentUser.getId(), isAdmin)
                .<ResponseEntity<?>>map(agent -> ResponseEntity.ok(new SuccessResponse("Agent activity retrieved", buildActivityList(agent))))
                .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Failed to retrieve agent activity", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve agent activity"));
        }
    }

    private List<AgentActivityResponse> buildActivityList(BankingAgent agent) {
        JsonNode context = agent.getContext();
        if (context == null || !context.has("activities")) {
            return List.of();
        }

        JsonNode activities = context.get("activities");
        if (!activities.isArray()) {
            return List.of();
        }

        return StreamSupport.stream(activities.spliterator(), false)
            .filter(JsonNode::isObject)
            .map(AgentActivityResponse::new)
            .toList();
    }

    @Data
    @AllArgsConstructor
    public static class AgentActivityResponse {
        private String timestamp;
        private String action;
        private String intent;
        private Double confidence;
        private Boolean isSensitive;
        private AgentDecision decision;
        private JsonNode parameters;
        private String note;

        public AgentActivityResponse(JsonNode json) {
            this.timestamp = json.hasNonNull("timestamp") ? json.get("timestamp").asText() : null;
            this.action = json.hasNonNull("action") ? json.get("action").asText() : null;
            this.intent = json.hasNonNull("intent") ? json.get("intent").asText() : null;
            this.confidence = json.hasNonNull("confidence") ? json.get("confidence").asDouble() : null;
            this.isSensitive = json.hasNonNull("isSensitive") ? json.get("isSensitive").asBoolean() : null;
            this.decision = json.hasNonNull("decision") ? AgentDecision.valueOf(json.get("decision").asText()) : null;
            this.parameters = json.has("parameters") ? json.get("parameters") : null;
            this.note = json.hasNonNull("note") ? json.get("note").asText() : null;
        }
    }

    @PostMapping("/session/{sessionId}")
    public ResponseEntity<?> createAgentForSession(
            @PathVariable UUID sessionId,
            Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            BankingAgent agent = bankingAgentService.createAgent(sessionId, userId);

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new SuccessResponse("Agent created", new AgentResponse(agent)));
        } catch (Exception e) {
            log.error("Failed to create agent", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("Failed to create agent: " + e.getMessage()));
        }
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
    public static class SuccessResponse {
        private String message;
        private Object data;
    }

    @Data
    @AllArgsConstructor
    public static class ErrorResponse {
        private String error;
    }
}

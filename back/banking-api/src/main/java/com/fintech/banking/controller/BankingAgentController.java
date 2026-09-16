package com.fintech.banking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
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

@RestController
@RequestMapping("/agents")
@RequiredArgsConstructor
@Slf4j
public class BankingAgentController {

    private final BankingAgentService bankingAgentService;
    private final UserRepository userRepository;

    private UUID resolveAuthenticatedUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .map(User::getId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    @GetMapping
    public ResponseEntity<?> listAgents(Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            List<AgentResponse> agents = bankingAgentService.getAgentsByUserId(userId)
                .stream()
                .map(AgentResponse::new)
                .toList();

            return ResponseEntity.ok(new SuccessResponse("Agents retrieved", agents));
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
            UUID userId = resolveAuthenticatedUserId(authentication);
            return bankingAgentService.getAgentByIdAndUserId(agentId, userId)
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
            UUID userId = resolveAuthenticatedUserId(authentication);
            return bankingAgentService.getAgentBySessionId(sessionId)
                .filter(agent -> agent.getUserId().equals(userId))
                .<ResponseEntity<?>>map(agent -> ResponseEntity.ok(new SuccessResponse("Agent retrieved", new AgentResponse(agent))))
                .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Failed to retrieve agent by session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve agent"));
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

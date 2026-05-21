package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.service.SessionService;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Slf4j
public class SessionController {

    private final SessionService sessionService;

    /**
     * Create a new session for the authenticated user
     */
    @PostMapping
    public ResponseEntity<?> createSession(
            @RequestBody CreateSessionRequest request,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            String ipAddress = request.getIpAddress() != null ? request.getIpAddress() : "127.0.0.1";

            Session session = sessionService.createSession(userId, ipAddress);

            log.info("Session created for user: {}", userId);

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new SuccessResponse("Session created", new SessionResponse(session)));

        } catch (Exception e) {
            log.error("Failed to create session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to create session: " + e.getMessage()));
        }
    }

    /**
     * Get session by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getSession(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            Session session = sessionService.getSessionById(id)
                .orElse(null);

            if (session == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(new SuccessResponse("Session retrieved", new SessionResponse(session)));
        } catch (Exception e) {
            log.error("Failed to retrieve session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve session"));
        }
    }

    /**
     * Get all active sessions for the authenticated user
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActiveSessions(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());

            List<Session> sessions = sessionService.getActiveSessions(userId);
            List<SessionResponse> responses = sessions.stream()
                .map(SessionResponse::new)
                .collect(Collectors.toList());

            return ResponseEntity.ok(new SuccessResponse("Active sessions retrieved", responses));
        } catch (Exception e) {
            log.error("Failed to retrieve active sessions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve active sessions"));
        }
    }

    /**
     * Get all sessions for the authenticated user
     */
    @GetMapping
    public ResponseEntity<?> getAllSessions(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());

            List<Session> sessions = sessionService.getAllSessions(userId);
            List<SessionResponse> responses = sessions.stream()
                .map(SessionResponse::new)
                .collect(Collectors.toList());

            return ResponseEntity.ok(new SuccessResponse("Sessions retrieved", responses));
        } catch (Exception e) {
            log.error("Failed to retrieve sessions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve sessions"));
        }
    }

    /**
     * Open/activate a session
     */
    @PostMapping("/{id}/open")
    public ResponseEntity<?> openSession(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            Session session = sessionService.openSession(id);

            log.info("Session opened: {}", id);

            return ResponseEntity.ok(new SuccessResponse("Session opened", new SessionResponse(session)));
        } catch (Exception e) {
            log.error("Failed to open session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to open session"));
        }
    }

    /**
     * Close a session
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<?> closeSession(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            Session session = sessionService.closeSession(id);

            log.info("Session closed: {}", id);

            return ResponseEntity.ok(new SuccessResponse("Session closed", new SessionResponse(session)));
        } catch (Exception e) {
            log.error("Failed to close session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to close session"));
        }
    }

    /**
     * Record activity on a session
     */
    @PostMapping("/{id}/activity")
    public ResponseEntity<?> recordActivity(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            Session session = sessionService.recordActivity(id);

            return ResponseEntity.ok(new SuccessResponse("Activity recorded", new SessionResponse(session)));
        } catch (Exception e) {
            log.error("Failed to record session activity", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to record activity"));
        }
    }

    /**
     * Check if a session is valid
     */
    @GetMapping("/{id}/valid")
    public ResponseEntity<?> isSessionValid(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            boolean isValid = sessionService.isSessionValid(id);

            return ResponseEntity.ok(new SuccessResponse("Session validity checked", 
                new ValidityResponse(isValid)));
        } catch (Exception e) {
            log.error("Failed to check session validity", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to check session validity"));
        }
    }

    /**
     * Close all sessions for the authenticated user
     */
    @PostMapping("/close-all")
    public ResponseEntity<?> closeAllSessions(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            sessionService.closeAllSessionsForUser(userId);

            log.info("All sessions closed for user: {}", userId);

            return ResponseEntity.ok(new SuccessResponse("All sessions closed", null));
        } catch (Exception e) {
            log.error("Failed to close all sessions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to close all sessions"));
        }
    }

    // Request/Response DTOs
    @Data
    public static class CreateSessionRequest {
        private String ipAddress;
    }

    @Data
    @AllArgsConstructor
    public static class SessionResponse {
        private UUID id;
        private UUID userId;
        private String status;
        private String ipAddress;
        private String createdAt;
        private String lastActivityAt;
        private String closedAt;

        public SessionResponse(Session session) {
            this.id = session.getId();
            this.userId = session.getUserId();
            this.status = session.getStatus().toString();
            this.ipAddress = session.getIpAddress();
            this.createdAt = session.getCreatedAt().toString();
            this.lastActivityAt = session.getLastActivityAt().toString();
            this.closedAt = session.getClosedAt() != null ? session.getClosedAt().toString() : null;
        }
    }

    @Data
    @AllArgsConstructor
    public static class ValidityResponse {
        private boolean isValid;
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

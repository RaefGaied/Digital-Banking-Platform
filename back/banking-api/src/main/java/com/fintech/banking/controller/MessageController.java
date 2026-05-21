package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.enums.SenderType;
import com.fintech.banking.service.MessageService;
import com.fintech.banking.service.IntentDetectionService;
import com.fintech.banking.domain.vo.IntentResult;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions/{sessionId}/messages")
@RequiredArgsConstructor
@Slf4j
public class MessageController {

    private final MessageService messageService;
    private final IntentDetectionService intentDetectionService;

    /**
     * Create a new message in a session
     */
    @PostMapping
    public ResponseEntity<?> createMessage(
            @PathVariable Long sessionId,
            @RequestBody CreateMessageRequest request,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());


            // Validation
            if (request.getContent() == null || request.getContent().isEmpty()) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Message content is required"));
            }

            // If client did not supply an intent, run rule-based detection
            IntentResult detected = null;
            String intentToSave = request.getIntent();
            JsonNode paramsToSave = request.getParameters();
            if (intentToSave == null || intentToSave.isBlank()) {
                try {
                    detected = intentDetectionService.detectIntent(request.getContent());
                } catch (Exception ex) {
                    log.warn("Intent detection failed, continuing without detected intent", ex);
                }

                if (detected != null) {
                    if (detected.getIntent() != null) {
                        intentToSave = detected.getIntent().name();
                    }
                    if (detected.getParameters() != null) {
                        paramsToSave = detected.getParameters();
                    }
                }
            }

            Message message = messageService.createMessage(
                sessionId,
                userId,
                request.getSenderType() != null ? request.getSenderType() : SenderType.USER,
                request.getContent(),
                request.getIsInternal(),
                intentToSave,
                paramsToSave
            );

            log.info("Message created in session: {}", sessionId);

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new SuccessResponse("Message created", new MessageResponse(message)));

        } catch (Exception e) {
            log.error("Failed to create message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to create message: " + e.getMessage()));
        }
    }

    /**
     * Get all messages in a session (paginated)
     */
    @GetMapping
    public ResponseEntity<?> getMessages(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Message> messages = messageService.getSessionMessages(sessionId, pageable);

            return ResponseEntity.ok(new SuccessResponse("Messages retrieved", messages));
        } catch (Exception e) {
            log.error("Failed to retrieve messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve messages"));
        }
    }

    /**
     * Get messages in conversation order (ascending by timestamp)
     */
    @GetMapping("/conversation")
    public ResponseEntity<?> getConversation(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            List<Message> messages = messageService.getSessionMessagesList(sessionId);
            List<MessageResponse> responses = messages.stream()
                .map(MessageResponse::new)
                .collect(Collectors.toList());

            return ResponseEntity.ok(new SuccessResponse("Conversation retrieved", responses));
        } catch (Exception e) {
            log.error("Failed to retrieve conversation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve conversation"));
        }
    }

    /**
     * Get message by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getMessage(
            @PathVariable Long sessionId,
            @PathVariable Long id,
            Authentication authentication) {
        try {
            Message message = messageService.getMessageById(id)
                .orElse(null);

            if (message == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(new SuccessResponse("Message retrieved", new MessageResponse(message)));
        } catch (Exception e) {
            log.error("Failed to retrieve message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve message"));
        }
    }

    /**
     * Get message count for a session
     */
    @GetMapping("/count")
    public ResponseEntity<?> getMessageCount(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            long count = messageService.getMessageCount(sessionId);

            return ResponseEntity.ok(new SuccessResponse("Message count retrieved", 
                new MessageCountResponse(count)));
        } catch (Exception e) {
            log.error("Failed to retrieve message count", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve message count"));
        }
    }

    /**
     * Get messages by sender type
     */
    @GetMapping("/sender-type/{senderType}")
    public ResponseEntity<?> getMessagesBySenderType(
            @PathVariable Long sessionId,
            @PathVariable String senderType,
            Authentication authentication) {
        try {
            SenderType type = SenderType.valueOf(senderType.toUpperCase());
            List<Message> messages = messageService.getMessagesBySenderType(sessionId, type);
            List<MessageResponse> responses = messages.stream()
                .map(MessageResponse::new)
                .collect(Collectors.toList());

            return ResponseEntity.ok(new SuccessResponse("Messages retrieved", responses));
        } catch (Exception e) {
            log.error("Failed to retrieve messages by sender type", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Invalid sender type or retrieval failed"));
        }
    }

    /**
     * Get internal messages (admin/system only)
     */
    @GetMapping("/internal")
    public ResponseEntity<?> getInternalMessages(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            List<Message> messages = messageService.getInternalMessages(sessionId);
            List<MessageResponse> responses = messages.stream()
                .map(MessageResponse::new)
                .collect(Collectors.toList());

            return ResponseEntity.ok(new SuccessResponse("Internal messages retrieved", responses));
        } catch (Exception e) {
            log.error("Failed to retrieve internal messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve internal messages"));
        }
    }

    /**
     * Get public messages (user-visible only)
     */
    @GetMapping("/public")
    public ResponseEntity<?> getPublicMessages(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            List<Message> messages = messageService.getPublicMessages(sessionId);
            List<MessageResponse> responses = messages.stream()
                .map(MessageResponse::new)
                .collect(Collectors.toList());

            return ResponseEntity.ok(new SuccessResponse("Public messages retrieved", responses));
        } catch (Exception e) {
            log.error("Failed to retrieve public messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve public messages"));
        }
    }

    /**
     * Search messages by content keyword
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchMessages(
            @PathVariable Long sessionId,
            @RequestParam String keyword,
            Authentication authentication) {
        try {
            List<Message> messages = messageService.searchMessages(sessionId, keyword);
            List<MessageResponse> responses = messages.stream()
                .map(MessageResponse::new)
                .collect(Collectors.toList());

            return ResponseEntity.ok(new SuccessResponse("Messages found", responses));
        } catch (Exception e) {
            log.error("Failed to search messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to search messages"));
        }
    }

    /**
     * Get the latest message in a session
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestMessage(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            Message message = messageService.getLatestMessage(sessionId)
                .orElse(null);

            if (message == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(new SuccessResponse("Latest message retrieved", new MessageResponse(message)));
        } catch (Exception e) {
            log.error("Failed to retrieve latest message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve latest message"));
        }
    }

    /**
     * Delete a message
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable Long sessionId,
            @PathVariable Long id,
            Authentication authentication) {
        try {
            messageService.deleteMessage(id);
            log.info("Message deleted: {}", id);

            return ResponseEntity.ok(new SuccessResponse("Message deleted", null));
        } catch (Exception e) {
            log.error("Failed to delete message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to delete message"));
        }
    }

    /**
     * Delete all messages in a session
     */
    @DeleteMapping("/clear-all")
    public ResponseEntity<?> deleteAllMessages(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            messageService.deleteSessionMessages(sessionId);
            log.info("All messages cleared for session: {}", sessionId);

            return ResponseEntity.ok(new SuccessResponse("All messages cleared", null));
        } catch (Exception e) {
            log.error("Failed to clear messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to clear messages"));
        }
    }

    // Request/Response DTOs
    @Data
    public static class CreateMessageRequest {
        private String content;
        private SenderType senderType;
        private Boolean isInternal;
        private String intent;
        private JsonNode parameters;
    }

    @Data
    @AllArgsConstructor
    public static class MessageResponse {
        private Long id;
        private Long sessionId;
        private UUID senderId;
        private String senderType;
        private String content;
        private boolean isInternal;
        private String intent;
        private String createdAt;

        public MessageResponse(Message message) {
            this.id = message.getId();
            this.sessionId = message.getSessionId();
            this.senderId = message.getSenderId();
            this.senderType = message.getSenderType().toString();
            this.content = message.getContent();
            this.isInternal = message.getIsInternal();
            this.intent = message.getIntent();
            this.createdAt = message.getCreatedAt().toString();
        }
    }

    @Data
    @AllArgsConstructor
    public static class MessageCountResponse {
        private long count;
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

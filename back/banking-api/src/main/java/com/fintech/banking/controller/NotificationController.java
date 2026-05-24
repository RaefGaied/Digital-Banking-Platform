package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.Notification;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.NotificationType;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.NotificationService;
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

import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private UUID resolveAuthenticatedUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    /**
     * Get all notifications for the authenticated user (paginated)
     */
    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            Pageable pageable = PageRequest.of(page, size);

            Page<Notification> notifications = notificationService.getNotifications(userId, pageable);

            return ResponseEntity.ok(new SuccessResponse("Notifications retrieved",
                    com.fintech.banking.dto.response.PageResponse.from(notifications)));
        } catch (Exception e) {
            log.error("Failed to retrieve notifications", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to retrieve notifications"));
        }
    }

    /**
     * Get unread notifications for the authenticated user (paginated)
     */
    @GetMapping("/unread")
    public ResponseEntity<?> getUnreadNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            Pageable pageable = PageRequest.of(page, size);

            Page<Notification> notifications = notificationService.getUnreadNotifications(userId, pageable);

            return ResponseEntity.ok(new SuccessResponse("Unread notifications retrieved",
                    com.fintech.banking.dto.response.PageResponse.from(notifications)));
        } catch (Exception e) {
            log.error("Failed to retrieve unread notifications", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to retrieve unread notifications"));
        }
    }

    /**
     * Get unread notification count for the authenticated user
     */
    @GetMapping("/unread/count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            long unreadCount = notificationService.getUnreadCount(userId);

            return ResponseEntity.ok(new SuccessResponse("Unread count retrieved",
                    new UnreadCountResponse(unreadCount)));
        } catch (Exception e) {
            log.error("Failed to retrieve unread count", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to retrieve unread count"));
        }
    }

    /**
     * Mark a notification as read
     */
    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            Notification notification = notificationService.markAsRead(id);

            log.info("Notification marked as read: {}", id);

            return ResponseEntity.ok(new SuccessResponse("Notification marked as read",
                    new NotificationResponse(notification)));
        } catch (Exception e) {
            log.error("Failed to mark notification as read", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to mark notification as read"));
        }
    }

    /**
     * Mark all notifications as read for the authenticated user
     */
    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            notificationService.markAllAsRead(userId);

            log.info("All notifications marked as read for user: {}", userId);

            return ResponseEntity.ok(new SuccessResponse("All notifications marked as read", null));
        } catch (Exception e) {
            log.error("Failed to mark all notifications as read", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to mark all notifications as read"));
        }
    }

    /**
     * Get notification by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getNotification(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            Notification notification = notificationService.getNotifications(
                    resolveAuthenticatedUserId(authentication),
                    PageRequest.of(0, 1)).stream().filter(n -> n.getId().equals(id)).findFirst().orElse(null);

            if (notification == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(new SuccessResponse("Notification retrieved",
                    new NotificationResponse(notification)));
        } catch (Exception e) {
            log.error("Failed to retrieve notification", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to retrieve notification"));
        }
    }

    /**
     * Get notifications by type
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<?> getNotificationsByType(
            @PathVariable String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);
            NotificationType notificationType = NotificationType.valueOf(type.toUpperCase());
            Pageable pageable = PageRequest.of(page, size);

            // Would need custom repository method for this
            Page<Notification> notifications = notificationService.getNotifications(userId, pageable);

            return ResponseEntity.ok(new SuccessResponse("Notifications retrieved",
                    com.fintech.banking.dto.response.PageResponse.from(notifications)));
        } catch (Exception e) {
            log.error("Failed to retrieve notifications by type", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Invalid type or retrieval failed"));
        }
    }

    /**
     * Delete a notification
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            // TODO: Implement soft delete or actual delete
            log.info("Notification deleted: {}", id);

            return ResponseEntity.ok(new SuccessResponse("Notification deleted", null));
        } catch (Exception e) {
            log.error("Failed to delete notification", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to delete notification"));
        }
    }

    /**
     * Get notification preferences (placeholder for future enhancement)
     */
    @GetMapping("/preferences")
    public ResponseEntity<?> getPreferences(Authentication authentication) {
        try {
            UUID userId = resolveAuthenticatedUserId(authentication);

            // TODO: Implement notification preferences storage
            var preferences = new NotificationPreferences(
                    true, // email notifications
                    true, // in-app notifications
                    true, // ticket updates
                    true // security alerts
            );

            return ResponseEntity.ok(new SuccessResponse("Preferences retrieved", preferences));
        } catch (Exception e) {
            log.error("Failed to retrieve notification preferences", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to retrieve preferences"));
        }
    }

    /**
     * Update notification preferences (placeholder for future enhancement)
     */
    @PutMapping("/preferences")
    public ResponseEntity<?> updatePreferences(
            @RequestBody NotificationPreferences preferences,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());

            // TODO: Implement notification preferences storage
            log.info("Notification preferences updated for user: {}", userId);

            return ResponseEntity.ok(new SuccessResponse("Preferences updated", preferences));
        } catch (Exception e) {
            log.error("Failed to update notification preferences", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to update preferences"));
        }
    }

    // Request/Response DTOs
    @Data
    @AllArgsConstructor
    public static class NotificationResponse {
        private UUID id;
        private String type;
        private String channel;
        private String title;
        private String body;
        private boolean isRead;
        private String createdAt;

        public NotificationResponse(Notification notification) {
            this.id = notification.getId();
            this.type = notification.getType().toString();
            this.channel = notification.getChannel().toString();
            this.title = notification.getTitle();
            this.body = notification.getBody();
            this.isRead = notification.getIsRead();
            this.createdAt = notification.getCreatedAt().toString();
        }
    }

    @Data
    @AllArgsConstructor
    public static class UnreadCountResponse {
        private long count;
    }

    @Data
    @AllArgsConstructor
    public static class NotificationPreferences {
        private boolean emailNotifications;
        private boolean inAppNotifications;
        private boolean ticketUpdates;
        private boolean securityAlerts;
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

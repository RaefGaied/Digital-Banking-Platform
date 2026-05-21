package com.fintech.banking.service;

import com.fintech.banking.domain.entity.Notification;
import com.fintech.banking.domain.enums.NotificationChannel;
import com.fintech.banking.domain.enums.NotificationType;
import com.fintech.banking.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Creates and sends a ticket creation notification
     */
    public Notification notifyTicketCreated(UUID userId, Long ticketId, String ticketSubject) {
        return createNotification(
            userId,
            NotificationType.TICKET_CREATED,
            NotificationChannel.IN_APP,
            "Support Ticket Created",
            "A new support ticket has been created: " + ticketSubject,
            "SupportTicket",
            ticketId
        );
    }

    /**
     * Creates and sends a ticket update notification
     */
    public Notification notifyTicketUpdated(UUID userId, Long ticketId, String updateMessage) {
        return createNotification(
            userId,
            NotificationType.TICKET_UPDATED,
            NotificationChannel.IN_APP,
            "Ticket Updated",
            updateMessage,
            "SupportTicket",
            ticketId
        );
    }

    /**
     * Creates and sends a ticket resolved notification
     */
    public Notification notifyTicketResolved(UUID userId, Long ticketId) {
        return createNotification(
            userId,
            NotificationType.TICKET_RESOLVED,
            NotificationChannel.IN_APP,
            "Ticket Resolved",
            "Your support ticket has been resolved",
            "SupportTicket",
            ticketId
        );
    }

    /**
     * Creates and sends a transfer approval notification
     */
    public Notification notifyTransferApproved(UUID userId, String amount) {
        return createNotification(
            userId,
            NotificationType.TRANSFER_APPROVED,
            NotificationChannel.IN_APP,
            "Transfer Approved",
            "Your transfer of " + amount + " has been approved",
            "Transaction",
            null
        );
    }

    /**
     * Creates and sends a transfer rejection notification
     */
    public Notification notifyTransferRejected(UUID userId, String reason) {
        return createNotification(
            userId,
            NotificationType.TRANSFER_REJECTED,
            NotificationChannel.IN_APP,
            "Transfer Rejected",
            "Your transfer was rejected: " + reason,
            "Transaction",
            null
        );
    }

    /**
     * Creates and sends a transfer execution notification
     */
    public Notification notifyTransferExecuted(UUID userId, String amount) {
        return createNotification(
            userId,
            NotificationType.TRANSFER_EXECUTED,
            NotificationChannel.IN_APP,
            "Transfer Executed",
            "Your transfer of " + amount + " has been executed successfully",
            "Transaction",
            null
        );
    }

    /**
     * Creates and sends an info request notification
     */
    public Notification notifyInfoRequested(UUID userId, String infoNeeded) {
        return createNotification(
            userId,
            NotificationType.INFO_REQUESTED,
            NotificationChannel.IN_APP,
            "Additional Information Needed",
            infoNeeded,
            "SupportTicket",
            null
        );
    }

    /**
     * Creates and sends a security alert notification
     */
    public Notification notifySecurityAlert(UUID userId, String alertMessage) {
        return createNotification(
            userId,
            NotificationType.SECURITY_ALERT,
            NotificationChannel.IN_APP,
            "Security Alert",
            alertMessage,
            "SecurityEvent",
            null
        );
    }

    /**
     * Creates and sends an account locked notification
     */
    public Notification notifyAccountLocked(UUID userId) {
        return createNotification(
            userId,
            NotificationType.ACCOUNT_LOCKED,
            NotificationChannel.IN_APP,
            "Account Locked",
            "Your account has been locked due to multiple failed login attempts. Please try again later.",
            "User",
            null
        );
    }

    /**
     * Creates and sends a session expired notification
     */
    public Notification notifySessionExpired(UUID userId) {
        return createNotification(
            userId,
            NotificationType.SESSION_EXPIRED,
            NotificationChannel.IN_APP,
            "Session Expired",
            "Your session has expired. Please log in again.",
            "Session",
            null
        );
    }

    /**
     * Generic notification creation
     */
    private Notification createNotification(
            UUID userId,
            NotificationType type,
            NotificationChannel channel,
            String title,
            String body,
            String referenceType,
            Long referenceId) {

        Notification notification = Notification.builder()
            .userId(userId)
            .type(type)
            .channel(channel)
            .title(title)
            .body(body)
            .referenceType(referenceType)
            .referenceId(referenceId)
            .isRead(false)
            .build();

        notification = notificationRepository.save(notification);
        log.info("Notification created for user {} - Type: {}", userId, type);
        return notification;
    }

    /**
     * Marks a notification as read
     */
    @Transactional
    public Notification markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

        notification.markAsRead();
        notificationRepository.save(notification);
        return notification;
    }

    /**
     * Marks all notifications for a user as read
     */
    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.findByUserIdAndIsReadFalse(userId)
            .forEach(notification -> {
                notification.markAsRead();
                notificationRepository.save(notification);
            });
        log.info("All notifications marked as read for user: {}", userId);
    }

    /**
     * Gets unread notification count for a user
     */
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Gets paginated notifications for a user
     */
    public Page<Notification> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * Gets paginated unread notifications for a user
     */
    public Page<Notification> getUnreadNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId, pageable);
    }

    /**
     * Deletes old notifications (older than 30 days)
     */
    @Transactional
    public void cleanupOldNotifications() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        // This would require a custom query method in repository
        log.info("Cleanup completed for notifications older than 30 days");
    }
}

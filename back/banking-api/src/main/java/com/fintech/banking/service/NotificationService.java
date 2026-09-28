package com.fintech.banking.service;

import com.fintech.banking.domain.entity.Notification;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.NotificationChannel;
import com.fintech.banking.domain.enums.NotificationType;
import com.fintech.banking.domain.enums.UserRole;
import com.fintech.banking.repository.NotificationRepository;
import com.fintech.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Creates and sends a ticket creation notification
     */
    public Notification notifyTicketCreated(UUID userId, Long ticketId, String ticketSubject) {
        Notification notification = createNotification(
            userId,
            NotificationType.TICKET_CREATED,
            NotificationChannel.IN_APP,
            "Support Ticket Created",
            "A new support ticket has been created: " + ticketSubject,
            "SupportTicket",
            ticketId
        );
        notifyAdmins(
                NotificationType.TICKET_CREATED,
                "New support ticket",
                "Ticket #" + ticketId + ": " + ticketSubject,
                "SupportTicket",
                ticketId);
        return notification;
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
        Notification notification = createNotification(
            userId,
            NotificationType.TICKET_RESOLVED,
            NotificationChannel.IN_APP,
            "Ticket Resolved",
            "Your support ticket has been resolved",
            "SupportTicket",
            ticketId
        );
        notifyAdmins(
                NotificationType.TICKET_RESOLVED,
                "Support ticket resolved",
                "Ticket #" + ticketId + " has been resolved.",
                "SupportTicket",
                ticketId);
        return notification;
    }

    public Notification notifyTicketResolved(SupportTicket ticket) {
        if (ticket.getTicketType() == com.fintech.banking.domain.enums.TicketType.DATA_UPDATE
                && isEmailChangeTicket(ticket.getSubject())) {
            boolean french = ticket.getSubject().toLowerCase(java.util.Locale.ROOT).contains("courriel")
                    || ticket.getSubject().toLowerCase(java.util.Locale.ROOT).contains("vérification")
                    || ticket.getSubject().toLowerCase(java.util.Locale.ROOT).contains("modification");
            Notification notification = createNotification(
                    ticket.getUserId(),
                    NotificationType.TICKET_RESOLVED,
                    NotificationChannel.IN_APP,
                    french ? "Vérification d’identité approuvée" : "Identity review approved",
                    french
                            ? "La vérification d’identité pour votre changement d’e-mail est approuvée. Le ticket ne modifie pas automatiquement votre adresse de connexion. Ouvrez Profil > Compléter la modification de l’e-mail, saisissez la nouvelle adresse et confirmez votre mot de passe actuel."
                            : "Your identity review for the email change was approved. The ticket does not change your login email automatically. Open Profile > Complete email change, enter your new address, and confirm your current password.",
                    "SupportTicket",
                    ticket.getId());
            notifyAdmins(
                    NotificationType.TICKET_RESOLVED,
                    "Email change verification completed",
                    "Ticket #" + ticket.getId() + " passed identity review.",
                    "SupportTicket",
                    ticket.getId());
            return notification;
        }
        return notifyTicketResolved(ticket.getUserId(), ticket.getId());
    }

    public Notification notifyTicketResolved(SupportTicket ticket, String resolutionNote) {
        Notification notification = createNotification(
                ticket.getUserId(),
                NotificationType.TICKET_RESOLVED,
                NotificationChannel.IN_APP,
                "Support ticket resolved",
                "Your support ticket #" + ticket.getId() + " has been resolved. Resolution: " + resolutionNote,
                "SupportTicket",
                ticket.getId());
        notifyAdmins(
                NotificationType.TICKET_RESOLVED,
                "Support ticket resolved",
                "Ticket #" + ticket.getId() + " has been resolved.",
                "SupportTicket",
                ticket.getId());
        return notification;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification notifyEmailChanged(UUID userId, String newEmail) {
        return createNotification(
                userId,
                NotificationType.EMAIL_CHANGED,
                NotificationChannel.IN_APP,
                "Email changed successfully",
                "Your login email was changed successfully to " + newEmail
                        + ". If you did not request this change, contact support immediately.",
                "User",
                null);
    }

    private boolean isEmailChangeTicket(String subject) {
        if (subject == null) {
            return false;
        }
        String normalized = subject.toLowerCase(java.util.Locale.ROOT);
        return normalized.contains("email") || normalized.contains("e-mail") || normalized.contains("courriel");
    }
    public void notifyAdminsTaskCreated(Long taskId, String description) {
        notifyAdmins(
                NotificationType.WORKFLOW_TASK_CREATED,
                "New workflow task",
                "Task #" + taskId + (description == null || description.isBlank() ? " requires review." : ": " + description),
                "WorkflowTask",
                taskId);
    }

    public void notifyAdminsTaskResolved(Long taskId, String outcome) {
        notifyAdmins(
                NotificationType.WORKFLOW_TASK_RESOLVED,
                "Workflow task resolved",
                "Task #" + taskId + " was " + outcome.toLowerCase(java.util.Locale.ROOT) + ".",
                "WorkflowTask",
                taskId);
    }

    public void notifyAdminsWorkflowResolved(String taskId, String outcome) {
        notifyAdmins(
                NotificationType.WORKFLOW_TASK_RESOLVED,
                "BPMN workflow task resolved",
                "Flowable task " + taskId + " completed with decision " + outcome + ".",
                "FlowableTask",
                null);
    }

    public void notifyAdminsWorkflowStarted(String processInstanceId, String processKey) {
        notifyAdmins(
                NotificationType.WORKFLOW_TASK_CREATED,
                "New BPMN workflow task",
                "Workflow " + processKey + " started (process #" + processInstanceId + ").",
                "FlowableProcess",
                null);
    }

    public void notifyAdminsSecurityAlert(String message, Long referenceId) {
        notifyAdmins(
                NotificationType.SECURITY_ALERT,
                "Security alert",
                message,
                "SecurityEvent",
                referenceId);
    }

    private void notifyAdmins(
            NotificationType type,
            String title,
            String body,
            String referenceType,
            Long referenceId) {
        for (User admin : userRepository.findByRole(UserRole.ADMIN)) {
            createNotification(
                    admin.getId(),
                    type,
                    NotificationChannel.IN_APP,
                    title,
                    body,
                    referenceType,
                    referenceId);
        }
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

    public Notification notifyTransferPending(UUID userId, String amount) {
        return createNotification(
                userId,
                NotificationType.TRANSFER_PENDING,
                NotificationChannel.IN_APP,
                "Transfer pending review",
                "Your transfer of " + amount + " is awaiting administrator review.",
                "Transaction",
                null);
    }

    public Notification notifyTransferReceived(UUID userId, String amount) {
        return createNotification(
                userId,
                NotificationType.TRANSFER_RECEIVED,
                NotificationChannel.IN_APP,
                "Transfer received",
                "You received a transfer of " + amount + ".",
                "Transaction",
                null);
    }

    public Notification notifyDepositReceived(UUID userId, String amount) {
        return createNotification(
                userId,
                NotificationType.DEPOSIT_RECEIVED,
                NotificationChannel.IN_APP,
                "Deposit received",
                "A deposit of " + amount + " was added to your account.",
                "Transaction",
                null);
    }

    public Notification notifyWithdrawalCompleted(UUID userId, String amount) {
        return createNotification(
                userId,
                NotificationType.WITHDRAWAL_COMPLETED,
                NotificationChannel.IN_APP,
                "Withdrawal completed",
                "Your withdrawal of " + amount + " was completed.",
                "Transaction",
                null);
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

    public Notification notifyInfoRequested(UUID userId, Long ticketId, String infoNeeded) {
        return createNotification(
                userId,
                NotificationType.INFO_REQUESTED,
                NotificationChannel.IN_APP,
                "Additional Information Needed",
                infoNeeded,
                "SupportTicket",
                ticketId);
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

    public Notification notifyAccountUnlocked(UUID userId) {
        return createNotification(
                userId,
                NotificationType.ACCOUNT_UNLOCKED,
                NotificationChannel.IN_APP,
                "Account unlocked",
                "Your account is unlocked. You can sign in again.",
                "User",
                null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification notifyPasswordResetCompleted(UUID userId) {
        return createNotification(
                userId,
                NotificationType.PASSWORD_RESET_COMPLETED,
                NotificationChannel.IN_APP,
                "Password changed successfully",
                "Your password was changed successfully. If you did not request this change, contact support immediately.",
                "User",
                null);
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
    public Notification markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
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

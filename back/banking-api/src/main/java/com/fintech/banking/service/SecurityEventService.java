package com.fintech.banking.service;

import com.fintech.banking.domain.entity.*;
import com.fintech.banking.domain.enums.SecurityEventType;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SecurityEventService {

    private final SecurityEventRepository securityEventRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;

    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 30;
    private static final int BRUTE_FORCE_CHECK_MINUTES = 5;
    private static final int BRUTE_FORCE_THRESHOLD = 3;

    /**
     * Detects and handles token reuse (critical security event)
     * Business Rule: REUSE_DETECTED → revoke all RefreshTokens, set User.status =
     * BLOCKED
     */
    @Transactional
    public void handleTokenReuse(User user, String ipAddress, String deviceId) {
        log.warn("Token reuse detected for user: {}", user.getId());

        // Create security event
        SecurityEvent event = SecurityEvent.builder()
                .userId(user.getId())
                .type(SecurityEventType.REUSE_DETECTED)
                .ipAddress(ipAddress)
                .deviceId(deviceId)
                .resolved(false)
                .build();
        securityEventRepository.save(event);

        // Revoke all refresh tokens
        List<RefreshToken> tokens = refreshTokenRepository.findByUserId(user.getId());
        tokens.forEach(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });

        // Block user account
        user.setStatus(UserStatus.BLOCKED);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        // Create audit log
        createAuditLog(user.getId(), "SECURITY_EVENT", "Token reuse detected - account blocked",
                "SECURITY_EVENT", user.getId().toString(), null);

        // Send notification
        notificationService.notifySecurityAlert(user.getId(),
                "Your account has been blocked due to unauthorized access attempt");
        notificationService.notifyAdminsSecurityAlert(
                "Token reuse detected for user " + user.getEmail() + "; the account was blocked.",
                null);
    }

    /**
     * Records failed login attempt and locks account if threshold exceeded
     * Business Rule: Failed login > 5 → User.status = BLOCKED, lockedUntil = now +
     * 30min
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedLoginAttempt(User user, String ipAddress) {
        if (user.getStatus() == UserStatus.BLOCKED) {
            return;
        }

        // Admins are never locked out so the back office stays reachable; failures are still audited.
        if (user.getRole() == com.fintech.banking.domain.enums.UserRole.ADMIN) {
            createAuditLog(user.getId(), "LOGIN_FAILURE", "Failed admin login attempt (no lockout applied)",
                    "User", user.getId().toString(), null);
            return;
        }

        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);

        if (user.getFailedLoginAttempts() >= MAX_FAILED_LOGIN_ATTEMPTS) {
            user.setStatus(UserStatus.BLOCKED);
            user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_DURATION_MINUTES));

            log.warn("User account locked due to failed login attempts: {}", user.getId());

            // Create security event
            SecurityEvent event = SecurityEvent.builder()
                    .userId(user.getId())
                    .type(SecurityEventType.ACCOUNT_LOCKED)
                    .ipAddress(ipAddress)
                    .resolved(false)
                    .build();
            securityEventRepository.save(event);

            // Send notification
            notificationService.notifyAccountLocked(user.getId());
            // Keep the detailed security alert for clients that already consume this type.
            notificationService.notifySecurityAlert(user.getId(),
                    "Your account has been locked due to multiple failed login attempts. Try again in 30 minutes.");

            // Also notify all admins so they see a small alert in the admin UI
            String adminMessage = "User " + user.getEmail() + " was locked due to failed logins";
            notificationService.notifyAdminsSecurityAlert(adminMessage, null);
        }

        userRepository.save(user);

        // Create audit log
        createAuditLog(user.getId(), "LOGIN_FAILURE", "Failed login attempt", "User", user.getId().toString(), null);
    }

    /**
     * Detects brute force attacks on login endpoint
     */
    @Transactional
    public boolean isBruteForceAttack(String ipAddress) {
        LocalDateTime recentTime = LocalDateTime.now().minusMinutes(BRUTE_FORCE_CHECK_MINUTES);

        // Count failed attempts from this IP in the last 5 minutes
        long failedAttempts = securityEventRepository.countByUserIdAndTypeAndTimestampAfter(
                null, SecurityEventType.BRUTE_FORCE, recentTime);

        return failedAttempts >= BRUTE_FORCE_THRESHOLD;
    }

    /**
     * Handles suspicious activity detection
     */
    @Transactional
    public void recordSuspiciousActivity(UUID userId, String ipAddress, String deviceId, String reason) {
        SecurityEvent event = SecurityEvent.builder()
                .userId(userId)
                .type(SecurityEventType.SUSPICIOUS_ACTIVITY)
                .ipAddress(ipAddress)
                .deviceId(deviceId)
                .resolved(false)
                .build();
        securityEventRepository.save(event);

        createAuditLog(userId, "SUSPICIOUS_ACTIVITY", reason, "User", userId.toString(), null);
        notificationService.notifyAdminsSecurityAlert(
                "Suspicious activity for user " + userId + ": " + reason,
                null);
    }

    /**
     * Unlocks a user account
     */
    @Transactional
    public void unlockUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        log.info("User account unlocked: {}", userId);
    }

    private void createAuditLog(UUID userId, String action, String details,
            String entity, String entityId, UUID sessionId) {
        AuditLog log = AuditLog.builder()
                .userEmail("system")
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .details(details)
                .status("SECURITY_EVENT")
                .sessionId(sessionId)
                .build();
        auditLogRepository.save(log);
    }
}

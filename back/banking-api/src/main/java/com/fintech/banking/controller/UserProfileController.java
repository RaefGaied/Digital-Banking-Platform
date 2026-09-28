package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.TokenService;
import com.fintech.banking.service.EmailService;
import com.fintech.banking.service.NotificationService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.time.LocalDateTime;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserRepository userRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /**
     * Get current user profile
     */
    @GetMapping
    public ResponseEntity<?> getCurrentUserProfile(
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(new SuccessResponse("Profile retrieved", new UserProfileResponse(user)));
        } catch (Exception e) {
            log.error("Failed to retrieve user profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve profile"));
        }
    }

    /**
     * Update user profile
     */
    @PutMapping
    public ResponseEntity<?> updateProfile(
            @RequestBody UpdateProfileRequest request,
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
            UUID userId = user.getId();

            if (request.getName() != null && !request.getName().isEmpty()) {
                user.setName(request.getName());
            }

            if (request.getEmail() != null && !request.getEmail().isEmpty()
                    && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Email changes require an approved email-verification ticket. Use the email-change flow."));
            }

            user = userRepository.save(user);
            log.info("User profile updated: {}", userId);

            return ResponseEntity.ok(new SuccessResponse("Profile updated", new UserProfileResponse(user)));
        } catch (Exception e) {
            log.error("Failed to update user profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to update profile: " + e.getMessage()));
        }
    }

    @PutMapping("/email")
    @Transactional
    public ResponseEntity<?> changeEmail(
            @RequestBody ChangeEmailRequest request,
            org.springframework.security.core.Authentication authentication) {
        try {
            String authenticatedEmail = authentication.getName();
            User user = userRepository.findByEmail(authenticatedEmail)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            if (request.getCurrentPassword() == null
                    || !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Current password is incorrect"));
            }

            String newEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
            if (!newEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Enter a valid email address"));
            }
            if (newEmail.equalsIgnoreCase(user.getEmail())) {
                return ResponseEntity.badRequest().body(new ErrorResponse("The new email must be different from your current email"));
            }
            if (userRepository.existsByEmail(newEmail)) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Email already in use"));
            }

            var approvedEmailTickets = supportTicketRepository
                    .findByUserIdAndTicketTypeAndStatus(user.getId(), TicketType.DATA_UPDATE, TicketStatus.RESOLVED)
                    .stream()
                    .filter(ticket -> isEmailChangeTicket(ticket.getSubject(), ticket.getDescription()))
                    .toList();
            if (approvedEmailTickets.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("An approved email-verification ticket is required before changing your email"));
            }

            user.setEmail(newEmail);
            userRepository.save(user);
            approvedEmailTickets.forEach(ticket -> {
                ticket.setStatus(TicketStatus.CLOSED);
                ticket.setClosedAt(LocalDateTime.now());
                supportTicketRepository.save(ticket);
            });
            try {
                notificationService.notifyEmailChanged(user.getId(), newEmail);
            } catch (RuntimeException notificationFailure) {
                log.error("Email changed but in-app notification could not be created for user {}",
                        user.getId(), notificationFailure);
            }
            try {
                emailService.sendEmailChangedConfirmation(newEmail, user.getName());
            } catch (RuntimeException emailFailure) {
                log.error("Email changed but confirmation email could not be queued for user {}",
                        user.getId(), emailFailure);
            }
            log.info("User email changed after approved identity review: {}", user.getId());
            return ResponseEntity.ok(new SuccessResponse(
                    "Email updated. Sign in again using your new email address.",
                    new UserProfileResponse(user)));
        } catch (Exception e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            log.error("Failed to change user email", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to change email"));
        }
    }

    private boolean isEmailChangeTicket(String subject, String description) {
        String searchableText = ((subject == null ? "" : subject) + " "
                + (description == null ? "" : description)).toLowerCase(java.util.Locale.ROOT);
        if (searchableText.isBlank()) {
            return false;
        }
        return searchableText.contains("email")
                || searchableText.contains("e-mail")
                || searchableText.contains("courriel")
                || searchableText.contains("adresse e")
                || searchableText.contains("modifier mon email")
                || searchableText.contains("modifer mon email");
    }

    /**
     * Change password
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request,
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
            UUID userId = user.getId();

            // Verify current password
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Current password is incorrect"));
            }

            // Set new password
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            user = userRepository.save(user);

            // Revoke all tokens on password change for security
            tokenService.revokeAllTokensForUser(userId, "Password changed");

            log.info("Password changed for user: {}", userId);

            return ResponseEntity.ok(new SuccessResponse("Password changed successfully", null));
        } catch (Exception e) {
            log.error("Failed to change password", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to change password: " + e.getMessage()));
        }
    }

    /**
     * Get user status
     */
    @GetMapping("/status")
    public ResponseEntity<?> getUserStatus(
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            UUID userId = user != null ? user.getId() : null;

            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(new SuccessResponse("Status retrieved", 
                new UserStatusResponse(user.getStatus().toString(), user.getFailedLoginAttempts())));
        } catch (Exception e) {
            log.error("Failed to retrieve user status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve status"));
        }
    }

    /**
     * Update user device fingerprint (for security tracking)
     */
    @PostMapping("/device-fingerprint")
    public ResponseEntity<?> updateDeviceFingerprint(
            @RequestBody DeviceFingerprintRequest request,
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
            UUID userId = user.getId();

            user.setDeviceFingerprint(request.getFingerprint());
            user = userRepository.save(user);

            log.info("Device fingerprint updated for user: {}", userId);

            return ResponseEntity.ok(new SuccessResponse("Device fingerprint updated", null));
        } catch (Exception e) {
            log.error("Failed to update device fingerprint", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to update device fingerprint"));
        }
    }

    /**
     * Request account deletion (placeholder)
     */
    @PostMapping("/delete-account")
    public ResponseEntity<?> deleteAccount(
            @RequestBody PasswordVerificationRequest request,
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
            UUID userId = user.getId();

            // Verify password
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Password is incorrect"));
            }

            // TODO: Implement account deletion logic (soft delete or scheduled hard delete)
            log.warn("Account deletion requested by user: {}", userId);

            return ResponseEntity.ok(new SuccessResponse("Account deletion requested. We will process this within 30 days.", null));
        } catch (Exception e) {
            log.error("Failed to request account deletion", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to delete account"));
        }
    }

    // Request/Response DTOs
    @Data
    public static class UpdateProfileRequest {
        private String name;
        private String email;
    }

    @Data
    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;
        private String confirmPassword;
    }

    @Data
    public static class ChangeEmailRequest {
        private String email;
        private String currentPassword;
    }

    @Data
    public static class DeviceFingerprintRequest {
        private String fingerprint;
    }

    @Data
    public static class PasswordVerificationRequest {
        private String password;
    }

    @Data
    @AllArgsConstructor
    public static class UserProfileResponse {
        private UUID id;
        private String name;
        private String email;
        private String status;
        private String role;
        private String createdAt;

        public UserProfileResponse(User user) {
            this.id = user.getId();
            this.name = user.getName();
            this.email = user.getEmail();
            this.status = user.getStatus().toString();
            this.role = user.getRole().toString();
            this.createdAt = user.getCreatedAt().toString();
        }
    }

    @Data
    @AllArgsConstructor
    public static class UserStatusResponse {
        private String status;
        private int failedLoginAttempts;
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

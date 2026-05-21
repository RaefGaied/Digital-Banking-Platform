package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.TokenService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Get current user profile
     */
    @GetMapping
    public ResponseEntity<?> getCurrentUserProfile(
            org.springframework.security.core.Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());

            User user = userRepository.findById(userId)
                .orElse(null);

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
            UUID userId = UUID.fromString(authentication.getName());

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

            if (request.getName() != null && !request.getName().isEmpty()) {
                user.setName(request.getName());
            }

            // Email cannot be changed if already in use
            if (request.getEmail() != null && !request.getEmail().isEmpty() && !request.getEmail().equals(user.getEmail())) {
                if (userRepository.existsByEmail(request.getEmail())) {
                    return ResponseEntity.badRequest().body(new ErrorResponse("Email already in use"));
                }
                user.setEmail(request.getEmail());
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

    /**
     * Change password
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request,
            org.springframework.security.core.Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

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
            UUID userId = UUID.fromString(authentication.getName());

            User user = userRepository.findById(userId)
                .orElse(null);

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
            UUID userId = UUID.fromString(authentication.getName());

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

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
            UUID userId = UUID.fromString(authentication.getName());

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

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

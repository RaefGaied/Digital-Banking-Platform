package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.User;
import com.fintech.banking.dto.request.Enable2faRequest;
import com.fintech.banking.dto.response.Setup2faResponse;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.AuditLogService;
import com.fintech.banking.util.TotpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @GetMapping("/2fa/setup")
    public ResponseEntity<Setup2faResponse> setup2fa() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));

        String secret = user.getTwoFactorSecret();
        if (secret == null || secret.isEmpty()) {
            secret = TotpUtil.generateSecret();
            user.setTwoFactorSecret(secret);
            userRepository.save(user);
        }

        try {
            String label = java.net.URLEncoder.encode("FinBank:" + user.getEmail(),
                    java.nio.charset.StandardCharsets.UTF_8.toString());
            String issuer = java.net.URLEncoder.encode("FinBank", java.nio.charset.StandardCharsets.UTF_8.toString());
            // include algorithm, digits and period for compatibility
            String otpauth = String.format("otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                    label, secret, issuer);

            return ResponseEntity.ok(new Setup2faResponse(secret, otpauth));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new Setup2faResponse(secret, ""));
        }
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<Void> enable2fa(@RequestBody Enable2faRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));

        String secret = user.getTwoFactorSecret();
        if (secret == null || secret.isEmpty()) {
            throw new IllegalArgumentException("2FA not initialized for user");
        }

        if (!TotpUtil.verifyTotp(secret, request.getCode())) {
            auditLogService.logFailure(user.getEmail(), "2FA_ENABLE", "Invalid 2FA code", "unknown");
            throw new IllegalArgumentException("Invalid 2FA code");
        }

        user.setTwoFactorEnabled(true);
        userRepository.save(user);

        auditLogService.log(user.getEmail(), "2FA_ENABLED", "User", user.getId().toString(), "2FA enabled", "unknown");

        return ResponseEntity.noContent().build();
    }
}

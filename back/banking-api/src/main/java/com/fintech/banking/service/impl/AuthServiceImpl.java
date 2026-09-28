package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.RefreshToken;
import com.fintech.banking.domain.entity.PasswordResetToken;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.dto.request.LoginRequest;
import com.fintech.banking.dto.request.RefreshTokenRequest;
import com.fintech.banking.dto.request.RegisterRequest;
import com.fintech.banking.dto.request.ForgotPasswordRequest;
import com.fintech.banking.dto.request.ResetPasswordRequest;
import com.fintech.banking.dto.response.LoginResponse;
import com.fintech.banking.dto.response.ClientResponse;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.RefreshTokenRepository;
import com.fintech.banking.repository.PasswordResetTokenRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.security.service.JwtService;
import com.fintech.banking.service.AuditLogService;
import com.fintech.banking.service.AuthService;
import com.fintech.banking.service.SecurityEventService;
import com.fintech.banking.service.EmailService;
import com.fintech.banking.service.NotificationService;
import com.fintech.banking.util.TotpUtil;
import com.fintech.banking.exception.AccountLockedException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final AuditLogService auditLogService;
    private final SecurityEventService securityEventService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    private String getClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String xff = request.getHeader("X-Forwarded-For");
                return xff != null ? xff.split(",")[0].trim() : request.getRemoteAddr();
            }
        } catch (Exception ignored) {
        }
        return "unknown";
    }

    private ClientResponse buildTokenResponse(User user) {
        String accessToken = jwtService.generateToken(user);
        String refreshTokenValue = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenValue)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();

        refreshTokenRepository.save(refreshToken);

        return ClientResponse.builder()
                .uuid(user.getId())
                .name(user.getName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .accessToken(accessToken)
                .refreshToken(refreshTokenValue)
                .tokenType("Bearer")
                .expiresIn(900000L)
                .build();
    }

    @Override
    @Transactional
    public ClientResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            auditLogService.logFailure(request.getEmail(), "REGISTER", "Email already registered", getClientIp());
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        Account account = Account.builder()
                .user(user)
                .agency("0001")
                .number(generateAccountNumber())
                .build();

        accountRepository.save(account);

        auditLogService.log(user.getEmail(), "REGISTER", "User", user.getId().toString(), "New user registered",
                getClientIp());
        emailService.sendWelcome(user.getEmail(), user.getName());

        return buildTokenResponse(user);
    }

    @Override
    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail().trim()).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUserId(user.getId());
            String rawToken = generateResetToken();
            passwordResetTokenRepository.save(PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(hashToken(rawToken))
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .build());
            emailService.sendPasswordReset(user.getEmail(), user.getName(), rawToken);
        });
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(hashToken(request.getToken()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));
        if (!resetToken.isValid()) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);
        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);
        refreshTokenRepository.revokeAllByUserId(user.getId());
        auditLogService.log(user.getEmail(), "PASSWORD_RESET", "User", user.getId().toString(),
                "Password reset completed", getClientIp());
        try {
            notificationService.notifyPasswordResetCompleted(user.getId());
        } catch (RuntimeException notificationFailure) {
            // A notification outage must not undo a completed password reset.
            log.error("Password reset completed but in-app notification failed for user {}",
                    user.getId(), notificationFailure);
        }
        emailService.sendPasswordResetConfirmation(user.getEmail(), user.getName());
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User existingUser = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (existingUser != null && existingUser.getStatus() == com.fintech.banking.domain.enums.UserStatus.BLOCKED
                && existingUser.getLockedUntil() != null
                && LocalDateTime.now().isAfter(existingUser.getLockedUntil())) {
            existingUser.setStatus(com.fintech.banking.domain.enums.UserStatus.ACTIVE);
            existingUser.setFailedLoginAttempts(0);
            existingUser.setLockedUntil(null);
            userRepository.save(existingUser);
            try {
                notificationService.notifyAccountUnlocked(existingUser.getId());
            } catch (RuntimeException notificationFailure) {
                log.warn("Account unlocked but notification failed for user {}",
                        existingUser.getId(), notificationFailure);
            }
        }

        if (existingUser != null && !existingUser.isAccountNonLocked()) {
            throw new AccountLockedException(existingUser.getLockedUntil());
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (AuthenticationException e) {
            if (e instanceof BadCredentialsException) {
                User user = userRepository.findByEmail(request.getEmail()).orElse(null);
                if (user != null) {
                    securityEventService.recordFailedLoginAttempt(user, getClientIp());
                    User refreshedUser = userRepository.findByEmail(request.getEmail()).orElse(user);
                    if (!refreshedUser.isAccountNonLocked()) {
                        throw new AccountLockedException(refreshedUser.getLockedUntil());
                    }
                }
            }
            auditLogService.logFailure(request.getEmail(), "LOGIN", "Invalid credentials", getClientIp());
            throw e;
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Check if 2FA is enabled for the user
        if (user.getTwoFactorEnabled() != null && user.getTwoFactorEnabled()) {
            // Generate a temporary token valid for 5 minutes for 2FA verification
            String tempToken = jwtService.generateTemporaryToken(user);

            // Generate a new secret if one doesn't exist
            String secret = user.getTwoFactorSecret();
            if (secret == null || secret.isEmpty()) {
                secret = TotpUtil.generateSecret();
                user.setTwoFactorSecret(secret);
                userRepository.save(user);
            }

            auditLogService.log(user.getEmail(), "LOGIN_2FA_REQUIRED", "User", user.getId().toString(), "2FA required",
                    getClientIp());

            return new LoginResponse(true, null, tempToken);
        }

        // If 2FA is not enabled or already verified, proceed with normal login
        refreshTokenRepository.revokeAllByUserId(user.getId());

        auditLogService.log(user.getEmail(), "LOGIN", "User", user.getId().toString(), "Login successful",
                getClientIp());

        return new LoginResponse(false, buildTokenResponse(user), null);
    }

    @Override
    @Transactional
    public ClientResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (!refreshToken.isValid()) {
            auditLogService.logFailure(refreshToken.getUser().getEmail(), "REFRESH_TOKEN", "Token expired or revoked",
                    getClientIp());
            throw new IllegalArgumentException("Refresh token expired or revoked");
        }

        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        User user = refreshToken.getUser();
        auditLogService.log(user.getEmail(), "REFRESH_TOKEN", "User", user.getId().toString(), "Token refreshed",
                getClientIp());

        return buildTokenResponse(user);
    }

    @Override
    @Transactional
    public void logout(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        auditLogService.log(refreshToken.getUser().getEmail(), "LOGOUT", "User",
                refreshToken.getUser().getId().toString(), "Logout successful", getClientIp());
    }

    @Override
    @Transactional
    public ClientResponse verify2fa(String tempToken, int code) {
        // Extract user from temp token
        String email = jwtService.extractUsername(tempToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid temporary token"));

        // Verify the TOTP code
        String secret = user.getTwoFactorSecret();
        if (secret == null || secret.isEmpty()) {
            throw new IllegalArgumentException("2FA not set up for user");
        }

        if (!TotpUtil.verifyTotp(secret, code)) {
            auditLogService.logFailure(user.getEmail(), "2FA_VERIFY", "Invalid 2FA code", getClientIp());
            throw new IllegalArgumentException("Invalid 2FA code");
        }

        // 2FA verified successfully, issue normal tokens
        auditLogService.log(user.getEmail(), "2FA_VERIFY_SUCCESS", "User", user.getId().toString(),
                "2FA verified successfully", getClientIp());

        return buildTokenResponse(user);
    }

    private String generateAccountNumber() {
        Random random = new Random();
        return String.format("%08d", random.nextInt(99999999));
    }
}
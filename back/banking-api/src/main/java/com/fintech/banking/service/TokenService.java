package com.fintech.banking.service;

import com.fintech.banking.domain.entity.*;
import com.fintech.banking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TokenService {

    private final AuthTokenRepository authTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final SecurityEventService securityEventService;
    private final AuditLogRepository auditLogRepository;

    @Value("${app.auth.token-validity-minutes:15}")
    private int accessTokenValidityMinutes;

    @Value("${app.auth.refresh-token-validity-days:7}")
    private int refreshTokenValidityDays;

    /**
     * Issues a new access token for the user
     */
    @Transactional
    public AuthToken issueAccessToken(UUID userId, String deviceId, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        String tokenValue = generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(accessTokenValidityMinutes);

        AuthToken authToken = AuthToken.builder()
            .userId(userId)
            .token(tokenValue)
            .expiresAt(expiresAt)
            .deviceId(deviceId)
            .ipAddress(ipAddress)
            .revoked(false)
            .build();

        authTokenRepository.save(authToken);

        createAuditLog(userId, "TOKEN_ISSUED", "Access token issued", "AuthToken", authToken.getId().toString(), null);
        return authToken;
    }

    /**
     * Issues a new refresh token for the user
     */
    @Transactional
    public RefreshToken issueRefreshToken(UUID userId) {
        String tokenValue = generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(refreshTokenValidityDays);

        RefreshToken refreshToken = RefreshToken.builder()
            .user(userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found")))
            .token(tokenValue)
            .expiresAt(expiresAt)
            .revoked(false)
            .build();

        refreshTokenRepository.save(refreshToken);

        createAuditLog(userId, "REFRESH_TOKEN_ISSUED", "Refresh token issued", 
                      "RefreshToken", refreshToken.getId().toString(), null);
        return refreshToken;
    }

    /**
     * Validates an access token
     */
    public boolean validateAccessToken(String token) {
        Optional<AuthToken> authToken = authTokenRepository.findByToken(token);
        return authToken.isPresent() && authToken.get().isValid();
    }

    /**
     * Validates a refresh token
     */
    public boolean validateRefreshToken(String token) {
        Optional<RefreshToken> refreshToken = refreshTokenRepository.findByToken(token);
        return refreshToken.isPresent() && refreshToken.get().isValid();
    }

    /**
     * Refreshes an access token (with token rotation for refresh tokens)
     * Business Rule: Each refresh generates new token, old revoked, reuse of revoked → SecurityEvent
     */
    @Transactional
    public AuthToken refreshAccessToken(String oldRefreshToken, String ipAddress, String deviceId) {
        Optional<RefreshToken> refreshTokenOpt = refreshTokenRepository.findByToken(oldRefreshToken);

        if (refreshTokenOpt.isEmpty()) {
            log.warn("Attempted refresh with invalid refresh token");
            throw new RuntimeException("Invalid refresh token");
        }

        RefreshToken refreshToken = refreshTokenOpt.get();

        // Check if refresh token is expired
        if (refreshToken.isExpired()) {
            log.warn("Attempted refresh with expired refresh token for user: {}", refreshToken.getUser().getId());
            throw new RuntimeException("Refresh token expired");
        }

        // Check if refresh token was previously revoked (potential reuse attack)
        if (refreshToken.getRevoked()) {
            log.error("Attempted reuse of revoked refresh token for user: {}", refreshToken.getUser().getId());
            securityEventService.handleTokenReuse(refreshToken.getUser(), ipAddress, deviceId);
            throw new RuntimeException("Token reuse detected - account blocked");
        }

        // Issue new access token
        UUID userId = refreshToken.getUser().getId();
        AuthToken newAccessToken = issueAccessToken(userId, deviceId, ipAddress);

        // Rotate refresh token (revoke old, issue new)
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        RefreshToken newRefreshToken = issueRefreshToken(userId);

        createAuditLog(userId, "TOKEN_REFRESHED", "Access token refreshed with rotation", 
                      "AuthToken", newAccessToken.getId().toString(), null);

        return newAccessToken;
    }

    /**
     * Revokes an access token
     */
    @Transactional
    public void revokeAccessToken(UUID tokenId) {
        Optional<AuthToken> authToken = authTokenRepository.findById(tokenId);
        if (authToken.isPresent()) {
            authToken.get().revoke();
            authTokenRepository.save(authToken.get());
        }
    }

    /**
     * Revokes a refresh token
     */
    @Transactional
    public void revokeRefreshToken(UUID tokenId) {
        Optional<RefreshToken> refreshToken = refreshTokenRepository.findById(tokenId);
        if (refreshToken.isPresent()) {
            refreshToken.get().setRevoked(true);
            refreshTokenRepository.save(refreshToken.get());
        }
    }

    /**
     * Revokes all tokens for a user (e.g., on password change or security event)
     */
    @Transactional
    public void revokeAllTokensForUser(UUID userId, String reason) {
        // Revoke all access tokens
        List<AuthToken> accessTokens = authTokenRepository.findByUserIdAndRevokedFalse(userId);
        accessTokens.forEach(token -> {
            token.setRevoked(true);
            authTokenRepository.save(token);
        });

        // Revoke all refresh tokens
        List<RefreshToken> refreshTokens = refreshTokenRepository.findByUserId(userId);
        refreshTokens.forEach(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });

        createAuditLog(userId, "TOKENS_REVOKED", reason, "User", userId.toString(), null);
        log.info("All tokens revoked for user {} - Reason: {}", userId, reason);
    }

    /**
     * Cleans up expired tokens
     */
    @Transactional
    public void cleanupExpiredTokens() {
        LocalDateTime now = LocalDateTime.now();

        // Delete expired auth tokens
        List<AuthToken> expiredAuthTokens = authTokenRepository.findByExpiresAtBefore(now);
        expiredAuthTokens.forEach(authTokenRepository::delete);

        // Delete expired refresh tokens
        List<RefreshToken> expiredRefreshTokens = refreshTokenRepository.findByExpiresAtBefore(now);
        expiredRefreshTokens.forEach(refreshTokenRepository::delete);

        log.info("Cleanup completed for expired tokens");
    }

    /**
     * Generates a secure random token
     */
    private String generateToken() {
        return UUID.randomUUID().toString() + "." + System.currentTimeMillis();
    }

    private void createAuditLog(UUID userId, String action, String details,
                                 String entity, String entityId, UUID sessionId) {
        AuditLog log = AuditLog.builder()
            .userEmail("system")
            .action(action)
            .entity(entity)
            .entityId(entityId)
            .details(details)
            .status("SUCCESS")
            .sessionId(sessionId)
            .build();
        auditLogRepository.save(log);
    }
}

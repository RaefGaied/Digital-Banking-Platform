package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.AuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {
    Optional<AuthToken> findByToken(String token);

    List<AuthToken> findByUserIdAndRevokedFalse(UUID userId);

    List<AuthToken> findByUserIdAndExpiresAtBefore(UUID userId, LocalDateTime expiresAt);

    List<AuthToken> findByExpiresAtBefore(LocalDateTime expiresAt);

    void deleteByUserIdAndExpiresAtBefore(UUID userId, LocalDateTime expiresAt);

    List<AuthToken> findByDeviceId(String deviceId);

    long countByUserIdAndRevokedFalse(UUID userId);
}

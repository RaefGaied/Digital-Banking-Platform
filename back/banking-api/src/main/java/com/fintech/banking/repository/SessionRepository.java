package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {
    List<Session> findByUserId(UUID userId);

    List<Session> findByUserIdAndStatus(UUID userId, SessionStatus status);

    List<Session> findByStatus(SessionStatus status);

    List<Session> findByCreatedAtBefore(LocalDateTime createdAt);

    Optional<Session> findByAgentId(UUID agentId);

    long countByUserIdAndStatusIn(UUID userId, List<SessionStatus> statuses);

    List<Session> findByStatusAndClosedAtIsNull(SessionStatus status);
}

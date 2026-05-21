package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.SecurityEvent;
import com.fintech.banking.domain.enums.SecurityEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, UUID> {
    List<SecurityEvent> findByUserId(UUID userId);

    List<SecurityEvent> findByUserIdOrderByTimestampDesc(UUID userId);

    List<SecurityEvent> findByType(SecurityEventType type);

    List<SecurityEvent> findByUserIdAndType(UUID userId, SecurityEventType type);

    List<SecurityEvent> findByUserIdAndResolvedFalse(UUID userId);

    List<SecurityEvent> findByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime);

    List<SecurityEvent> findByUserIdAndTimestampAfter(UUID userId, LocalDateTime timestamp);

    long countByUserIdAndTypeAndTimestampAfter(UUID userId, SecurityEventType type, LocalDateTime timestamp);
}

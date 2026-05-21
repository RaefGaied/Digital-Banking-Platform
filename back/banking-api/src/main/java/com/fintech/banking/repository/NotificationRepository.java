package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Notification;
import com.fintech.banking.domain.enums.NotificationType;
import com.fintech.banking.domain.enums.NotificationChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUserId(UUID userId, Pageable pageable);

    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<Notification> findByUserIdAndIsReadFalse(UUID userId);

    Page<Notification> findByUserIdAndIsReadFalse(UUID userId, Pageable pageable);

    List<Notification> findByUserIdAndType(UUID userId, NotificationType type);

    List<Notification> findByUserIdAndChannel(UUID userId, NotificationChannel channel);

    long countByUserIdAndIsReadFalse(UUID userId);

    Page<Notification> findByUserIdAndCreatedAtAfter(UUID userId, LocalDateTime createdAfter, Pageable pageable);

    List<Notification> findByReferenceTypeAndReferenceId(String referenceType, Long referenceId);

    void deleteByUserIdAndCreatedAtBefore(UUID userId, LocalDateTime createdBefore);
}

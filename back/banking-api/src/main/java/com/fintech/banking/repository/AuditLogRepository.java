package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByUserEmailOrderByCreatedAtDesc(String userEmail);
    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);
}

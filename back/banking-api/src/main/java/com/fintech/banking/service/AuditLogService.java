package com.fintech.banking.service;

import com.fintech.banking.domain.entity.AuditLog;
import com.fintech.banking.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void log(String userEmail, String action, String entity, String entityId, String details, String ipAddress) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .userEmail(userEmail)
                    .action(action)
                    .entity(entity)
                    .entityId(entityId)
                    .details(details)
                    .ipAddress(ipAddress)
                    .status("SUCCESS")
                    .build();
            auditLogRepository.save(auditLog);
            log.info("[AUDIT] {} - {} - {} - {}", userEmail, action, entity, entityId);
        } catch (Exception e) {
            log.error("[AUDIT] Error saving audit log: {}", e.getMessage());
        }
    }

    @Async
    public void logFailure(String userEmail, String action, String details, String ipAddress) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .userEmail(userEmail)
                    .action(action)
                    .details(details)
                    .ipAddress(ipAddress)
                    .status("FAILURE")
                    .build();
            auditLogRepository.save(auditLog);
            log.warn("[AUDIT] FAILURE - {} - {} - {}", userEmail, action, details);
        } catch (Exception e) {
            log.error("[AUDIT] Error saving audit log: {}", e.getMessage());
        }
    }
}

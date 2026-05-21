package com.fintech.banking.domain.entity;

import com.fintech.banking.domain.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SessionStatus status;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "agent_id")
    private UUID agentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_activity_at")
    private LocalDateTime lastActivityAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (lastActivityAt == null) {
            lastActivityAt = LocalDateTime.now();
        }
    }

    public void open() {
        this.status = SessionStatus.OPENED;
        this.createdAt = LocalDateTime.now();
    }

    public void close() {
        this.status = SessionStatus.CLOSED;
        this.closedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return !isExpired() && (status == SessionStatus.ACTIVE || status == SessionStatus.OPENED);
    }

    public boolean isExpired() {
        return status == SessionStatus.EXPIRED || status == SessionStatus.CLOSED;
    }
}

package com.fintech.banking.domain.entity;

import com.fintech.banking.domain.enums.SecurityEventType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "security_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityEvent {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SecurityEventType type;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "device_id", length = 255)
    private String deviceId;

    @Column(name = "resolved")
    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    public void resolve() {
        this.resolved = true;
    }
}

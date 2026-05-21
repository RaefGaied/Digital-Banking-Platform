package com.fintech.banking.domain.entity;

import com.fintech.banking.domain.enums.AgentDecision;
import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "banking_agents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankingAgent {

    @Id
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true)
    private UUID sessionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Type(JsonBinaryType.class)
    @Column(name = "context", columnDefinition = "jsonb")
    private JsonNode context;

    @Column(name = "last_transaction_id")
    private UUID lastTransactionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", length = 50)
    private AgentDecision decision;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_policy", length = 50)
    private AgentDecision defaultPolicy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

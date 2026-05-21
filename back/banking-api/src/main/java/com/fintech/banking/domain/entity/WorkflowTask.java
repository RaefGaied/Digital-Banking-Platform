package com.fintech.banking.domain.entity;

import com.fintech.banking.domain.enums.ActionType;
import com.fintech.banking.domain.enums.TaskType;
import com.fintech.banking.domain.enums.WorkflowTaskStatus;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "workflow_tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "process_instance_id", nullable = false, length = 255)
    private String processInstanceId;

    @Column(name = "support_ticket_id")
    private Long supportTicketId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private WorkflowTaskStatus status = WorkflowTaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 100)
    private TaskType taskType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", length = 100)
    private ActionType actionType;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "breached_at")
    private LocalDateTime breachedAt;

    @Column(name = "escalation_level")
    @Builder.Default
    private Integer escalationLevel = 0;

    @Type(JsonBinaryType.class)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

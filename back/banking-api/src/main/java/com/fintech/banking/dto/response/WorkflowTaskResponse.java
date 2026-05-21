package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.ActionType;
import com.fintech.banking.domain.enums.TaskType;
import com.fintech.banking.domain.enums.WorkflowTaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTaskResponse {

    private Long id;
    private String processInstanceId;
    private Long supportTicketId;
    private WorkflowTaskStatus status;
    private TaskType taskType;
    private String description;
    private Long assignedTo;
    private ActionType actionType;
    private LocalDateTime dueDate;
    private LocalDateTime breachedAt;
    private Integer escalationLevel;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}

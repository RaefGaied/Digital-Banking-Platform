package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.WorkflowTask;
import com.fintech.banking.domain.enums.TaskType;
import com.fintech.banking.domain.enums.WorkflowTaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkflowTaskRepository extends JpaRepository<WorkflowTask, Long> {

    List<WorkflowTask> findByProcessInstanceId(String processInstanceId);

    Page<WorkflowTask> findBySupportTicketId(Long supportTicketId, Pageable pageable);

    Page<WorkflowTask> findByStatus(WorkflowTaskStatus status, Pageable pageable);

    Page<WorkflowTask> findByAssignedTo(java.util.UUID assignedTo, Pageable pageable);

    Page<WorkflowTask> findByAssignedToAndStatus(java.util.UUID assignedTo, WorkflowTaskStatus status, Pageable pageable);

    List<WorkflowTask> findByStatusAndDueDateBefore(WorkflowTaskStatus status, LocalDateTime dueDate);

    List<WorkflowTask> findByTaskType(TaskType taskType);
}

package com.fintech.banking.service;

import com.fintech.banking.domain.entity.AuditLog;
import com.fintech.banking.domain.entity.SecurityEvent;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.entity.WorkflowTask;
import com.fintech.banking.domain.enums.ActionType;
import com.fintech.banking.domain.enums.SecurityEventType;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.domain.enums.TaskType;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.domain.enums.WorkflowTaskStatus;
import com.fintech.banking.repository.AuditLogRepository;
import com.fintech.banking.repository.SessionRepository;
import com.fintech.banking.repository.SecurityEventRepository;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.repository.WorkflowTaskRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final SupportTicketService supportTicketService;
    private final SupportTicketRepository supportTicketRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final SecurityEventRepository securityEventRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final SecurityEventService securityEventService;

    public DashboardResponse getDashboard() {
        SupportTicketService.TicketStatistics ticketStatistics = supportTicketService.getStatistics();
        long activeSessions = sessionRepository.findByStatus(SessionStatus.ACTIVE).size();
        long activeUsers = userRepository.findAll().stream().filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .count();
        long pendingTasks = workflowTaskRepository.findByStatus(WorkflowTaskStatus.PENDING, Pageable.unpaged())
                .getTotalElements();

        List<TaskSummaryResponse> recentTasks = workflowTaskRepository
                .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toTaskSummary)
                .getContent();

        List<AuditLogResponse> recentAuditLogs = auditLogRepository
                .findAll(PageRequest.of(0, 8, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toAuditLogResponse)
                .getContent();

        return DashboardResponse.builder()
                .ticketStatistics(ticketStatistics)
                .activeSessions(activeSessions)
                .activeUsers(activeUsers)
                .pendingTasks(pendingTasks)
                .recentTasks(recentTasks)
                .recentAuditLogs(recentAuditLogs)
                .build();
    }

    public Page<TaskSummaryResponse> getTasks(Pageable pageable) {
        return workflowTaskRepository.findAll(pageable).map(this::toTaskSummary);
    }

    public TaskDetailResponse getTask(Long taskId) {
        WorkflowTask task = workflowTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        return toTaskDetail(task);
    }

    public TaskDetailResponse handleTaskAction(Long taskId, UUID adminId, String adminEmail,
            TaskActionRequest request) {
        WorkflowTask task = workflowTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        ActionType action = ActionType.valueOf(request.getAction().toUpperCase(Locale.ROOT));
        task.setAssignedTo(adminId);
        task.setActionType(action);

        SupportTicket ticket = null;
        if (task.getSupportTicketId() != null) {
            ticket = supportTicketRepository.findById(task.getSupportTicketId()).orElse(null);
        }

        String comment = request.getComment() == null || request.getComment().isBlank()
                ? null
                : request.getComment().trim();

        switch (action) {
            case APPROVE -> {
                task.setStatus(WorkflowTaskStatus.COMPLETED);
                task.setCompletedAt(LocalDateTime.now());
                if (ticket != null) {
                    supportTicketService.updateTicketStatus(ticket.getId(), TicketStatus.RESOLVED);
                }
            }
            case REJECT -> {
                task.setStatus(WorkflowTaskStatus.REJECTED);
                task.setCompletedAt(LocalDateTime.now());
                if (ticket != null) {
                    supportTicketService.updateTicketStatus(ticket.getId(), TicketStatus.CLOSED);
                    notificationService.notifyTicketUpdated(
                            ticket.getUserId(),
                            ticket.getId(),
                            comment != null ? comment : "Your request has been rejected by an administrator.");
                }
            }
            case REVIEW -> {
                task.setStatus(WorkflowTaskStatus.IN_PROGRESS);
                if (task.getTaskType() == null) {
                    task.setTaskType(TaskType.COMPLIANCE_REVIEW);
                }
                if (ticket != null) {
                    supportTicketService.updateTicketStatus(ticket.getId(), TicketStatus.IN_PROGRESS);
                    notificationService.notifyInfoRequested(
                            ticket.getUserId(),
                            comment != null ? comment : "Additional information is required to continue the review.");
                }
            }
            case ESCALATE -> {
                task.setStatus(WorkflowTaskStatus.IN_PROGRESS);
                task.setEscalationLevel(task.getEscalationLevel() + 1);
                if (ticket != null) {
                    supportTicketService.assignToAdmin(ticket.getId(), adminId);
                    notificationService.notifyTicketUpdated(
                            ticket.getUserId(),
                            ticket.getId(),
                            comment != null ? comment : "Your request has been escalated to a senior reviewer.");
                }
            }
        }

        WorkflowTask savedTask = workflowTaskRepository.save(task);
        auditLogService.log(
                adminEmail,
                "ADMIN_TASK_ACTION",
                "WorkflowTask",
                savedTask.getId().toString(),
                action.name() + (comment != null ? ": " + comment : ""),
                null);

        return toTaskDetail(savedTask);
    }

    public Page<UserSummaryResponse> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toUserSummary);
    }

    public UserSummaryResponse blockUser(UUID userId, String adminEmail, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setStatus(UserStatus.BLOCKED);
        user.setActive(false);
        user.setLockedUntil(LocalDateTime.now().plusMinutes(30));
        User savedUser = userRepository.save(user);

        notificationService.notifySecurityAlert(userId, reason != null && !reason.isBlank()
                ? reason
                : "Your account has been blocked by an administrator.");

        auditLogService.log(
                adminEmail,
                "ADMIN_BLOCK_USER",
                "User",
                userId.toString(),
                reason != null && !reason.isBlank() ? reason : "Account blocked",
                null);

        return toUserSummary(savedUser);
    }

    public UserSummaryResponse unblockUser(UUID userId, String adminEmail) {
        securityEventService.unlockUser(userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        auditLogService.log(
                adminEmail,
                "ADMIN_UNBLOCK_USER",
                "User",
                userId.toString(),
                "Account unlocked by administrator",
                null);

        return toUserSummary(user);
    }

    public Page<AuditLogResponse> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable).map(this::toAuditLogResponse);
    }

    public Page<SecurityEventResponse> getSecurityEvents(Pageable pageable) {
        return securityEventRepository.findAll(pageable).map(this::toSecurityEventResponse);
    }

    public SecurityEventResponse resolveSecurityEvent(UUID eventId, String adminEmail) {
        SecurityEvent event = securityEventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Security event not found"));

        event.resolve();
        SecurityEvent saved = securityEventRepository.save(event);

        auditLogService.log(
                adminEmail,
                "ADMIN_RESOLVE_SECURITY_EVENT",
                "SecurityEvent",
                saved.getId().toString(),
                "Security event resolved",
                null);

        return toSecurityEventResponse(saved);
    }

    private TaskSummaryResponse toTaskSummary(WorkflowTask task) {
        SupportTicket ticket = task.getSupportTicketId() != null
                ? supportTicketRepository.findById(task.getSupportTicketId()).orElse(null)
                : null;

        return TaskSummaryResponse.builder()
                .id(task.getId())
                .processInstanceId(task.getProcessInstanceId())
                .supportTicketId(task.getSupportTicketId())
                .taskType(task.getTaskType() != null ? task.getTaskType().name() : null)
                .status(task.getStatus() != null ? task.getStatus().name() : null)
                .actionType(task.getActionType() != null ? task.getActionType().name() : null)
                .description(task.getDescription())
                .assignedTo(task.getAssignedTo())
                .escalationLevel(task.getEscalationLevel())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .dueDate(task.getDueDate())
                .ticket(ticket != null ? toTicketSummary(ticket) : null)
                .client(ticket != null
                        ? userRepository.findById(ticket.getUserId()).map(this::toUserSummary).orElse(null)
                        : null)
                .build();
    }

    private TaskDetailResponse toTaskDetail(WorkflowTask task) {
        TaskSummaryResponse summary = toTaskSummary(task);
        return TaskDetailResponse.builder()
                .task(summary)
                .metadata(task.getMetadata())
                .completedAt(task.getCompletedAt())
                .build();
    }

    private TicketSummaryResponse toTicketSummary(SupportTicket ticket) {
        return TicketSummaryResponse.builder()
                .id(ticket.getId())
                .userId(ticket.getUserId())
                .subject(ticket.getSubject())
                .description(ticket.getDescription())
                .status(ticket.getStatus() != null ? ticket.getStatus().name() : null)
                .priority(ticket.getPriority() != null ? ticket.getPriority().name() : null)
                .ticketType(ticket.getTicketType() != null ? ticket.getTicketType().name() : null)
                .assignedAdminId(ticket.getAssignedAdminId())
                .ownerId(ticket.getOwnerId())
                .flowableProcessId(ticket.getFlowableProcessId())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .resolvedAt(ticket.getResolvedAt())
                .closedAt(ticket.getClosedAt())
                .build();
    }

    private UserSummaryResponse toUserSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .active(user.getActive())
                .failedLoginAttempts(user.getFailedLoginAttempts())
                .lockedUntil(user.getLockedUntil())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private AuditLogResponse toAuditLogResponse(AuditLog auditLog) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .userEmail(auditLog.getUserEmail())
                .action(auditLog.getAction())
                .entity(auditLog.getEntity())
                .entityId(auditLog.getEntityId())
                .details(auditLog.getDetails())
                .ipAddress(auditLog.getIpAddress())
                .sessionId(auditLog.getSessionId())
                .status(auditLog.getStatus())
                .createdAt(auditLog.getCreatedAt())
                .build();
    }

    private SecurityEventResponse toSecurityEventResponse(SecurityEvent event) {
        return SecurityEventResponse.builder()
                .id(event.getId())
                .userId(event.getUserId())
                .type(event.getType() != null ? event.getType().name() : null)
                .ipAddress(event.getIpAddress())
                .deviceId(event.getDeviceId())
                .resolved(event.getResolved())
                .timestamp(event.getTimestamp())
                .build();
    }

    @Data
    @Builder
    public static class DashboardResponse {
        private SupportTicketService.TicketStatistics ticketStatistics;
        private long activeSessions;
        private long activeUsers;
        private long pendingTasks;
        private List<TaskSummaryResponse> recentTasks;
        private List<AuditLogResponse> recentAuditLogs;
    }

    @Data
    @Builder
    public static class TaskSummaryResponse {
        private Long id;
        private String processInstanceId;
        private Long supportTicketId;
        private String taskType;
        private String status;
        private String actionType;
        private String description;
        private UUID assignedTo;
        private Integer escalationLevel;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime dueDate;
        private TicketSummaryResponse ticket;
        private UserSummaryResponse client;
    }

    @Data
    @Builder
    public static class TaskDetailResponse {
        private TaskSummaryResponse task;
        private java.util.Map<String, Object> metadata;
        private LocalDateTime completedAt;
    }

    @Data
    @Builder
    public static class TicketSummaryResponse {
        private Long id;
        private UUID userId;
        private String subject;
        private String description;
        private String status;
        private String priority;
        private String ticketType;
        private UUID assignedAdminId;
        private UUID ownerId;
        private String flowableProcessId;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime resolvedAt;
        private LocalDateTime closedAt;
    }

    @Data
    @Builder
    public static class UserSummaryResponse {
        private UUID id;
        private String name;
        private String email;
        private String role;
        private String status;
        private Boolean active;
        private Integer failedLoginAttempts;
        private LocalDateTime lockedUntil;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class AuditLogResponse {
        private UUID id;
        private String userEmail;
        private String action;
        private String entity;
        private String entityId;
        private String details;
        private String ipAddress;
        private UUID sessionId;
        private String status;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class SecurityEventResponse {
        private UUID id;
        private UUID userId;
        private String type;
        private String ipAddress;
        private String deviceId;
        private Boolean resolved;
        private LocalDateTime timestamp;
    }

    @Data
    public static class TaskActionRequest {
        private String action;
        private String comment;
    }
}
package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.WorkflowTask;
import com.fintech.banking.domain.enums.ActionType;
import com.fintech.banking.domain.enums.AdminTicketAction;
import com.fintech.banking.domain.enums.TaskType;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.enums.WorkflowTaskStatus;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.WorkflowTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SupportTicketService {

    private final SupportTicketRepository supportTicketRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final NotificationService notificationService;
    private final FlowableService flowableService;

    /**
     * Creates a new support ticket
     */
    @Transactional
    public SupportTicket createTicket(UUID userId, String subject, String description, 
                                      TicketType ticketType, UUID ownerId) {
        SupportTicket ticket = SupportTicket.builder()
            .userId(userId)
            .subject(subject)
            .description(description)
            .ticketType(ticketType)
            .ownerId(ownerId)
            .status(TicketStatus.OPEN)
            .build();

        ticket = supportTicketRepository.save(ticket);
        log.info("Support ticket created: {}", ticket.getId());

        // Send notification
        notificationService.notifyTicketCreated(ticket.getUserId(), ticket.getId(), subject);
        return ticket;
    }

    public SupportTicket createTicketWithAttachment(UUID userId,
                                                    String subject,
                                                    String description,
                                                    TicketType ticketType,
                                                    UUID ownerId,
                                                    MultipartFile attachment) {
        SupportTicket ticket = SupportTicket.builder()
            .userId(userId)
            .subject(subject)
            .description(description)
            .ticketType(ticketType)
            .ownerId(ownerId)
            .status(TicketStatus.OPEN)
            .build();

        if (attachment != null && !attachment.isEmpty()) {
            try {
                ticket.setAttachmentName(attachment.getOriginalFilename());
                ticket.setAttachmentType(attachment.getContentType());
                ticket.setAttachmentData(attachment.getBytes());
            } catch (Exception e) {
                log.warn("Failed to read attachment data", e);
            }
        }

        ticket = supportTicketRepository.save(ticket);
        log.info("Support ticket created with attachment: {}", ticket.getId());
        notificationService.notifyTicketCreated(ticket.getUserId(), ticket.getId(), subject);
        return ticket;
    }

    /**
     * Creates a support ticket and starts a workflow instance.
     */
    @Transactional
    public SupportTicket createTicketWithWorkflow(UUID userId, String subject, String description,
                                                  TicketType ticketType, UUID ownerId,
                                                  String processKey, Map<String, Object> variables) {
        SupportTicket ticket = createTicket(userId, subject, description, ticketType, ownerId);
        String processInstanceId = null;
        Map<String, Object> workflowVariables = variables == null
                ? new HashMap<>()
                : new HashMap<>(variables);
        // The completion handler uses this variable to reconcile the BPMN decision
        // with the persisted support ticket.
        workflowVariables.put("supportTicketId", ticket.getId());

        try {
            if (processKey != null && !processKey.isBlank()) {
                processInstanceId = flowableService.startProcessInstance(processKey, workflowVariables);
            }
        } catch (Exception e) {
            log.warn("Flowable process not started for ticket {}: {}", ticket.getId(), e.getMessage());
        }

        if (processInstanceId != null) {
            ticket = associateWithWorkflow(ticket.getId(), processInstanceId);
        } else {
            WorkflowTask task = WorkflowTask.builder()
                    .processInstanceId("FALLBACK_" + UUID.randomUUID())
                    .supportTicketId(ticket.getId())
                    .status(WorkflowTaskStatus.PENDING)
                    .taskType(getTaskTypeForTicketType(ticketType))
                    .description(description)
                    .build();
            WorkflowTask savedTask = workflowTaskRepository.save(task);
            notificationService.notifyAdminsTaskCreated(savedTask.getId(), savedTask.getDescription());
            ticket.setFlowableProcessId(task.getProcessInstanceId());
            ticket = supportTicketRepository.save(ticket);
        }

        return ticket;
    }

    private TaskType getTaskTypeForTicketType(TicketType ticketType) {
        return switch (ticketType) {
            case FRAUD -> TaskType.FRAUD_CHECK;
            case DATA_UPDATE -> TaskType.COMPLIANCE_REVIEW;
            case CLAIM -> TaskType.COMPLIANCE_REVIEW;
            case GENERAL -> TaskType.ESCALATION;
            case TRANSFER_VALIDATION -> TaskType.TRANSFER_VALIDATION;
        };
    }

    public Optional<SupportTicket> getTicketById(Long ticketId) {
        return supportTicketRepository.findById(ticketId);
    }

    /**
     * Gets all tickets for a user
     */
    public Page<SupportTicket> getUserTickets(UUID userId, Pageable pageable) {
        return supportTicketRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public Optional<SupportTicket> findLatestEmailChangeTicket(UUID userId) {
        return supportTicketRepository
                .findByUserIdAndTicketTypeOrderByCreatedAtDesc(userId, TicketType.DATA_UPDATE)
                .stream()
                .filter(ticket -> isEmailChangeTicket(ticket.getSubject(), ticket.getDescription()))
                .findFirst();
    }

    private boolean isEmailChangeTicket(String subject, String description) {
        String searchableText = ((subject == null ? "" : subject) + " "
                + (description == null ? "" : description)).toLowerCase(java.util.Locale.ROOT);
        if (searchableText.isBlank()) {
            return false;
        }
        return searchableText.contains("email")
                || searchableText.contains("e-mail")
                || searchableText.contains("courriel")
                || searchableText.contains("adresse e")
                || searchableText.contains("modifier mon email")
                || searchableText.contains("modifer mon email");
    }

    /**
     * Gets all open tickets for a user
     */
    public List<SupportTicket> getOpenTickets(UUID userId) {
        return supportTicketRepository.findByUserIdAndStatus(userId, TicketStatus.OPEN, Pageable.unpaged()).getContent();
    }

    /**
     * Gets all tickets with a specific status
     */
    public List<SupportTicket> getTicketsByStatus(TicketStatus status) {
        return supportTicketRepository.findByStatus(status, Pageable.unpaged()).getContent();
    }

    /**
     * Gets all tickets assigned to an admin
     */
    public List<SupportTicket> getTicketsAssignedToAdmin(UUID adminId) {
        return supportTicketRepository.findByAssignedAdminId(adminId, Pageable.unpaged()).getContent();
    }

    /**
     * Updates ticket status
     */
    @Transactional
    public SupportTicket updateTicketStatus(Long ticketId, TicketStatus newStatus) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));

        TicketStatus oldStatus = ticket.getStatus();
        ticket.setStatus(newStatus);

        if (newStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        } else if (newStatus == TicketStatus.CLOSED) {
            ticket.setClosedAt(LocalDateTime.now());
        }

        ticket = supportTicketRepository.save(ticket);
        log.info("Ticket status updated: {} {} -> {}", ticketId, oldStatus, newStatus);

        // Send notification
        if (newStatus == TicketStatus.RESOLVED) {
            notificationService.notifyTicketResolved(ticket);
        } else if (newStatus == TicketStatus.IN_PROGRESS) {
            notificationService.notifyTicketUpdated(ticket.getUserId(), ticketId, "Your ticket is being reviewed");
        }

        return ticket;
    }

    @Transactional
    public SupportTicket handleGeneralTicketAction(
            Long ticketId,
            UUID adminId,
            AdminTicketAction action,
            String comment) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        if (ticket.getTicketType() != TicketType.GENERAL) {
            throw new IllegalArgumentException("Manual support actions are only available for general tickets");
        }
        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("A resolved or closed ticket cannot be updated");
        }

        String note = comment == null ? "" : comment.trim();
        if ((action == AdminTicketAction.REQUEST_INFO || action == AdminTicketAction.RESOLVE)
                && note.isBlank()) {
            throw new IllegalArgumentException("A message is required for this ticket action");
        }
        if (note.length() > 2000) {
            throw new IllegalArgumentException("Ticket message must not exceed 2000 characters");
        }

        ticket.setAssignedAdminId(adminId);
        if (action == AdminTicketAction.RESOLVE) {
            ticket.setStatus(TicketStatus.RESOLVED);
            ticket.setResolvedAt(LocalDateTime.now());
        } else {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }
        ticket = supportTicketRepository.save(ticket);

        List<WorkflowTask> workflowTasks = workflowTaskRepository
                .findBySupportTicketId(ticketId, Pageable.unpaged())
                .getContent();
        for (WorkflowTask task : workflowTasks) {
            if (task.getStatus() == WorkflowTaskStatus.COMPLETED
                    || task.getStatus() == WorkflowTaskStatus.REJECTED
                    || task.getStatus() == WorkflowTaskStatus.CANCELLED) {
                continue;
            }
            task.setAssignedTo(adminId);
            task.setStatus(action == AdminTicketAction.RESOLVE
                    ? WorkflowTaskStatus.COMPLETED
                    : WorkflowTaskStatus.IN_PROGRESS);
            if (action == AdminTicketAction.RESOLVE) {
                task.setActionType(ActionType.REVIEW);
                task.setCompletedAt(LocalDateTime.now());
            }
        }
        workflowTaskRepository.saveAll(workflowTasks);

        switch (action) {
            case TAKE_OWNERSHIP -> notificationService.notifyTicketUpdated(
                    ticket.getUserId(),
                    ticketId,
                    note.isBlank() ? "An administrator has taken ownership of your ticket and is reviewing it." : note);
            case REQUEST_INFO -> notificationService.notifyInfoRequested(ticket.getUserId(), ticketId, note);
            case SEND_UPDATE -> notificationService.notifyTicketUpdated(ticket.getUserId(), ticketId, note);
            case RESOLVE -> notificationService.notifyTicketResolved(ticket, note);
        }
        log.info("General ticket {} handled with action {} by admin {}", ticketId, action, adminId);
        return ticket;
    }

    /**
     * Assigns ticket to an admin
     */
    @Transactional
    public SupportTicket assignToAdmin(Long ticketId, UUID adminId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));

        ticket.setAssignedAdminId(adminId);
        ticket.setStatus(TicketStatus.IN_PROGRESS);

        ticket = supportTicketRepository.save(ticket);
        log.info("Ticket assigned to admin: {} -> {}", ticketId, adminId);

        return ticket;
    }

    /**
     * Associates ticket with BPMN workflow
     */
    @Transactional
    public SupportTicket associateWithWorkflow(Long ticketId, String flowableProcessId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));

        ticket.setFlowableProcessId(flowableProcessId);
        return supportTicketRepository.save(ticket);
    }

    /**
     * Gets all workflow tasks for a ticket
     */
    public List<WorkflowTask> getWorkflowTasks(Long ticketId) {
        return workflowTaskRepository.findBySupportTicketId(ticketId, Pageable.unpaged()).getContent();
    }

    /**
     * Closes a ticket
     */
    @Transactional
    public SupportTicket closeTicket(Long ticketId) {
        return updateTicketStatus(ticketId, TicketStatus.CLOSED);
    }

    /**
     * Reopens a closed ticket
     */
    @Transactional
    public SupportTicket reopenTicket(Long ticketId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (ticket.getStatus() != TicketStatus.CLOSED) {
            throw new RuntimeException("Only closed tickets can be reopened");
        }

        ticket.setStatus(TicketStatus.OPEN);
        ticket.setClosedAt(null);
        ticket.setResolvedAt(null);

        return supportTicketRepository.save(ticket);
    }

    /**
     * Gets tickets by type
     */
    public List<SupportTicket> getTicketsByType(TicketType type) {
        return supportTicketRepository.findByTicketType(type);
    }

    /**
     * Gets statistics for tickets
     */
    public TicketStatistics getStatistics() {
        return TicketStatistics.builder()
            .totalTickets(supportTicketRepository.count())
            .openTickets((int) supportTicketRepository.findByStatus(TicketStatus.OPEN, Pageable.unpaged()).getTotalElements())
            .inProgressTickets((int) supportTicketRepository.findByStatus(TicketStatus.IN_PROGRESS, Pageable.unpaged()).getTotalElements())
            .resolvedTickets((int) supportTicketRepository.findByStatus(TicketStatus.RESOLVED, Pageable.unpaged()).getTotalElements())
            .closedTickets((int) supportTicketRepository.findByStatus(TicketStatus.CLOSED, Pageable.unpaged()).getTotalElements())
            .build();
    }

    // Helper class for statistics
    @lombok.Data
    @lombok.Builder
    public static class TicketStatistics {
        private long totalTickets;
        private int openTickets;
        private int inProgressTickets;
        private int resolvedTickets;
        private int closedTickets;
    }
}

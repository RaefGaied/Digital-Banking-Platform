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
import org.flowable.task.api.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
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

    private static final long MAX_IDENTITY_DOCUMENT_SIZE = 10L * 1024 * 1024;

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
            if (ticketType == TicketType.DATA_UPDATE) {
                storeIdentityDocument(ticket, attachment);
            } else {
                try {
                    ticket.setAttachmentName(safeFileName(attachment.getOriginalFilename()));
                    ticket.setAttachmentType(attachment.getContentType());
                    ticket.setAttachmentData(attachment.getBytes());
                } catch (IOException e) {
                    throw new IllegalStateException("Could not read the uploaded attachment", e);
                }
            }
        }

        ticket = supportTicketRepository.save(ticket);
        log.info("Support ticket created with attachment: {}", ticket.getId());
        notificationService.notifyTicketCreated(ticket.getUserId(), ticket.getId(), subject);
        return ticket;
    }

    public boolean isAwaitingIdentityDocument(SupportTicket ticket) {
        return ticket.getTicketType() == TicketType.DATA_UPDATE
                && flowableService.getActiveTask(ticket.getFlowableProcessId(), "taskFournirPreuve") != null;
    }

    public SupportTicket submitRequestedIdentityDocument(Long ticketId, UUID userId, MultipartFile attachment)
            throws IOException {
        if (attachment == null || attachment.isEmpty()) {
            throw new IllegalArgumentException("An identity document is required");
        }

        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Support ticket not found"));
        if (!ticket.getUserId().equals(userId)) {
            throw new AccessDeniedException("Only the ticket owner can upload its identity document");
        }
        if (ticket.getTicketType() != TicketType.DATA_UPDATE) {
            throw new IllegalArgumentException("Identity documents are only accepted for data update tickets");
        }

        Task uploadTask = flowableService.getActiveTask(ticket.getFlowableProcessId(), "taskFournirPreuve");
        if (uploadTask == null) {
            throw new IllegalStateException("The workflow is not waiting for an identity document");
        }
        if (uploadTask.getAssignee() != null && !userId.toString().equals(uploadTask.getAssignee())) {
            throw new AccessDeniedException("The active identity document task is assigned to another user");
        }

        storeIdentityDocument(ticket, attachment);
        SupportTicket savedTicket = supportTicketRepository.save(ticket);
        flowableService.completeTask(uploadTask.getId(), Map.of(
                "identityDocumentProvided", true,
                "identityDocumentName", ticket.getAttachmentName(),
                "identityDocumentType", ticket.getAttachmentType()));
        return savedTicket;
    }

    private void storeIdentityDocument(SupportTicket ticket, MultipartFile attachment) {
        if (attachment.getSize() > MAX_IDENTITY_DOCUMENT_SIZE) {
            throw new IllegalArgumentException("Identity documents must be 10 MB or smaller");
        }
        try {
            byte[] content = attachment.getBytes();
            String contentType = detectIdentityDocumentType(content);
            String fileName = safeFileName(attachment.getOriginalFilename());
            String extension = fileName.toLowerCase(java.util.Locale.ROOT);
            boolean extensionMatches = (contentType.equals("application/pdf") && extension.endsWith(".pdf"))
                    || (contentType.equals("image/jpeg")
                            && (extension.endsWith(".jpg") || extension.endsWith(".jpeg")))
                    || (contentType.equals("image/png") && extension.endsWith(".png"));
            if (!extensionMatches) {
                throw new IllegalArgumentException("Upload a PDF, JPEG, or PNG identity document");
            }
            ticket.setAttachmentName(fileName);
            ticket.setAttachmentType(contentType);
            ticket.setAttachmentData(content);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the uploaded identity document", e);
        }
    }

    private String detectIdentityDocumentType(byte[] content) {
        if (content.length >= 5 && content[0] == '%'
                && content[1] == 'P' && content[2] == 'D' && content[3] == 'F' && content[4] == '-') {
            return "application/pdf";
        }
        if (content.length >= 3
                && (content[0] & 0xff) == 0xff
                && (content[1] & 0xff) == 0xd8
                && (content[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        byte[] pngSignature = {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a};
        if (content.length >= pngSignature.length
                && Arrays.equals(Arrays.copyOf(content, pngSignature.length), pngSignature)) {
            return "image/png";
        }
        throw new IllegalArgumentException("Upload a valid PDF, JPEG, or PNG identity document");
    }

    private String safeFileName(String originalFileName) {
        String cleaned = StringUtils.cleanPath(originalFileName == null ? "" : originalFileName);
        int separator = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
        String fileName = separator >= 0 ? cleaned.substring(separator + 1) : cleaned;
        if (fileName.isBlank() || fileName.contains("..")) {
            throw new IllegalArgumentException("The uploaded document must have a valid file name");
        }
        return fileName;
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
        workflowVariables.put("userId", userId.toString());
        if ("dataUpdateValidationProcess".equals(processKey)) {
            workflowVariables.putIfAbsent("infoCount", 0);
        }

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
        return updateTicketStatus(ticketId, newStatus, true);
    }

    @Transactional
    public SupportTicket updateTicketStatusFromWorkflow(
            Long ticketId,
            TicketStatus newStatus) {
        return updateTicketStatus(ticketId, newStatus, false);
    }

    private SupportTicket updateTicketStatus(Long ticketId, TicketStatus newStatus, boolean notifyUser) {
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
        if (notifyUser && newStatus == TicketStatus.RESOLVED) {
            notificationService.notifyTicketResolved(ticket);
        } else if (notifyUser && newStatus == TicketStatus.IN_PROGRESS) {
            notificationService.notifyTicketUpdated(
                    ticket.getUserId(), ticketId, "Your ticket is being reviewed");
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

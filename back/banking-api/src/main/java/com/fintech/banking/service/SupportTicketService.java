package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.WorkflowTask;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.WorkflowTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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
        notificationService.notifyTicketCreated(UUID.randomUUID(), ticket.getId(), subject);
        return ticket;
    }

    /**
     * Gets a ticket by ID
     */
    public Optional<SupportTicket> getTicketById(Long ticketId) {
        return supportTicketRepository.findById(ticketId);
    }

    /**
     * Gets all tickets for a user
     */
    public Page<SupportTicket> getUserTickets(UUID userId, Pageable pageable) {
        return supportTicketRepository.findByUserId(userId, pageable);
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
            notificationService.notifyTicketResolved(UUID.randomUUID(), ticketId);
        } else if (newStatus == TicketStatus.IN_PROGRESS) {
            notificationService.notifyTicketUpdated(UUID.randomUUID(), ticketId, "Your ticket is being reviewed");
        }

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

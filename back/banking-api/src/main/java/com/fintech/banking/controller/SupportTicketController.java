package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.enums.TicketPriority;
import com.fintech.banking.service.SupportTicketService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/support-tickets")
@RequiredArgsConstructor
@Slf4j
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    /**
     * Create a new support ticket
     */
    @PostMapping
    public ResponseEntity<?> createTicket(
            @RequestBody CreateTicketRequest request,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());

            // Validation
            if (request.getSubject() == null || request.getSubject().isEmpty()) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Subject is required"));
            }

            if (request.getDescription() == null || request.getDescription().isEmpty()) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Description is required"));
            }

            // Create ticket
            SupportTicket ticket = supportTicketService.createTicket(
                userId,
                request.getSubject(),
                request.getDescription(),
                request.getTicketType(),
                userId
            );

            log.info("Support ticket created: {}", ticket.getId());

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new SuccessResponse("Ticket created successfully", new TicketResponse(ticket)));

        } catch (Exception e) {
            log.error("Failed to create support ticket", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to create ticket: " + e.getMessage()));
        }
    }

    /**
     * Get ticket by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getTicket(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            SupportTicket ticket = supportTicketService.getTicketById(id)
                .orElse(null);

            if (ticket == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(new SuccessResponse("Ticket retrieved", new TicketResponse(ticket)));
        } catch (Exception e) {
            log.error("Failed to retrieve ticket", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve ticket"));
        }
    }

    /**
     * Get all tickets for the authenticated user
     */
    @GetMapping
    public ResponseEntity<?> getUserTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            Pageable pageable = PageRequest.of(page, size);

            Page<SupportTicket> tickets = supportTicketService.getUserTickets(
                userId, pageable
            );

            return ResponseEntity.ok(new SuccessResponse("Tickets retrieved", tickets));
        } catch (Exception e) {
            log.error("Failed to retrieve user tickets", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve tickets"));
        }
    }

    /**
     * Get open tickets for the authenticated user
     */
    @GetMapping("/open")
    public ResponseEntity<?> getOpenTickets(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());

            var tickets = supportTicketService.getOpenTickets(userId);

            return ResponseEntity.ok(new SuccessResponse("Open tickets retrieved", tickets));
        } catch (Exception e) {
            log.error("Failed to retrieve open tickets", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve open tickets"));
        }
    }

    /**
     * Update ticket status
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateTicketStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request,
            Authentication authentication) {
        try {
            TicketStatus newStatus = TicketStatus.valueOf(request.getStatus().toUpperCase());
            SupportTicket ticket = supportTicketService.updateTicketStatus(id, newStatus);

            log.info("Ticket status updated: {} -> {}", id, newStatus);

            return ResponseEntity.ok(new SuccessResponse("Ticket status updated", new TicketResponse(ticket)));
        } catch (Exception e) {
            log.error("Failed to update ticket status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to update ticket status"));
        }
    }

    /**
     * Assign ticket to admin
     */
    @PutMapping("/{id}/assign")
    public ResponseEntity<?> assignTicket(
            @PathVariable Long id,
            @RequestBody AssignTicketRequest request,
            Authentication authentication) {
        try {
            SupportTicket ticket = supportTicketService.assignToAdmin(id, request.getAdminId());

            log.info("Ticket assigned: {} -> admin {}", id, request.getAdminId());

            return ResponseEntity.ok(new SuccessResponse("Ticket assigned", new TicketResponse(ticket)));
        } catch (Exception e) {
            log.error("Failed to assign ticket", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to assign ticket"));
        }
    }

    /**
     * Close a ticket
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<?> closeTicket(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            SupportTicket ticket = supportTicketService.closeTicket(id);

            log.info("Ticket closed: {}", id);

            return ResponseEntity.ok(new SuccessResponse("Ticket closed", new TicketResponse(ticket)));
        } catch (Exception e) {
            log.error("Failed to close ticket", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to close ticket"));
        }
    }

    /**
     * Reopen a closed ticket
     */
    @PostMapping("/{id}/reopen")
    public ResponseEntity<?> reopenTicket(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            SupportTicket ticket = supportTicketService.reopenTicket(id);

            log.info("Ticket reopened: {}", id);

            return ResponseEntity.ok(new SuccessResponse("Ticket reopened", new TicketResponse(ticket)));
        } catch (Exception e) {
            log.error("Failed to reopen ticket", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to reopen ticket"));
        }
    }

    /**
     * Get ticket statistics
     */
    @GetMapping("/stats/summary")
    public ResponseEntity<?> getTicketStats(Authentication authentication) {
        try {
            SupportTicketService.TicketStatistics stats = supportTicketService.getStatistics();

            return ResponseEntity.ok(new SuccessResponse("Statistics retrieved", stats));
        } catch (Exception e) {
            log.error("Failed to retrieve ticket statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Failed to retrieve statistics"));
        }
    }

    // Request/Response DTOs
    @Data
    public static class CreateTicketRequest {
        private String subject;
        private String description;
        private TicketType ticketType;
        private TicketPriority priority;
    }

    @Data
    public static class UpdateStatusRequest {
        private String status;
    }

    @Data
    public static class AssignTicketRequest {
        private UUID adminId;
    }

    @Data
    @AllArgsConstructor
    public static class TicketResponse {
        private Long id;
        private UUID userId;
        private String subject;
        private String description;
        private String status;
        private String ticketType;
        private String priority;

        public TicketResponse(SupportTicket ticket) {
            this.id = ticket.getId();
            this.userId = ticket.getUserId();
            this.subject = ticket.getSubject();
            this.description = ticket.getDescription();
            this.status = ticket.getStatus().toString();
            this.ticketType = ticket.getTicketType().toString();
            this.priority = ticket.getPriority().toString();
        }
    }

    @Data
    @AllArgsConstructor
    public static class SuccessResponse {
        private String message;
        private Object data;
    }

    @Data
    @AllArgsConstructor
    public static class ErrorResponse {
        private String error;
    }
}

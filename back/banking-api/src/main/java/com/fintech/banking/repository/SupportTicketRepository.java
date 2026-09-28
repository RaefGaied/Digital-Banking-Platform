package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {

    Page<SupportTicket> findByUserId(UUID userId, Pageable pageable);

    Page<SupportTicket> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<SupportTicket> findByUserIdAndTicketTypeAndStatus(
            UUID userId,
            TicketType ticketType,
            TicketStatus status);

    List<SupportTicket> findByUserIdAndTicketTypeOrderByCreatedAtDesc(UUID userId, TicketType ticketType);

    List<SupportTicket> findByTicketType(TicketType ticketType);

    Page<SupportTicket> findByStatus(TicketStatus status, Pageable pageable);

    Page<SupportTicket> findByAssignedAdminId(UUID adminId, Pageable pageable);

    Optional<SupportTicket> findByFlowableProcessId(String flowableProcessId);

    // Removed legacy query referencing a non-existent 'dueDate' field on SupportTicket

    Page<SupportTicket> findByUserIdAndStatus(UUID userId, TicketStatus status, Pageable pageable);
}

package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.TicketPriority;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportTicketResponse {

    private Long id;
    private Long userId;
    private String subject;
    private String description;
    private TicketStatus status;
    private TicketPriority priority;
    private TicketType ticketType;
    private Long assignedAdminId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
}

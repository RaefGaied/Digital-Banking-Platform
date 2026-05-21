package com.fintech.banking.dto.request;

import com.fintech.banking.domain.enums.TicketPriority;
import com.fintech.banking.domain.enums.TicketType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateSupportTicketRequest {

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Ticket type is required")
    private TicketType ticketType;

    private TicketPriority priority;
}

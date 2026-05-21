package com.fintech.banking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateMessageRequest {

    @NotNull(message = "Support ticket ID is required")
    private Long supportTicketId;

    @NotBlank(message = "Content is required")
    private String content;

    private Boolean isInternal = false;
}

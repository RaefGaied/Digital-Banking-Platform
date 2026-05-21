package com.fintech.banking.dto.response;

import com.fintech.banking.domain.enums.SenderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {

    private Long id;
    private Long supportTicketId;
    private Long senderId;
    private SenderType senderType;
    private String content;
    private Boolean isInternal;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

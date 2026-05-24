package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.enums.SenderType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findBySessionIdOrderByCreatedAtDesc(UUID sessionId, Pageable pageable);

    List<Message> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    List<Message> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    List<Message> findBySessionIdAndSenderType(UUID sessionId, SenderType senderType);

    List<Message> findBySessionIdAndIsInternalTrue(UUID sessionId);

    List<Message> findBySessionIdAndIsInternalFalse(UUID sessionId);

    List<Message> findBySessionIdAndContentContainingIgnoreCase(UUID sessionId, String keyword);

    long countBySessionId(UUID sessionId);

    // Legacy support for backward compatibility
        // Legacy support removed: messages are linked by sessionId
        // Page<Message> findBySupportTicketIdOrderByCreatedAtDesc(Long supportTicketId, Pageable pageable);
    
        // List<Message> findBySupportTicketIdOrderByCreatedAtAsc(Long supportTicketId);

    Page<Message> findBySenderIdAndSenderType(UUID senderId, SenderType senderType, Pageable pageable);

        // removed legacy countBySupportTicketId
        // long countBySupportTicketId(Long supportTicketId);
}

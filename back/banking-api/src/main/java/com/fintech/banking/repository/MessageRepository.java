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

    Page<Message> findBySessionIdOrderByCreatedAtDesc(Long sessionId, Pageable pageable);

    List<Message> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    List<Message> findBySessionIdOrderByCreatedAtDesc(Long sessionId);

    List<Message> findBySessionIdAndSenderType(Long sessionId, SenderType senderType);

    List<Message> findBySessionIdAndIsInternalTrue(Long sessionId);

    List<Message> findBySessionIdAndIsInternalFalse(Long sessionId);

    List<Message> findBySessionIdAndContentContainingIgnoreCase(Long sessionId, String keyword);

    long countBySessionId(Long sessionId);

    // Legacy support for backward compatibility
        // Legacy support removed: messages are linked by sessionId
        // Page<Message> findBySupportTicketIdOrderByCreatedAtDesc(Long supportTicketId, Pageable pageable);
    
        // List<Message> findBySupportTicketIdOrderByCreatedAtAsc(Long supportTicketId);

    Page<Message> findBySenderIdAndSenderType(UUID senderId, SenderType senderType, Pageable pageable);

        // removed legacy countBySupportTicketId
        // long countBySupportTicketId(Long supportTicketId);
}

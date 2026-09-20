package com.fintech.banking.service;

import com.fintech.banking.domain.entity.Message;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.enums.SenderType;
import com.fintech.banking.repository.MessageRepository;
import com.fintech.banking.repository.SessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final SessionRepository sessionRepository;

    /**
     * Creates a new message in a session
     */
    @Transactional
    public Message createMessage(UUID sessionId, UUID senderId, SenderType senderType, 
                                  String content, Boolean isInternal, String intent, JsonNode parameters) {
        return createMessage(sessionId, senderId, senderType, content, isInternal, intent, parameters,
                null, false, null);
    }

    /**
     * Creates a new message in a session, including bilingual detection and RAG
     * traceability metadata (cahier des charges section 8.3: detected_lang,
     * rag_used, rag_source).
     */
    @Transactional
    public Message createMessage(UUID sessionId, UUID senderId, SenderType senderType,
                                  String content, Boolean isInternal, String intent, JsonNode parameters,
                                  String detectedLang, Boolean ragUsed, String ragSource) {
        Message message = Message.builder()
            .sessionId(sessionId)
            .senderId(senderId)
            .senderType(senderType)
            .content(content)
            .isInternal(isInternal != null && isInternal)
            .intent(intent)
            .parameters(parameters)
            .detectedLang(detectedLang == null || detectedLang.isBlank() ? "FR" : detectedLang)
            .ragUsed(ragUsed != null && ragUsed)
            .ragSource(ragSource)
            .build();

        message = messageRepository.save(message);
        log.info("Message created in session: {}", sessionId);
        return message;
    }

    /**
     * Gets a message by ID
     */
    public Optional<Message> getMessageById(Long messageId) {
        return messageRepository.findById(messageId);
    }

    /**
     * Gets all messages for a session (paginated, descending order)
     */
    public Page<Message> getSessionMessages(UUID sessionId, Pageable pageable) {
        return messageRepository.findBySessionIdOrderByCreatedAtDesc(sessionId, pageable);
    }

    /**
     * Gets all messages for a session (list, ascending order for conversation)
     */
    public List<Message> getSessionMessagesList(UUID sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    /**
     * Gets message count for a session
     */
    public long getMessageCount(UUID sessionId) {
        return messageRepository.countBySessionId(sessionId);
    }

    /**
     * Gets messages by sender type
     */
    public List<Message> getMessagesBySenderType(UUID sessionId, SenderType senderType) {
        return messageRepository.findBySessionIdAndSenderType(sessionId, senderType);
    }

    /**
     * Gets internal messages only (admin/system messages)
     */
    public List<Message> getInternalMessages(UUID sessionId) {
        return messageRepository.findBySessionIdAndIsInternalTrue(sessionId);
    }

    /**
     * Gets user-visible messages (public messages)
     */
    public List<Message> getPublicMessages(UUID sessionId) {
        return messageRepository.findBySessionIdAndIsInternalFalse(sessionId);
    }

    /**
     * Searches messages by content keyword
     */
    public List<Message> searchMessages(UUID sessionId, String keyword) {
        return messageRepository.findBySessionIdAndContentContainingIgnoreCase(sessionId, keyword);
    }

    /**
     * Gets latest message in a session
     */
    public Optional<Message> getLatestMessage(UUID sessionId) {
        List<Message> messages = messageRepository.findBySessionIdOrderByCreatedAtDesc(sessionId);
        return messages.isEmpty() ? Optional.empty() : Optional.of(messages.get(0));
    }

    /**
     * Deletes a message (soft delete approach - could implement as flag instead)
     */
    @Transactional
    public void deleteMessage(Long messageId) {
        messageRepository.deleteById(messageId);
        log.info("Message deleted: {}", messageId);
    }

    /**
     * Deletes all messages in a session
     */
    @Transactional
    public void deleteSessionMessages(UUID sessionId) {
        List<Message> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        messageRepository.deleteAll(messages);
        log.info("All messages deleted for session: {}", sessionId);
    }
}

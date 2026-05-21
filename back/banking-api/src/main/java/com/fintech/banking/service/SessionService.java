package com.fintech.banking.service;

import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.SessionStatus;
import com.fintech.banking.repository.SessionRepository;
import com.fintech.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
public class SessionService {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final int SESSION_TIMEOUT_MINUTES = 30;
    private static final int INACTIVITY_TIMEOUT_MINUTES = 15;

    /**
     * Creates a new session for a user
     */
    @Transactional
    public Session createSession(UUID userId, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Session session = Session.builder()
            .userId(userId)
            .status(SessionStatus.OPENED)
            .ipAddress(ipAddress)
            .createdAt(LocalDateTime.now())
            .lastActivityAt(LocalDateTime.now())
            .build();

        session = sessionRepository.save(session);
        log.info("Session created for user: {}", userId);
        return session;
    }

    /**
     * Opens/activates a session
     */
    @Transactional
    public Session openSession(UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));

        session.open();
        session.setStatus(SessionStatus.ACTIVE);
        return sessionRepository.save(session);
    }

    /**
     * Closes a session
     */
    @Transactional
    public Session closeSession(UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));

        session.close();
        return sessionRepository.save(session);
    }

    /**
     * Records user activity on the session
     */
    @Transactional
    public Session recordActivity(UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));

        session.setLastActivityAt(LocalDateTime.now());

        // Check if session has expired due to inactivity
        LocalDateTime inactivityThreshold = LocalDateTime.now().minusMinutes(INACTIVITY_TIMEOUT_MINUTES);
        if (session.getLastActivityAt().isBefore(inactivityThreshold)) {
            session.setStatus(SessionStatus.EXPIRED);
            notificationService.notifySessionExpired(session.getUserId());
        }

        return sessionRepository.save(session);
    }

    /**
     * Gets active sessions for a user
     */
    public List<Session> getActiveSessions(UUID userId) {
        return sessionRepository.findByUserIdAndStatus(userId, SessionStatus.ACTIVE);
    }

    /**
     * Gets all sessions for a user (including expired)
     */
    public List<Session> getAllSessions(UUID userId) {
        return sessionRepository.findByUserId(userId);
    }

    /**
     * Checks if a session is still valid (active and not expired)
     */
    public boolean isSessionValid(UUID sessionId) {
        Optional<Session> session = sessionRepository.findById(sessionId);
        if (session.isEmpty()) {
            return false;
        }

        Session s = session.get();
        return s.isActive() && !hasSessionExpired(s);
    }

    /**
     * Checks if session has expired due to timeout
     */
    public boolean hasSessionExpired(Session session) {
        if (session.getStatus() == SessionStatus.EXPIRED || session.getStatus() == SessionStatus.CLOSED) {
            return true;
        }

        LocalDateTime sessionTimeout = session.getCreatedAt().plusMinutes(SESSION_TIMEOUT_MINUTES);
        if (LocalDateTime.now().isAfter(sessionTimeout)) {
            session.setStatus(SessionStatus.EXPIRED);
            sessionRepository.save(session);
            return true;
        }

        return false;
    }

    /**
     * Closes all active sessions for a user (e.g., on logout or security event)
     */
    @Transactional
    public void closeAllSessionsForUser(UUID userId) {
        List<Session> activeSessions = getActiveSessions(userId);
        activeSessions.forEach(session -> {
            session.close();
            sessionRepository.save(session);
        });
        log.info("All sessions closed for user: {}", userId);
    }

    /**
     * Expires sessions that have timed out
     */
    @Transactional
    public void expireTimedOutSessions() {
        LocalDateTime expiryThreshold = LocalDateTime.now().minusMinutes(SESSION_TIMEOUT_MINUTES);
        List<Session> sessions = sessionRepository.findByStatusAndClosedAtIsNull(SessionStatus.ACTIVE);

        sessions.forEach(session -> {
            if (session.getCreatedAt().isBefore(expiryThreshold)) {
                session.setStatus(SessionStatus.EXPIRED);
                sessionRepository.save(session);
            }
        });

        log.info("Session timeout check completed");
    }

    /**
     * Gets session by ID
     */
    public Optional<Session> getSessionById(UUID sessionId) {
        return sessionRepository.findById(sessionId);
    }

    /**
     * Gets session by agent ID (for agent operations)
     */
    public Optional<Session> getSessionByAgentId(UUID agentId) {
        return sessionRepository.findByAgentId(agentId);
    }
}

package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SecurityEvent;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.SecurityEventType;
import com.fintech.banking.repository.SecurityEventRepository;
import com.fintech.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Helps administrators investigate a security event: explains how it happens and
 * proposes a solution. Suggestions are advisory; the admin reviews and submits them.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminSecurityEventAssistantService {

    private final SecurityEventRepository securityEventRepository;
    private final UserRepository userRepository;
    private final IntentDetectionService intentDetectionService;

    public record Analysis(
            String explanation,
            String incidentSummary,
            String investigationFindings,
            String correctiveActions,
            String preventiveMeasures,
            String aiAssessment,
            boolean aiGenerated) {
    }

    public Analysis analyze(UUID eventId) {
        SecurityEvent event = securityEventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Security event not found"));
        if (Boolean.TRUE.equals(event.getResolved())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This security event is already resolved");
        }

        User user = userRepository.findById(event.getUserId()).orElse(null);
        List<SecurityEvent> recent = securityEventRepository.findByUserIdOrderByTimestampDesc(event.getUserId());
        long sameType = recent.stream().filter(e -> e.getType() == event.getType()).count();

        String findings = buildFindings(event, user, recent.size(), sameType);
        Analysis base = baseline(event.getType(), findings);

        String aiText = askAi(event, user, findings);
        if (aiText == null || aiText.isBlank()) {
            return base;
        }
        return new Analysis(base.explanation(), base.incidentSummary(), base.investigationFindings(),
                base.correctiveActions(), base.preventiveMeasures(), aiText.trim(), true);
    }

    private String askAi(SecurityEvent event, User user, String findings) {
        String prompt = """
                You are assisting a bank security administrator. In English, concisely:
                1) describe how this kind of security event typically happens,
                2) assess the likelihood it is a real attack versus a false positive using only the facts below,
                3) propose a concrete, prioritized remediation plan.
                Do not invent facts, do not ask for passwords or codes. The administrator will review your advice.
                Event type: %s
                """.formatted(event.getType());
        try {
            return intentDetectionService.generateReply(prompt, findings, "");
        } catch (RuntimeException ex) {
            log.warn("AI security analysis unavailable, using deterministic guidance: {}", ex.getMessage());
            return null;
        }
    }

    private String buildFindings(SecurityEvent event, User user, int totalEvents, long sameType) {
        StringBuilder sb = new StringBuilder();
        sb.append("Event type: ").append(event.getType()).append('\n');
        sb.append("Detected at: ").append(event.getTimestamp()).append('\n');
        sb.append("Source IP: ").append(event.getIpAddress() == null || event.getIpAddress().isBlank()
                ? "not recorded" : event.getIpAddress()).append('\n');
        sb.append("Device: ").append(event.getDeviceId() == null || event.getDeviceId().isBlank()
                ? "not recorded (login from API/browser without device fingerprint)" : event.getDeviceId()).append('\n');
        if (user != null) {
            sb.append("Account status (now): ").append(user.getStatus()).append('\n');
            sb.append("Failed attempts since last success: ").append(user.getFailedLoginAttempts()).append('\n');
            sb.append("Lock: ").append(user.getLockedUntil() == null
                    ? "no active lock (expired or released)" : "until " + user.getLockedUntil()).append('\n');
            sb.append("Two-factor: ").append(Boolean.TRUE.equals(user.getTwoFactorEnabled()) ? "enabled" : "disabled").append('\n');
        }
        sb.append("History: ").append(totalEvents).append(" security event(s) for this user, ")
                .append(sameType).append(" of this type");
        return sb.toString();
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private Analysis baseline(SecurityEventType type, String findings) {
        return switch (type) {
            case BRUTE_FORCE -> new Analysis(
                    "A brute-force attack happens when an attacker (or script) tries many passwords against one account until one works. The platform counts consecutive failed logins and flags the pattern.",
                    "Repeated failed login attempts were detected on the customer account.",
                    findings,
                    "1. Confirm the account is locked. 2. Contact the customer through a verified channel to ask whether they were the one logging in. 3. If not, force a password reset and revoke active sessions. 4. Block the source IP if it is abusive.",
                    "Enable two-factor authentication, enforce strong passwords, add IP rate limiting and alerting on repeated failures.",
                    null, false);
            case ACCOUNT_LOCKED -> new Analysis(
                    "An account is locked automatically after too many failed logins, to stop password guessing. It can be a forgetful customer or the end of an attack.",
                    "The customer account was automatically locked after repeated failed logins.",
                    findings,
                    "1. Check whether failed attempts came from a known device or IP. 2. Verify the customer's identity out-of-band. 3. Unlock the account or require a password reset, depending on the verification.",
                    "Offer self-service password recovery, enable two-factor authentication and educate customers on credential hygiene.",
                    null, false);
            case REUSE_DETECTED -> new Analysis(
                    "Refresh-token reuse happens when an already-used token is presented again, typically because the token was stolen and both the attacker and the user are using it. The platform revokes all sessions and blocks the account as a precaution.",
                    "A refresh token was reused, indicating possible session theft; sessions were revoked and the account blocked.",
                    findings,
                    "1. Keep the account blocked until the customer is verified. 2. Check recent transfers and profile changes for fraud. 3. Require a password reset and re-login on all devices. 4. Look for malware or phishing exposure with the customer.",
                    "Shorten token lifetimes, bind tokens to devices, enforce two-factor authentication and monitor for unusual device changes.",
                    null, false);
            case SUSPICIOUS_ACTIVITY -> new Analysis(
                    "Suspicious activity is raised when behavior deviates from the customer's usual pattern (new device, unusual location, abnormal amounts or velocity).",
                    "Behavior inconsistent with the customer's normal pattern was detected.",
                    findings,
                    "1. Review recent transactions and logins in the audit log. 2. Contact the customer to confirm the activity. 3. If unconfirmed, block the account, reverse or hold affected operations and escalate to fraud handling.",
                    "Tune detection thresholds, require step-up authentication for risky operations and notify customers of new-device logins.",
                    null, false);
        };
    }
}

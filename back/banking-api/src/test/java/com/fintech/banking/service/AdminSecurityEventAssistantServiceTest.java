package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SecurityEvent;
import com.fintech.banking.domain.enums.SecurityEventType;
import com.fintech.banking.repository.SecurityEventRepository;
import com.fintech.banking.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AdminSecurityEventAssistantServiceTest {

    private final SecurityEventRepository events = Mockito.mock(SecurityEventRepository.class);
    private final UserRepository users = Mockito.mock(UserRepository.class);
    private final IntentDetectionService ai = Mockito.mock(IntentDetectionService.class);
    private final AdminSecurityEventAssistantService service =
            new AdminSecurityEventAssistantService(events, users, ai);

    private SecurityEvent event() {
        SecurityEvent e = SecurityEvent.builder().id(UUID.randomUUID()).userId(UUID.randomUUID())
                .type(SecurityEventType.BRUTE_FORCE).build();
        when(events.findById(e.getId())).thenReturn(Optional.of(e));
        when(users.findById(e.getUserId())).thenReturn(Optional.empty());
        when(events.findByUserIdOrderByTimestampDesc(e.getUserId())).thenReturn(List.of(e));
        return e;
    }

    @Test
    void fallsBackToDeterministicGuidanceWhenAiFails() {
        SecurityEvent e = event();
        when(ai.generateReply(any(), any(), any())).thenThrow(new RuntimeException("down"));
        var result = service.analyze(e.getId());
        assertFalse(result.aiGenerated());
        assertFalse(result.correctiveActions().isBlank());
    }

    @Test
    void includesAiAssessmentWhenAvailable() {
        SecurityEvent e = event();
        when(ai.generateReply(any(), any(), any())).thenReturn("Likely attack");
        var result = service.analyze(e.getId());
        assertTrue(result.aiGenerated());
        assertEquals("Likely attack", result.aiAssessment());
    }
}

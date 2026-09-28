package com.fintech.banking.service;

import com.fintech.banking.domain.entity.Notification;
import com.fintech.banking.repository.NotificationRepository;
import com.fintech.banking.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void markAsReadOnlyFindsNotificationForAuthenticatedUser() {
        UUID notificationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Notification notification = Notification.builder()
                .id(notificationId)
                .userId(userId)
                .isRead(false)
                .build();
        when(notificationRepository.findByIdAndUserId(notificationId, userId))
                .thenReturn(Optional.of(notification));

        Notification result = notificationService.markAsRead(notificationId, userId);

        assertTrue(result.getIsRead());
        verify(notificationRepository).save(notification);
    }

    @Test
    void markAsReadDoesNotChangeNotificationOwnedByAnotherUser() {
        UUID notificationId = UUID.randomUUID();
        UUID authenticatedUserId = UUID.randomUUID();
        when(notificationRepository.findByIdAndUserId(notificationId, authenticatedUserId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> notificationService.markAsRead(notificationId, authenticatedUserId));

        verify(notificationRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}

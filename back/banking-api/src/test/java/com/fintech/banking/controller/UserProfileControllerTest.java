package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.TokenService;
import com.fintech.banking.service.EmailService;
import com.fintech.banking.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private TokenService tokenService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private Authentication authentication;

    private UserProfileController controller;
    private User user;

    @BeforeEach
    void setUp() {
        controller = new UserProfileController(
                userRepository,
                supportTicketRepository,
                tokenService,
                passwordEncoder,
                notificationService,
                emailService);
        user = User.builder()
                .id(UUID.randomUUID())
                .name("Client")
                .email("old@example.com")
                .password("encoded-password")
                .createdAt(LocalDateTime.now())
                .build();
        when(authentication.getName()).thenReturn(user.getEmail());
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    @Test
    void changesEmailAfterApprovedEmailVerificationAndPasswordCheck() {
        when(passwordEncoder.matches("current-password", user.getPassword())).thenReturn(true);
        SupportTicket ticket = SupportTicket.builder()
                .id(24L)
                .userId(user.getId())
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.RESOLVED)
                .subject("Email address change verification")
                .build();
        when(supportTicketRepository.findByUserIdAndTicketTypeAndStatus(
                user.getId(), TicketType.DATA_UPDATE, TicketStatus.RESOLVED)).thenReturn(List.of(ticket));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        UserProfileController.ChangeEmailRequest request = new UserProfileController.ChangeEmailRequest();
        request.setEmail(" NEW@example.com ");
        request.setCurrentPassword("current-password");

        var response = controller.changeEmail(request, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("new@example.com", user.getEmail());
        assertEquals(TicketStatus.CLOSED, ticket.getStatus());
        verify(userRepository).save(user);
        verify(supportTicketRepository).save(ticket);
        verify(notificationService).notifyEmailChanged(user.getId(), "new@example.com");
        verify(emailService).sendEmailChangedConfirmation("new@example.com", "Client");
    }

    @Test
    void changesEmailForGenericDataUpdateSubjectWhenDescriptionRequestsEmailChange() {
        when(passwordEncoder.matches("current-password", user.getPassword())).thenReturn(true);
        SupportTicket ticket = SupportTicket.builder()
                .id(31L)
                .userId(user.getId())
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.RESOLVED)
                .subject("Demande de modification de données")
                .description("Chat support request: je veux modifer mon email de nouveau")
                .build();
        when(supportTicketRepository.findByUserIdAndTicketTypeAndStatus(
                user.getId(), TicketType.DATA_UPDATE, TicketStatus.RESOLVED)).thenReturn(List.of(ticket));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        UserProfileController.ChangeEmailRequest request = new UserProfileController.ChangeEmailRequest();
        request.setEmail("new@example.com");
        request.setCurrentPassword("current-password");

        var response = controller.changeEmail(request, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("new@example.com", user.getEmail());
        assertEquals(TicketStatus.CLOSED, ticket.getStatus());
        verify(notificationService).notifyEmailChanged(user.getId(), "new@example.com");
        verify(emailService).sendEmailChangedConfirmation("new@example.com", "Client");
    }

    @Test
    void keepsEmailChangeSuccessfulWhenSuccessNotificationsFail() {
        when(passwordEncoder.matches("current-password", user.getPassword())).thenReturn(true);
        SupportTicket ticket = SupportTicket.builder()
                .id(32L)
                .userId(user.getId())
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.RESOLVED)
                .subject("Email address change verification")
                .build();
        when(supportTicketRepository.findByUserIdAndTicketTypeAndStatus(
                user.getId(), TicketType.DATA_UPDATE, TicketStatus.RESOLVED)).thenReturn(List.of(ticket));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        doThrow(new RuntimeException("notification storage unavailable"))
                .when(notificationService).notifyEmailChanged(user.getId(), "new@example.com");
        doThrow(new RuntimeException("mail provider unavailable"))
                .when(emailService).sendEmailChangedConfirmation("new@example.com", "Client");

        UserProfileController.ChangeEmailRequest request = new UserProfileController.ChangeEmailRequest();
        request.setEmail("new@example.com");
        request.setCurrentPassword("current-password");

        var response = controller.changeEmail(request, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("new@example.com", user.getEmail());
        assertEquals(TicketStatus.CLOSED, ticket.getStatus());
        verify(userRepository).save(user);
        verify(supportTicketRepository).save(ticket);
    }

    @Test
    void refusesEmailChangeUntilEmailVerificationTicketIsResolved() {
        when(passwordEncoder.matches("current-password", user.getPassword())).thenReturn(true);
        when(supportTicketRepository.findByUserIdAndTicketTypeAndStatus(
                user.getId(), TicketType.DATA_UPDATE, TicketStatus.RESOLVED)).thenReturn(List.of());
        UserProfileController.ChangeEmailRequest request = new UserProfileController.ChangeEmailRequest();
        request.setEmail("new@example.com");
        request.setCurrentPassword("current-password");

        var response = controller.changeEmail(request, authentication);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void refusesEmailChangeWhenCurrentPasswordIsIncorrect() {
        when(passwordEncoder.matches("wrong-password", user.getPassword())).thenReturn(false);
        UserProfileController.ChangeEmailRequest request = new UserProfileController.ChangeEmailRequest();
        request.setEmail("new@example.com");
        request.setCurrentPassword("wrong-password");

        var response = controller.changeEmail(request, authentication);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(supportTicketRepository, never())
                .findByUserIdAndTicketTypeAndStatus(any(), any(), any());
        verify(userRepository, never()).save(any(User.class));
    }
}

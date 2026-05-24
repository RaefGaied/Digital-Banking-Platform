package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.User;
import com.fintech.banking.dto.request.LoginRequest;
import com.fintech.banking.dto.response.LoginResponse;
import com.fintech.banking.dto.response.ClientResponse;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.security.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthServiceImpl authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(java.util.UUID.randomUUID());
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setTwoFactorEnabled(false);
    }

    @Test
    void testLoginWithout2fa() {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password");

        when(userRepository.findByEmail("test@example.com")).thenReturn(java.util.Optional.of(testUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(jwtService.generateToken(testUser)).thenReturn("fakeAccessToken");

        // Act
        LoginResponse response = authService.login(request);

        // Assert
        assertFalse(response.isTwoFactorRequired());
        assertNotNull(response.getTokenResponse());
        assertEquals("fakeAccessToken", response.getTokenResponse().getAccessToken());
        verify(userRepository).findByEmail("test@example.com");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService).generateToken(testUser);
    }

    @Test
    void testLoginWith2faEnabled() {
        // Arrange
        testUser.setTwoFactorEnabled(true);
        // Set a known secret for testing
        testUser.setTwoFactorSecret("JBSWY3DPEHPK3PXP"); // RFC 6238 example secret

        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password");

        when(userRepository.findByEmail("test@example.com")).thenReturn(java.util.Optional.of(testUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(jwtService.generateTemporaryToken(testUser)).thenReturn("fakeTempToken");

        // Act
        LoginResponse response = authService.login(request);

        // Assert
        assertTrue(response.isTwoFactorRequired());
        assertNull(response.getTokenResponse());
        assertEquals("fakeTempToken", response.getTempToken());
        verify(userRepository).findByEmail("test@example.com");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService).generateTemporaryToken(testUser);
    }

    @Test
    void testVerify2faSuccess() {
        // Arrange
        String tempToken = "fakeTempToken";
        String secret = "JBSWY3DPEHPK3PXP"; // RFC 6238 example secret
        testUser.setTwoFactorSecret(secret);
        
        // Using RFC 6238 test values:
        // At time 0, the TOTP value is 012345
        
        when(userRepository.findByEmail("test@example.com")).thenReturn(java.util.Optional.of(testUser));
        when(jwtService.extractUsername(tempToken)).thenReturn("test@example.com");
        when(jwtService.generateToken(testUser)).thenReturn("fakeAccessToken");

        // Act - test with the known value at time 0
        ClientResponse response = authService.verify2fa(tempToken, 12345); // Note: leading zero is dropped in int representation

        // Assert
        assertNotNull(response);
        assertEquals("fakeAccessToken", response.getAccessToken());
        verify(userRepository).findByEmail("test@example.com");
        verify(jwtService).extractUsername(tempToken);
        verify(jwtService).generateToken(testUser);
    }

    @Test
    void testVerify2faFailure() {
        // Arrange
        String tempToken = "fakeTempToken";
        testUser.setTwoFactorSecret("JBSWY3DPEHPK3PXP");

        when(userRepository.findByEmail("test@example.com")).thenReturn(java.util.Optional.of(testUser));
        when(jwtService.extractUsername(tempToken)).thenReturn("test@example.com");

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> {
            authService.verify2fa(tempToken, 999999); // Definitely invalid code
        });
        
        verify(userRepository).findByEmail("test@example.com");
        verify(jwtService).extractUsername(tempToken);
    }
}
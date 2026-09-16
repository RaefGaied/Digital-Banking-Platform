package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.User;
import com.fintech.banking.dto.request.LoginRequest;
import com.fintech.banking.dto.response.LoginResponse;
import com.fintech.banking.dto.response.ClientResponse;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.RefreshTokenRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.security.service.JwtService;
import com.fintech.banking.service.AuditLogService;
import com.fintech.banking.service.SecurityEventService;
import com.fintech.banking.util.TotpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private SecurityEventService securityEventService;

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
        verify(userRepository, atLeastOnce()).findByEmail("test@example.com");
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
        verify(userRepository, atLeastOnce()).findByEmail("test@example.com");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService).generateTemporaryToken(testUser);
    }

    @Test
    void testVerify2faSuccess() throws Exception {
        // Arrange
        String tempToken = "fakeTempToken";
        String secret = "JBSWY3DPEHPK3PXP"; // RFC 6238 example secret
        testUser.setTwoFactorSecret(secret);

        when(userRepository.findByEmail("test@example.com")).thenReturn(java.util.Optional.of(testUser));
        when(jwtService.extractUsername(tempToken)).thenReturn("test@example.com");
        when(jwtService.generateToken(testUser)).thenReturn("fakeAccessToken");

        int validCode = generateValidTotpCode(secret);

        // Act
        ClientResponse response = authService.verify2fa(tempToken, validCode);

        // Assert
        assertNotNull(response);
        assertEquals("fakeAccessToken", response.getAccessToken());
        verify(userRepository).findByEmail("test@example.com");
        verify(jwtService).extractUsername(tempToken);
        verify(jwtService).generateToken(testUser);
    }

    private int generateValidTotpCode(String secret) throws Exception {
        var method = TotpUtil.class.getDeclaredMethod("calculateTotp", String.class, long.class);
        method.setAccessible(true);
        long timeStep = Instant.now().getEpochSecond() / 30;
        return ((Number) method.invoke(null, secret, timeStep)).intValue();
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
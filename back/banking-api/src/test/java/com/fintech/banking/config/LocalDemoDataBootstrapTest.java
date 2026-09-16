package com.fintech.banking.config;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AccountStatus;
import com.fintech.banking.domain.enums.UserRole;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocalDemoDataBootstrapTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CardRepository cardRepository;

    @Mock
    private InvestmentRepository investmentRepository;

    @Mock
    private PaymentKeyRepository paymentKeyRepository;

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private WorkflowTaskRepository workflowTaskRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private LocalDemoDataBootstrap bootstrap;

    @Test
    void ensureUserHandlesNullBalanceWithoutThrowing() {
        User user = User.builder()
            .name("System Assistant")
            .email("system@finbank.local")
            .password("encoded")
            .role(UserRole.ADMIN)
            .status(UserStatus.ACTIVE)
            .active(true)
            .build();

        Account account = Account.builder()
            .user(user)
            .agency("0001")
            .number("101010-1")
            .balance(BigDecimal.ZERO)
            .status(AccountStatus.ACTIVE)
            .build();

        when(userRepository.findByEmail("system@finbank.local")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("System@1234!")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(accountRepository.findByNumber("101010-1")).thenReturn(Optional.empty());
        when(accountRepository.save(any(Account.class))).thenReturn(account);

        User result = (User) ReflectionTestUtils.invokeMethod(
            bootstrap,
            "ensureUser",
            "System Assistant",
            "system@finbank.local",
            "System@1234!",
            UserRole.ADMIN,
            null,
            "0001",
            "101010-1"
        );

        assertNotNull(result);
    }
}

package com.fintech.banking.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.dto.response.AccountResponse;
import com.fintech.banking.service.AccountService;
import com.fintech.banking.service.BankingAgentService;
import com.fintech.banking.service.FlowableService;
import com.fintech.banking.service.FlowableTaskCompletionService;
import com.fintech.banking.service.KnowledgeBaseService;
import com.fintech.banking.service.TransactionService;
import com.fintech.banking.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BankingMcpToolsTest {

    private final AccountService accountService = Mockito.mock(AccountService.class);
    private final TransactionService transactionService = Mockito.mock(TransactionService.class);
    private final KnowledgeBaseService knowledgeBaseService = Mockito.mock(KnowledgeBaseService.class);
    private final BankingAgentService bankingAgentService = Mockito.mock(BankingAgentService.class);
    private final FlowableService flowableService = Mockito.mock(FlowableService.class);
    private final FlowableTaskCompletionService flowableTaskCompletionService =
            Mockito.mock(FlowableTaskCompletionService.class);
    private final UserRepository userRepository = Mockito.mock(UserRepository.class);
    private final BankingMcpTools tools = new BankingMcpTools(
            accountService,
            transactionService,
            knowledgeBaseService,
            bankingAgentService,
            flowableService,
            flowableTaskCompletionService,
            new ObjectMapper(),
            userRepository);

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void accountToolUsesAuthenticatedIdentity() {
        authenticate("client@example.com");
        AccountResponse account = Mockito.mock(AccountResponse.class);
        when(accountService.getMyAccount("client@example.com")).thenReturn(account);

        assertEquals(account, tools.getMyAccount());

        verify(accountService).getMyAccount("client@example.com");
    }

    @Test
    void prepareTransferOnlyCreatesPendingPlan() {
        authenticate("client@example.com");

        Map<String, Object> result = tools.prepareTransfer(
                BigDecimal.valueOf(500),
                "121711104");

        assertEquals("PENDING_CONFIRMATION", result.get("status"));
        assertEquals(BigDecimal.valueOf(500), result.get("amount"));
        assertEquals("121711104", result.get("destinationAccount"));
        verify(transactionService, never()).transfer(any(), any());
    }

    @Test
    void adminToolRejectsRegularUser() {
        authenticate("client@example.com");

        assertThrows(SecurityException.class, tools::listAdminTasks);
        verify(flowableService, never()).listAdminTasks();
    }

    @Test
    void authenticatedUserIdIsResolvedFromAuthenticatedEmail() {
        authenticate("client@example.com");
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        when(userRepository.findByEmail("client@example.com")).thenReturn(Optional.of(user));
        when(bankingAgentService.getAgentByIdAndUserId(any(), org.mockito.ArgumentMatchers.eq(userId)))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> tools.getAgent(UUID.randomUUID().toString()));
    }

    private void authenticate(String email) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, List.of()));
    }
}

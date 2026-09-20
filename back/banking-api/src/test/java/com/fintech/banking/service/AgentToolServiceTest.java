package com.fintech.banking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.CardBrand;
import com.fintech.banking.domain.enums.CardType;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.domain.entity.Card;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.dto.response.CardResponse;
import com.fintech.banking.dto.response.AccountResponse;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AgentToolServiceTest {

    private final BankingAgentService bankingAgentService = Mockito.mock(BankingAgentService.class);
    private final AccountService accountService = Mockito.mock(AccountService.class);
    private final TransactionService transactionService = Mockito.mock(TransactionService.class);
        private final CardService cardService = Mockito.mock(CardService.class);
    private final SupportTicketService supportTicketService = Mockito.mock(SupportTicketService.class);
    private final UserRepository userRepository = Mockito.mock(UserRepository.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AgentToolService agentToolService = new AgentToolService(
            bankingAgentService,
            accountService,
            transactionService,
            cardService,
            supportTicketService,
            userRepository
    );

    @Test
    void onlyReturnsTheAuthenticatedUsersAccountNumber() {
        BankingAgent agent = new BankingAgent();
        UUID userId = UUID.randomUUID();
        agent.setUserId(userId);
        User user = new User();
        user.setEmail("client@example.com");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(accountService.getMyAccount("client@example.com")).thenReturn(AccountResponse.builder()
                .number("102030-4")
                .build());

        IntentResult intent = new IntentResult();
        intent.setIntent(IntentType.ACCOUNT);

        AgentToolService.AgentToolResult result = agentToolService.executeToolAction(
                agent, new Session(), intent, "what account numbers exist then?");

        assertEquals("own_account_number", result.getAction());
        assertTrue(result.getBotMessage().contains("102030-4"));
        assertFalse(result.getBotMessage().contains("204060-8"));
    }

    @Test
    void confirmsTransferAndExecutesIt() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("client@example.com");

        BankingAgent agent = new BankingAgent();
        agent.setId(UUID.randomUUID());
        agent.setUserId(userId);
        ObjectNode context = objectMapper.createObjectNode();
        context.put("pendingToolAction", "confirm_transfer");
        ObjectNode arguments = objectMapper.createObjectNode();
        arguments.put("amount", 2500);
        arguments.put("targetAccountNumber", "FR-001");
        context.set("pendingToolArguments", arguments);
        agent.setContext(context);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(bankingAgentService.getPendingToolAction(agent)).thenReturn("confirm_transfer");
        when(bankingAgentService.getPendingToolArguments(agent)).thenReturn(arguments);
        when(transactionService.transfer(eq("client@example.com"), any(TransactionRequest.class)))
                .thenReturn(TransactionResponse.builder()
                        .status(TransactionStatus.COMPLETED)
                        .amount(BigDecimal.valueOf(2500))
                        .targetAccountNumber("FR-001")
                        .build());

        AgentToolService.AgentToolResult result = agentToolService.handlePendingToolConfirmation(
                agent,
                new Session(),
                "oui",
                new IntentResult()
        );

        assertTrue(result.getBotMessage().contains("effectué avec succès"));
        assertEquals("execute_transfer", result.getAction());
        verify(bankingAgentService).clearPendingToolAction(agent.getId());
    }

        @Test
        void confirmsTransferWhenUserSaysFaitLe() {
                UUID userId = UUID.randomUUID();
                User user = new User();
                user.setId(userId);
                user.setEmail("client@example.com");

                BankingAgent agent = new BankingAgent();
                agent.setId(UUID.randomUUID());
                agent.setUserId(userId);
                ObjectNode context = objectMapper.createObjectNode();
                context.put("pendingToolAction", "confirm_transfer");
                ObjectNode arguments = objectMapper.createObjectNode();
                arguments.put("amount", 2500);
                arguments.put("targetAccountNumber", "FR-001");
                context.set("pendingToolArguments", arguments);
                agent.setContext(context);

                when(userRepository.findById(userId)).thenReturn(Optional.of(user));
                when(bankingAgentService.getPendingToolAction(agent)).thenReturn("confirm_transfer");
                when(bankingAgentService.getPendingToolArguments(agent)).thenReturn(arguments);
                when(transactionService.transfer(eq("client@example.com"), any(TransactionRequest.class)))
                                .thenReturn(TransactionResponse.builder()
                                                .status(TransactionStatus.COMPLETED)
                                                .amount(BigDecimal.valueOf(2500))
                                                .targetAccountNumber("FR-001")
                                                .build());

                AgentToolService.AgentToolResult result = agentToolService.handlePendingToolConfirmation(
                                agent,
                                new Session(),
                                "fait le",
                                new IntentResult()
                );

                assertTrue(result.getBotMessage().contains("effectué avec succès"));
                assertEquals("execute_transfer", result.getAction());
                verify(bankingAgentService).clearPendingToolAction(agent.getId());
        }

        @Test
        void explainsWhenDestinationAccountDoesNotExist() {
                UUID userId = UUID.randomUUID();
                User user = new User();
                user.setId(userId);
                user.setEmail("client@example.com");

                BankingAgent agent = new BankingAgent();
                agent.setId(UUID.randomUUID());
                agent.setUserId(userId);
                ObjectNode context = objectMapper.createObjectNode();
                context.put("pendingToolAction", "confirm_transfer");
                ObjectNode arguments = objectMapper.createObjectNode();
                arguments.put("amount", 100);
                arguments.put("targetAccountNumber", "123456");
                arguments.put("english", true);
                context.set("pendingToolArguments", arguments);
                agent.setContext(context);

                when(userRepository.findById(userId)).thenReturn(Optional.of(user));
                when(bankingAgentService.getPendingToolAction(agent)).thenReturn("confirm_transfer");
                when(bankingAgentService.getPendingToolArguments(agent)).thenReturn(arguments);
                when(transactionService.transfer(eq("client@example.com"), any(TransactionRequest.class)))
                        .thenThrow(new IllegalArgumentException("Destination account not found"));

                AgentToolService.AgentToolResult result = agentToolService.handlePendingToolConfirmation(
                        agent,
                        new Session(),
                        "yes",
                        new IntentResult()
                );

                assertTrue(result.getBotMessage().contains("123456 was not found"));
                assertEquals("execute_transfer_failed", result.getAction());
        }

        @Test
        void requestsRequiredDetailsForCardCreation() {
                UUID userId = UUID.randomUUID();
                User user = new User();
                user.setId(userId);
                user.setEmail("client@example.com");

                BankingAgent agent = new BankingAgent();
                agent.setId(UUID.randomUUID());
                agent.setUserId(userId);
                ObjectNode context = objectMapper.createObjectNode();
                context.put("pendingToolAction", "request_card_details");
                agent.setContext(context);

                when(userRepository.findById(userId)).thenReturn(Optional.of(user));

                IntentResult intent = new IntentResult();
                intent.setIntent(IntentType.CARD_CREATION);
                intent.setConfidence(0.9);
                intent.setIsSensitive(false);
                intent.setParameters(objectMapper.createObjectNode());

                AgentToolService.AgentToolResult result = agentToolService.executeToolAction(
                                agent,
                                new Session(),
                                intent,
                                "Je veux une carte de crédit"
                );

                assertEquals("request_card_details", result.getAction());
                assertTrue(result.getBotMessage().contains("type"));
                assertTrue(result.getBotMessage().contains("Visa"));
        }

        @Test
        void collectsCardDetailsAcrossTurns() {
                UUID userId = UUID.randomUUID();
                User user = new User();
                user.setId(userId);
                user.setEmail("client@example.com");

                BankingAgent agent = new BankingAgent();
                agent.setId(UUID.randomUUID());
                agent.setUserId(userId);
                ObjectNode context = objectMapper.createObjectNode();
                context.put("pendingToolAction", "request_card_details");
                agent.setContext(context);

                when(userRepository.findById(userId)).thenReturn(Optional.of(user));
                when(bankingAgentService.getPendingToolAction(agent)).thenReturn("request_card_details");
                when(bankingAgentService.getPendingToolArguments(agent)).thenReturn(null);

                AgentToolService.AgentToolResult result = agentToolService.handlePendingToolConfirmation(
                                agent, new Session(), "credit, visa 04/2030, 7895", new IntentResult());

                assertEquals("confirm_card_creation", result.getAction());
                assertTrue(result.getBotMessage().contains("04/2030"));
                verify(bankingAgentService).updateContextFields(eq(agent.getId()), any());
        }

        @Test
        void createsCardAfterConfirmation() {
                UUID userId = UUID.randomUUID();
                User user = new User();
                user.setId(userId);
                user.setEmail("client@example.com");
                user.setName("Client Example");

                BankingAgent agent = new BankingAgent();
                agent.setId(UUID.randomUUID());
                agent.setUserId(userId);
                ObjectNode context = objectMapper.createObjectNode();
                context.put("pendingToolAction", "confirm_card_creation");
                ObjectNode arguments = objectMapper.createObjectNode();
                arguments.put("cardType", "CREDIT");
                arguments.put("brand", "VISA");
                arguments.put("expiryMonth", 4);
                arguments.put("expiryYear", 2030);
                arguments.put("lastFour", "2316");
                context.set("pendingToolArguments", arguments);
                agent.setContext(context);

                when(userRepository.findById(userId)).thenReturn(Optional.of(user));
                when(userRepository.findByEmail("client@example.com")).thenReturn(Optional.of(user));
                when(bankingAgentService.getPendingToolAction(agent)).thenReturn("confirm_card_creation");
                when(bankingAgentService.getPendingToolArguments(agent)).thenReturn(arguments);
                when(cardService.createCard(eq("client@example.com"), any()))
                                .thenReturn(CardResponse.builder()
                                                .id(UUID.randomUUID())
                                                .cardType(CardType.CREDIT)
                                                .brand(CardBrand.VISA)
                                                .lastFour("2316")
                                                .expiryMonth(4)
                                                .expiryYear(2030)
                                                .build());

                AgentToolService.AgentToolResult result = agentToolService.handlePendingToolConfirmation(
                                agent, new Session(), "oui", new IntentResult());

                assertEquals("create_card", result.getAction());
                assertTrue(result.getBotMessage().contains("créée avec succès"));
                verify(cardService).createCard(eq("client@example.com"), any());
        }

        @Test
        void reportsExistingCardWhenUserAsksIfItWasCreated() {
                UUID userId = UUID.randomUUID();
                User user = new User();
                user.setId(userId);
                user.setEmail("client@example.com");

                BankingAgent agent = new BankingAgent();
                agent.setId(UUID.randomUUID());
                agent.setUserId(userId);
                agent.setContext(objectMapper.createObjectNode());

                when(userRepository.findById(userId)).thenReturn(Optional.of(user));
                when(cardService.getMyCards("client@example.com")).thenReturn(java.util.List.of(
                        CardResponse.builder()
                                .id(UUID.randomUUID())
                                .cardType(CardType.CREDIT)
                                .brand(CardBrand.VISA)
                                .lastFour("2316")
                                .expiryMonth(4)
                                .expiryYear(2030)
                                .build()
                ));

                IntentResult intent = new IntentResult();
                intent.setIntent(IntentType.CARD_CREATION);
                intent.setConfidence(0.9);
                intent.setIsSensitive(false);

                AgentToolService.AgentToolResult result = agentToolService.executeToolAction(
                                agent,
                                new Session(),
                                intent,
                                "est ce que la carte a ete cree??");

                assertEquals("card_status", result.getAction());
                assertTrue(result.getBotMessage().contains("a bien été créée"));
                assertTrue(result.getBotMessage().contains("2316"));
        }

        @Test
        void treatsCreationSentenceAsCardRequestInsteadOfStatusCheck() {
                UUID userId = UUID.randomUUID();
                User user = new User();
                user.setId(userId);
                user.setEmail("client@example.com");

                BankingAgent agent = new BankingAgent();
                agent.setId(UUID.randomUUID());
                agent.setUserId(userId);
                agent.setContext(objectMapper.createObjectNode());

                when(userRepository.findById(userId)).thenReturn(Optional.of(user));

                IntentResult intent = new IntentResult();
                intent.setIntent(IntentType.CARD_CREATION);
                intent.setConfidence(0.9);
                intent.setIsSensitive(false);

                AgentToolService.AgentToolResult result = agentToolService.executeToolAction(
                                agent,
                                new Session(),
                                intent,
                                "j ai cree une carte type credit mois 4 annee 2030 et les derniers chiffres sont 2316 we de brand visa");

                assertEquals("request_card_details", result.getAction());
                assertTrue(result.getBotMessage().contains("J'ai enregistré"));
        }
}

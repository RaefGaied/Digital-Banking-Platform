package com.fintech.banking.flowable;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.dto.response.WithdrawalInitiationResponse;
import com.fintech.banking.repository.TransactionRepository;
import com.fintech.banking.security.service.JwtService;
import com.fintech.banking.service.EmailService;
import com.fintech.banking.service.TransactionService;
import com.fintech.banking.service.WithdrawalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WithdrawalLifecycleIntegrationTest extends FlowableRuntimeTestSupport {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private WithdrawalService withdrawalService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EmailService emailService;

    @Test
    void withdrawalIsReservedAndRedeemedOnlyOnceByAnAdminCounterAgent() throws Exception {
        User customer = createUser();
        Account account = createAccount(customer, new BigDecimal("500.00"));
        TransactionRequest request = withdrawalRequest("125.00");

        WithdrawalInitiationResponse initiation = transactionService.withdraw(customer.getEmail(), request);
        assertThat(initiation.getStatus()).isEqualTo(TransactionStatus.PENDING);
        assertThat(accountRepository.findById(account.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("375.00");
        assertThat(transactionRepository.findById(initiation.getTransactionId()).orElseThrow().getStatus())
                .isEqualTo(TransactionStatus.PENDING);

        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendWithdrawalCode(
                eq(customer.getEmail()),
                eq(customer.getName()),
                code.capture(),
                eq(initiation.getReference().toString()),
                eq(30));
        assertThat(code.getValue()).matches("\\d{8}");
        assertThat(objectMapper.writeValueAsString(initiation)).doesNotContain(code.getValue());
        Transaction pendingWithdrawal = transactionRepository.findById(initiation.getTransactionId()).orElseThrow();
        assertThat(pendingWithdrawal.getWithdrawalCodeHash()).isNotEqualTo(code.getValue());

        User nonAdmin = createUser();
        User admin = createAdmin();
        String body = objectMapper.writeValueAsString(Map.of(
                "reference", initiation.getReference(),
                "code", code.getValue()));
        mockMvc.perform(post("/atm/withdrawals/redeem")
                        .header("Authorization", "Bearer " + jwtService.generateToken(nonAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/atm/withdrawals/redeem")
                        .header("Authorization", "Bearer " + jwtService.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        assertThat(transactionRepository.findById(initiation.getTransactionId()).orElseThrow().getStatus())
                .isEqualTo(TransactionStatus.COMPLETED);
        assertThat(transactionRepository.findById(initiation.getTransactionId()).orElseThrow()
                .getWithdrawalRedeemedAt()).isNotNull();
        assertThat(accountRepository.findById(account.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("375.00");
        assertThatThrownBy(() -> withdrawalService.redeem(initiation.getReference(), code.getValue()))
                .isInstanceOf(WithdrawalService.WithdrawalUnavailableException.class);
    }

    @Test
    void fiveInvalidCodesLockChallengeAndExpirationReturnsReservedFunds() {
        User customer = createUser();
        Account account = createAccount(customer, new BigDecimal("300.00"));
        WithdrawalInitiationResponse initiation = transactionService.withdraw(
                customer.getEmail(),
                withdrawalRequest("80.00"));

        ArgumentCaptor<String> issuedCode = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendWithdrawalCode(
                eq(customer.getEmail()),
                eq(customer.getName()),
                issuedCode.capture(),
                eq(initiation.getReference().toString()),
                eq(30));
        String invalidCode = issuedCode.getValue().equals("00000000") ? "99999999" : "00000000";
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> withdrawalService.redeem(initiation.getReference(), invalidCode))
                    .isInstanceOf(WithdrawalService.InvalidWithdrawalCodeException.class);
        }
        var transaction = transactionRepository.findById(initiation.getTransactionId()).orElseThrow();
        assertThat(transaction.getWithdrawalFailedAttempts()).isEqualTo(5);

        transaction.setWithdrawalCodeExpiresAt(LocalDateTime.now().minusMinutes(1));
        transactionRepository.save(transaction);
        assertThat(withdrawalService.expirePendingWithdrawals()).isEqualTo(1);
        assertThat(transactionRepository.findById(initiation.getTransactionId()).orElseThrow().getStatus())
                .isEqualTo(TransactionStatus.FAILED);
        assertThat(accountRepository.findById(account.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("300.00");
    }

    @Test
    void redeemingAnExpiredCodeCommitsTheRefund() {
        User customer = createUser();
        Account account = createAccount(customer, new BigDecimal("300.00"));
        WithdrawalInitiationResponse initiation = transactionService.withdraw(
                customer.getEmail(),
                withdrawalRequest("80.00"));
        Transaction transaction = transactionRepository.findById(initiation.getTransactionId()).orElseThrow();
        transaction.setWithdrawalCodeExpiresAt(LocalDateTime.now().minusMinutes(1));
        transactionRepository.save(transaction);

        assertThatThrownBy(() -> withdrawalService.redeem(initiation.getReference(), "12345678"))
                .isInstanceOf(WithdrawalService.WithdrawalExpiredException.class);

        assertThat(transactionRepository.findById(initiation.getTransactionId()).orElseThrow().getStatus())
                .isEqualTo(TransactionStatus.FAILED);
        assertThat(accountRepository.findById(account.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("300.00");
    }

    @Test
    void emailDeliveryFailureRollsBackWithdrawalAndReservedBalance() {
        User customer = createUser();
        Account account = createAccount(customer, new BigDecimal("300.00"));
        long transactionsBefore = transactionRepository.count();
        doThrow(new IllegalStateException("mail unavailable"))
                .when(emailService)
                .sendWithdrawalCode(anyString(), anyString(), anyString(), anyString(), anyInt());

        assertThatThrownBy(() -> transactionService.withdraw(
                customer.getEmail(),
                withdrawalRequest("80.00")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("mail unavailable");

        assertThat(accountRepository.findById(account.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("300.00");
        assertThat(transactionRepository.count()).isEqualTo(transactionsBefore);
    }

    private TransactionRequest withdrawalRequest(String amount) {
        TransactionRequest request = new TransactionRequest();
        request.setAmount(new BigDecimal(amount));
        request.setDescription("Secure cash withdrawal integration test");
        return request;
    }
}

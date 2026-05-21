package com.fintech.banking.controller;

import com.fintech.banking.config.IntegrationTestConfig;
import com.fintech.banking.dto.request.RegisterRequest;
import com.fintech.banking.dto.request.TransactionRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TransactionControllerTest extends IntegrationTestConfig {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String token;

    @BeforeEach
    void setup() throws Exception {
        long ts = System.currentTimeMillis();
        String email = "transaction" + ts + "@email.com";
        RegisterRequest register = new RegisterRequest();
        register.setName("Transaction User");
        register.setEmail(email);
        
        register.setPassword("senha123");

        MvcResult result = mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated())
                .andReturn();

        String content = result.getResponse().getContentAsString();
        token = objectMapper.readTree(content).get("accessToken").asText();
    }

    @Test
    void shouldDepositSuccessfully() throws Exception {
        TransactionRequest request = new TransactionRequest();
        request.setAmount(new BigDecimal("500.00"));
        request.setDescription("Deposito teste");

        mockMvc.perform(post("/transactions/deposit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("DEPOSIT"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(500.00));
    }

    @Test
    void shouldWithdrawSuccessfully() throws Exception {
        TransactionRequest deposit = new TransactionRequest();
        deposit.setAmount(new BigDecimal("1000.00"));
        mockMvc.perform(post("/transactions/deposit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deposit)))
                .andExpect(status().isCreated());

        TransactionRequest withdraw = new TransactionRequest();
        withdraw.setAmount(new BigDecimal("300.00"));
        withdraw.setDescription("Saque teste");

        mockMvc.perform(post("/transactions/withdraw")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(withdraw)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("WITHDRAWAL"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void shouldReturnHistorySuccessfully() throws Exception {
        TransactionRequest deposit = new TransactionRequest();
        deposit.setAmount(new BigDecimal("200.00"));
        mockMvc.perform(post("/transactions/deposit")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deposit)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/transactions/history")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].type").value("DEPOSIT"));
    }
}

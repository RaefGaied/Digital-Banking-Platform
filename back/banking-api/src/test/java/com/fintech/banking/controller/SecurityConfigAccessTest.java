package com.fintech.banking.controller;

import com.fintech.banking.config.IntegrationTestConfig;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.UserRole;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.dto.request.LoginRequest;
import com.fintech.banking.dto.request.RegisterRequest;
import com.fintech.banking.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityConfigAccessTest extends IntegrationTestConfig {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;
    private String adminToken;

    @BeforeEach
    void setup() throws Exception {
        String userEmail = "security-user-" + System.currentTimeMillis() + "@email.com";
        RegisterRequest register = new RegisterRequest();
        register.setName("Security User");
        register.setEmail(userEmail);
        register.setPassword("senha123");

        MvcResult userResult = mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated())
                .andReturn();
        userToken = objectMapper.readTree(userResult.getResponse().getContentAsString()).get("accessToken").asText();

        String adminEmail = "security-admin-" + System.currentTimeMillis() + "@email.com";
        userRepository.save(User.builder()
                .name("Security Admin")
                .email(adminEmail)
                .password(passwordEncoder.encode("senha123"))
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .active(true)
                .build());

        LoginRequest adminLogin = new LoginRequest();
        adminLogin.setEmail(adminEmail);
        adminLogin.setPassword("senha123");

        MvcResult adminResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readTree(adminResult.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void shouldAllowAuthenticatedUserToAccessSharedUserEndpoints() throws Exception {
        mockMvc.perform(get("/users/me")
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());
    }

    @Test
    void shouldAllowAuthenticatedAdminToAccessSharedUserEndpoints() throws Exception {
        mockMvc.perform(get("/users/me")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}

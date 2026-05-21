package com.fintech.banking.service;

import com.fintech.banking.dto.request.LoginRequest;
import com.fintech.banking.dto.request.RefreshTokenRequest;
import com.fintech.banking.dto.request.RegisterRequest;
import com.fintech.banking.dto.response.LoginResponse;
import com.fintech.banking.dto.response.TokenResponse;

public interface AuthService {

    TokenResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    TokenResponse refresh(RefreshTokenRequest request);

    void logout(RefreshTokenRequest request);

    TokenResponse verify2fa(String tempToken, int code);
}
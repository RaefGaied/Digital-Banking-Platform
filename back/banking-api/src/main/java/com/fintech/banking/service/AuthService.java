package com.fintech.banking.service;

import com.fintech.banking.dto.request.LoginRequest;
import com.fintech.banking.dto.request.RefreshTokenRequest;
import com.fintech.banking.dto.request.RegisterRequest;
import com.fintech.banking.dto.response.LoginResponse;
import com.fintech.banking.dto.response.ClientResponse;

public interface AuthService {

    ClientResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    ClientResponse refresh(RefreshTokenRequest request);

    void logout(RefreshTokenRequest request);

    ClientResponse verify2fa(String tempToken, int code);
}
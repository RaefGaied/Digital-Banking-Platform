package com.fintech.banking.controller;

import com.fintech.banking.dto.request.LoginRequest;
import com.fintech.banking.dto.request.RefreshTokenRequest;
import com.fintech.banking.dto.request.RegisterRequest;
import com.fintech.banking.dto.request.Verify2faRequest;
import com.fintech.banking.dto.response.LoginResponse;
import com.fintech.banking.dto.response.TokenResponse;
import com.fintech.banking.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<TokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<TokenResponse> verify2fa(@Valid @RequestBody Verify2faRequest request) {
        return ResponseEntity.ok(authService.verify2fa(request.getTempToken(), request.getCode()));
    }
}
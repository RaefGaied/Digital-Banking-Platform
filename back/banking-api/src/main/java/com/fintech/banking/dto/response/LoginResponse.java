package com.fintech.banking.dto.response;

import com.fintech.banking.dto.response.TokenResponse;

/**
 * Response for login API that may require 2FA verification.
 */
public class LoginResponse {
    private boolean twoFactorRequired;
    private TokenResponse tokenResponse;
    private String tempToken;

    public LoginResponse() {
    }

    public LoginResponse(boolean twoFactorRequired, TokenResponse tokenResponse, String tempToken) {
        this.twoFactorRequired = twoFactorRequired;
        this.tokenResponse = tokenResponse;
        this.tempToken = tempToken;
    }

    public boolean isTwoFactorRequired() {
        return twoFactorRequired;
    }

    public void setTwoFactorRequired(boolean twoFactorRequired) {
        this.twoFactorRequired = twoFactorRequired;
    }

    public TokenResponse getTokenResponse() {
        return tokenResponse;
    }

    public void setTokenResponse(TokenResponse tokenResponse) {
        this.tokenResponse = tokenResponse;
    }

    public String getTempToken() {
        return tempToken;
    }

    public void setTempToken(String tempToken) {
        this.tempToken = tempToken;
    }
}
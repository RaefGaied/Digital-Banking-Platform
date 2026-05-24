package com.fintech.banking.dto.response;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/**
 * Response for login API that may require 2FA verification.
 */
public class LoginResponse {
    private boolean twoFactorRequired;
    @JsonUnwrapped
    private ClientResponse clientResponse;
    private String tempToken;

    public LoginResponse() {
    }

    public LoginResponse(boolean twoFactorRequired, ClientResponse clientResponse, String tempToken) {
        this.twoFactorRequired = twoFactorRequired;
        this.clientResponse = clientResponse;
        this.tempToken = tempToken;
    }

    public boolean isTwoFactorRequired() {
        return twoFactorRequired;
    }

    public void setTwoFactorRequired(boolean twoFactorRequired) {
        this.twoFactorRequired = twoFactorRequired;
    }

    public ClientResponse getTokenResponse() {
        return clientResponse;
    }

    public void setTokenResponse(ClientResponse clientResponse) {
        this.clientResponse = clientResponse;
    }

    public String getTempToken() {
        return tempToken;
    }

    public void setTempToken(String tempToken) {
        this.tempToken = tempToken;
    }
}
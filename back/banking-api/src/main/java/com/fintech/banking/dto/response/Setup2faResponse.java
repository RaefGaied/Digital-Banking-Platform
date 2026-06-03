package com.fintech.banking.dto.response;

public class Setup2faResponse {
    private String secret;
    private String otpauthUri;

    public Setup2faResponse() {
    }

    public Setup2faResponse(String secret, String otpauthUri) {
        this.secret = secret;
        this.otpauthUri = otpauthUri;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getOtpauthUri() {
        return otpauthUri;
    }

    public void setOtpauthUri(String otpauthUri) {
        this.otpauthUri = otpauthUri;
    }
}

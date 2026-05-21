package com.fintech.banking.dto.request;

/**
 * Request for verifying 2FA code.
 */
public class Verify2faRequest {
    private String tempToken;
    private int code;

    public Verify2faRequest() {
    }

    public Verify2faRequest(String tempToken, int code) {
        this.tempToken = tempToken;
        this.code = code;
    }

    public String getTempToken() {
        return tempToken;
    }

    public void setTempToken(String tempToken) {
        this.tempToken = tempToken;
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }
}
package com.fintech.banking.dto.request;

public class Enable2faRequest {
    private int code;

    public Enable2faRequest() {
    }

    public Enable2faRequest(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }
}

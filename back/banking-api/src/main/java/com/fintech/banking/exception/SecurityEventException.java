package com.fintech.banking.exception;

public class SecurityEventException extends RuntimeException {
    public SecurityEventException(String message) {
        super(message);
    }

    public SecurityEventException(String message, Throwable cause) {
        super(message, cause);
    }
}

package com.fintech.banking.exception;

public class AiProvidersUnavailableException extends RuntimeException {

    public AiProvidersUnavailableException() {
        super("The AI assistant is temporarily unavailable. Please retry when Ollama or the AI agent is back online.");
    }
}

package com.fintech.banking.service;

import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.dto.response.WithdrawalInitiationResponse;

import java.util.List;

public interface TransactionService {

    TransactionResponse deposit(String email, TransactionRequest request);

    WithdrawalInitiationResponse withdraw(String email, TransactionRequest request);

    TransactionResponse transfer(String email, TransactionRequest request);

    List<TransactionResponse> getHistory(String email);
}

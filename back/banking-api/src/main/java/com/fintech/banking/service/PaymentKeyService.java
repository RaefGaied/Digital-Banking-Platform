package com.fintech.banking.service;

import com.fintech.banking.dto.request.PaymentTransferRequest;
import com.fintech.banking.dto.request.RegisterPaymentKeyRequest;
import com.fintech.banking.dto.response.PaymentKeyResponse;
import com.fintech.banking.dto.response.TransactionResponse;

import java.util.List;

public interface PaymentKeyService {

    PaymentKeyResponse registerKey(String email, RegisterPaymentKeyRequest request);

    List<PaymentKeyResponse> getMyKeys(String email);

    PaymentKeyResponse findKey(String keyValue);

    TransactionResponse transfer(String email, PaymentTransferRequest request);
}

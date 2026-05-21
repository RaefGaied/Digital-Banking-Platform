package com.fintech.banking.service;

import com.fintech.banking.dto.request.PixTransferRequest;
import com.fintech.banking.dto.request.RegisterPixKeyRequest;
import com.fintech.banking.dto.response.PixKeyResponse;
import com.fintech.banking.dto.response.TransactionResponse;

import java.util.List;

public interface PixService {

    PixKeyResponse registerKey(String email, RegisterPixKeyRequest request);

    List<PixKeyResponse> getMyKeys(String email);

    PixKeyResponse findKey(String pixKey);

    TransactionResponse transfer(String email, PixTransferRequest request);
}

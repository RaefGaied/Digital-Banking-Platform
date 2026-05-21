package com.fintech.banking.service;

import com.fintech.banking.dto.request.CreateInvestmentRequest;
import com.fintech.banking.dto.response.InvestmentResponse;

import java.util.List;
import java.util.UUID;

public interface InvestmentService {
    List<InvestmentResponse> getMyInvestments(String email);
    InvestmentResponse invest(String email, CreateInvestmentRequest request);
    InvestmentResponse redeem(String email, UUID investmentId);
}

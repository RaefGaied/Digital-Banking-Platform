package com.fintech.banking.service;

import com.fintech.banking.dto.response.AccountResponse;

import java.util.List;

public interface AccountService {

    AccountResponse getMyAccount(String email);

    List<String> getAvailableAccountNumbers();
}

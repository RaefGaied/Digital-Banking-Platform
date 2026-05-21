package com.fintech.banking.service;

import com.fintech.banking.dto.response.AccountResponse;

public interface AccountService {

    AccountResponse getMyAccount(String email);
}

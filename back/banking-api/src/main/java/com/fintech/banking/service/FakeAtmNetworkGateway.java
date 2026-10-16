package com.fintech.banking.service;

import org.springframework.stereotype.Component;

@Component
public class FakeAtmNetworkGateway {

    public boolean isAvailable() {
        return true;
    }
}
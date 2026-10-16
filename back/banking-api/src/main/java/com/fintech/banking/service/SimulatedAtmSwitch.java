package com.fintech.banking.service;

import com.fintech.banking.dto.response.AtmWithdrawalReceipt;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulatedAtmSwitch {

    private final FakeAtmNetworkGateway atmNetworkGateway;
    private final WithdrawalService withdrawalService;

    public AtmWithdrawalReceipt redeem(java.util.UUID reference, String code) {
        if (!atmNetworkGateway.isAvailable()) {
            throw new IllegalStateException("Simulated cash network is unavailable");
        }
        return withdrawalService.redeem(reference, code);
    }
}
package com.fintech.banking.controller;

import com.fintech.banking.dto.request.RedeemWithdrawalRequest;
import com.fintech.banking.dto.response.AtmNetworkStatusResponse;
import com.fintech.banking.dto.response.AtmWithdrawalReceipt;
import com.fintech.banking.service.FakeAtmNetworkGateway;
import com.fintech.banking.service.SimulatedAtmSwitch;
import com.fintech.banking.service.WithdrawalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/atm/withdrawals")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AtmWithdrawalController {

    private final FakeAtmNetworkGateway atmNetworkGateway;
    private final SimulatedAtmSwitch simulatedAtmSwitch;

    @GetMapping("/network-status")
    public AtmNetworkStatusResponse networkStatus() {
        return new AtmNetworkStatusResponse(
                true,
                atmNetworkGateway.isAvailable(),
                "Simulation mode: this prototype is not connected to a real ATM or interbank network.");
    }

    @PostMapping("/redeem")
    public ResponseEntity<?> redeem(@Valid @RequestBody RedeemWithdrawalRequest request) {
        try {
            AtmWithdrawalReceipt receipt = simulatedAtmSwitch.redeem(
                    request.getReference(),
                    request.getCode());
            return ResponseEntity.ok(receipt);
        } catch (WithdrawalService.InvalidWithdrawalCodeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (WithdrawalService.WithdrawalExpiredException ex) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("error", ex.getMessage()));
        } catch (WithdrawalService.WithdrawalUnavailableException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", ex.getMessage()));
        }
    }
}
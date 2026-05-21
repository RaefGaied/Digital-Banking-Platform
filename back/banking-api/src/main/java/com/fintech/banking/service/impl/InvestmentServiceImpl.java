package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.Investment;
import com.fintech.banking.domain.enums.InvestmentStatus;
import com.fintech.banking.domain.enums.InvestmentType;
import com.fintech.banking.dto.request.CreateInvestmentRequest;
import com.fintech.banking.dto.response.InvestmentResponse;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.InvestmentRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.InvestmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvestmentServiceImpl implements InvestmentService {

    private final InvestmentRepository investmentRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    private static final Map<InvestmentType, BigDecimal> ANNUAL_RATES = Map.of(
        InvestmentType.CDB, new BigDecimal("12.00"),
        InvestmentType.LCI, new BigDecimal("10.00"),
        InvestmentType.LCA, new BigDecimal("10.50"),
        InvestmentType.TESOURO_DIRETO, new BigDecimal("11.00"),
        InvestmentType.ACOES, new BigDecimal("15.00")
    );

    private BigDecimal calculateCurrentValue(Investment investment) {
        long days = ChronoUnit.DAYS.between(investment.getInvestedAt(), LocalDateTime.now());
        if (days == 0) return investment.getAmount();
        BigDecimal dailyRate = investment.getAnnualRate()
            .divide(new BigDecimal("36500"), 10, RoundingMode.HALF_UP);
        BigDecimal factor = BigDecimal.ONE.add(dailyRate).pow((int) Math.min(days, Integer.MAX_VALUE));
        return investment.getAmount().multiply(factor).setScale(2, RoundingMode.HALF_UP);
    }

    private InvestmentResponse toResponse(Investment inv) {
        BigDecimal currentValue = calculateCurrentValue(inv);
        BigDecimal profitLoss = currentValue.subtract(inv.getAmount());
        double profitLossPercent = profitLoss.divide(inv.getAmount(), 4, RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100")).doubleValue();
        return InvestmentResponse.builder()
            .id(inv.getId())
            .investmentType(inv.getInvestmentType())
            .amount(inv.getAmount())
            .annualRate(inv.getAnnualRate())
            .currentValue(currentValue)
            .profitLoss(profitLoss)
            .profitLossPercent(profitLossPercent)
            .status(inv.getStatus())
            .investedAt(inv.getInvestedAt())
            .redeemedAt(inv.getRedeemedAt())
            .build();
    }

    @Override
    public List<InvestmentResponse> getMyInvestments(String email) {
        var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return investmentRepository.findByUserId(user.getId())
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public InvestmentResponse invest(String email, CreateInvestmentRequest request) {
        var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        var accounts = accountRepository.findByUserId(user.getId());
        if (accounts.isEmpty()) throw new IllegalArgumentException("Account not found");
        Account account = accounts.get(0);
        account.debit(request.getAmount());
        accountRepository.save(account);
        BigDecimal rate = ANNUAL_RATES.getOrDefault(request.getInvestmentType(), new BigDecimal("10.00"));
        Investment investment = Investment.builder()
            .user(user)
            .investmentType(request.getInvestmentType())
            .amount(request.getAmount())
            .annualRate(rate)
            .currentValue(request.getAmount())
            .build();
        investmentRepository.save(investment);
        log.info("[INVEST] Investment created: {} - R$ {}", request.getInvestmentType(), request.getAmount());
        return toResponse(investment);
    }

    @Override
    @Transactional
    public InvestmentResponse redeem(String email, UUID investmentId) {
        var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        var investment = investmentRepository.findById(investmentId)
            .orElseThrow(() -> new IllegalArgumentException("Investment not found"));
        if (!investment.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("Investment does not belong to the user");
        if (investment.getStatus() == InvestmentStatus.REDEEMED)
            throw new IllegalArgumentException("Investment already redeemed");
        BigDecimal currentValue = calculateCurrentValue(investment);
        var accounts = accountRepository.findByUserId(user.getId());
        Account account = accounts.get(0);
        account.credit(currentValue);
        accountRepository.save(account);
        investment.setStatus(InvestmentStatus.REDEEMED);
        investment.setCurrentValue(currentValue);
        investment.setRedeemedAt(LocalDateTime.now());
        investmentRepository.save(investment);
        log.info("[INVEST] Redeem: {} - R$ {}", investmentId, currentValue);
        return toResponse(investment);
    }
}

package com.fintech.banking.domain.entity;

import com.fintech.banking.domain.enums.InvestmentStatus;
import com.fintech.banking.domain.enums.InvestmentType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "investments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Investment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "investment_type", nullable = false, columnDefinition = "investment_type")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    private InvestmentType investmentType;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "annual_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal annualRate;

    @Column(name = "current_value", nullable = false, precision = 19, scale = 2)
    private BigDecimal currentValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "investment_status")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    @Builder.Default
    private InvestmentStatus status = InvestmentStatus.ACTIVE;

    @Column(name = "invested_at", nullable = false)
    private LocalDateTime investedAt;

    @Column(name = "redeemed_at")
    private LocalDateTime redeemedAt;

    @PrePersist
    protected void onCreate() {
        investedAt = LocalDateTime.now();
    }
}

package com.fintech.banking.domain.entity;

import com.fintech.banking.domain.enums.PixKeyType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pix_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PixKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
@Column(name = "key_type", nullable = false, columnDefinition = "pix_key_type")
@org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
private PixKeyType keyType;

    @Column(name = "key_value", nullable = false, unique = true, length = 255)
    private String keyValue;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

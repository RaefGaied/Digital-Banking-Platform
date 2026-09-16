package com.fintech.banking.config;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.Card;
import com.fintech.banking.domain.entity.Investment;
import com.fintech.banking.domain.entity.Notification;
import com.fintech.banking.domain.entity.PaymentKey;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.*;
import com.fintech.banking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@Profile("local")
@Order(1)
@RequiredArgsConstructor
public class LocalDemoDataBootstrap implements ApplicationRunner {

    private static final String ADMIN_EMAIL = "admin@finbank.local";
    private static final String PRIMARY_EMAIL = "demo@finbank.local";
    private static final String PARTNER_EMAIL = "partner@finbank.local";
    private static final String SYSTEM_EMAIL = "system@finbank.local";

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final InvestmentRepository investmentRepository;
    private final com.fintech.banking.repository.PaymentKeyRepository paymentKeyRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final TransactionRepository transactionRepository;
    private final NotificationRepository notificationRepository;
    private final com.fintech.banking.repository.WorkflowTaskRepository workflowTaskRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        User primaryUser = ensureUser(
            "Demo User",
            PRIMARY_EMAIL,
            "User@1234!",
            UserRole.USER,
            BigDecimal.valueOf(12500.00),
            "0001",
            "102030-4"
        );

        User partnerUser = ensureUser(
            "Partner User",
            PARTNER_EMAIL,
            "User@1234!",
            UserRole.USER,
            BigDecimal.valueOf(8200.00),
            "0001",
            "204060-8"
        );

        User adminUser = userRepository.findByEmail(ADMIN_EMAIL).orElse(null);
        User systemUser = ensureUser(
            "System Assistant",
            SYSTEM_EMAIL,
            "System@1234!",
            UserRole.ADMIN,
            null,
            null,
            null
        );
        seedCards(primaryUser);
        seedPaymentKeys(primaryUser, partnerUser);
        seedInvestments(primaryUser);
        seedTransactions(primaryUser, partnerUser);
        seedSupportTicket(primaryUser, adminUser);
        seedAdminTasks(adminUser, primaryUser);
        seedNotifications(primaryUser);

        log.info("Seeded local demo data for {} and {}", PRIMARY_EMAIL, PARTNER_EMAIL);
    }

    private void seedAdminTasks(User adminUser, User primaryUser) {
        List<com.fintech.banking.domain.entity.WorkflowTask> existing = workflowTaskRepository.findAll();
        if (existing.size() >= 20) {
            return;
        }

        List<com.fintech.banking.domain.enums.TaskType> types = List.of(com.fintech.banking.domain.enums.TaskType.values());

        // pull available ticket ids for association
        List<SupportTicket> tickets = supportTicketRepository.findByUserId(primaryUser.getId(), PageRequest.of(0, 20)).getContent();

        int start = existing.size();
        for (int i = start; i < 20; i++) {
            String pid = String.format("seed-admin-task-%03d", i + 1);
            if (!workflowTaskRepository.findByProcessInstanceId(pid).isEmpty()) {
                continue;
            }

            Long supportTicketId = null;
            if (!tickets.isEmpty()) {
                supportTicketId = tickets.get(i % tickets.size()).getId();
            }

            com.fintech.banking.domain.entity.WorkflowTask task = com.fintech.banking.domain.entity.WorkflowTask.builder()
                .processInstanceId(pid)
                .supportTicketId(supportTicketId)
                .status(com.fintech.banking.domain.enums.WorkflowTaskStatus.PENDING)
                .taskType(types.get(i % types.size()))
                .description("Seeded admin task " + (i + 1) + " for local demo")
                .assignedTo(null)
                .dueDate(LocalDateTime.now().plusDays((i % 5) + 1))
                .metadata(java.util.Map.of("seed", "admin-task"))
                .build();

            workflowTaskRepository.save(task);
        }
    }

    private User ensureUser(
        String name,
        String email,
        String rawPassword,
        UserRole role,
        BigDecimal balance,
        String agency,
        String accountNumber
    ) {
        User user = userRepository.findByEmail(email).orElseGet(() -> userRepository.save(User.builder()
            .name(name)
            .email(email)
            .password(passwordEncoder.encode(rawPassword))
            .role(role)
            .status(UserStatus.ACTIVE)
            .active(true)
            .build()));

        if (agency == null || accountNumber == null) {
            return user;
        }

        BigDecimal expectedBalance = balance != null ? balance : BigDecimal.ZERO;
        Account account = accountRepository.findByNumber(accountNumber).orElseGet(() -> accountRepository.save(Account.builder()
            .user(user)
            .agency(agency)
            .number(accountNumber)
            .balance(expectedBalance)
            .status(AccountStatus.ACTIVE)
            .build()));

        if (account.getBalance() == null || account.getBalance().compareTo(expectedBalance) != 0) {
            account.setBalance(expectedBalance);
            accountRepository.save(account);
        }

        return user;
    }

    private void seedCards(User user) {
        List<Card> cards = cardRepository.findByUserIdAndActiveTrue(user.getId());
        if (cards.size() >= 20) {
            return;
        }

        String[] suffixes = {
            "4242", "9911", "1357", "2468", "1122",
            "3344", "5566", "7788", "9900", "1234",
            "5678", "6789", "7890", "8901", "9012",
            "1010", "2020", "3030", "4040", "5050"
        };
        CardType[] types = {CardType.CREDIT, CardType.DEBIT};
        CardBrand[] brands = {CardBrand.VISA, CardBrand.MASTERCARD, CardBrand.ELO, CardBrand.AMEX};

        for (int i = 0; i < suffixes.length && cardRepository.findByUserIdAndActiveTrue(user.getId()).size() < 20; i++) {
            final String lastFour = suffixes[i];
            if (cards.stream().anyMatch(card -> lastFour.equals(card.getLastFour()))) {
                continue;
            }

            boolean creditCard = i % 2 == 0;
            BigDecimal creditLimit = creditCard ? BigDecimal.valueOf(20000.00 + (i * 750L)) : null;
            BigDecimal availableLimit = creditCard ? creditLimit.subtract(BigDecimal.valueOf(1750.00 + (i * 10L))) : null;

            cardRepository.save(Card.builder()
                .user(user)
                .cardType(types[i % types.length])
                .brand(brands[i % brands.length])
                .holderName(user.getName().toUpperCase())
                .lastFour(lastFour)
                .expiryMonth((i % 12) + 1)
                .expiryYear(2028 + (i % 4))
                .creditLimit(creditLimit)
                .availableLimit(availableLimit)
                .active(true)
                .build());
        }
    }

    private void seedPaymentKeys(User primaryUser, User partnerUser) {
        if (!paymentKeyRepository.existsByKeyValue(primaryUser.getEmail())) {
            paymentKeyRepository.save(PaymentKey.builder()
                .user(primaryUser)
                .keyType(PaymentKeyType.EMAIL)
                .keyValue(primaryUser.getEmail())
                .active(true)
                .verified(true)
                .verificationMethod("auto-seed")
                .build());
        }

        String partnerPix = "+33123456789";
        if (!paymentKeyRepository.existsByKeyValue(partnerPix)) {
            paymentKeyRepository.save(PaymentKey.builder()
                .user(partnerUser)
                .keyType(PaymentKeyType.PHONE)
                .keyValue(partnerPix)
                .active(true)
                .verified(true)
                .verificationMethod("auto-seed")
                .build());
        }
    }

    private void seedInvestments(User user) {
        List<Investment> investments = investmentRepository.findByUserId(user.getId());
        if (investments.size() >= 20) {
            return;
        }

        InvestmentType[] types = InvestmentType.values();
        for (int i = investments.size(); i < 20; i++) {
            InvestmentType type = types[i % types.length];
            BigDecimal amount = BigDecimal.valueOf(1200.00 + (i * 180.00));
            BigDecimal annualRate = switch (type) {
                case CDB -> BigDecimal.valueOf(12.00);
                case LCI -> BigDecimal.valueOf(10.00);
                case LCA -> BigDecimal.valueOf(10.50);
                case TESOURO_DIRETO -> BigDecimal.valueOf(11.00);
                case ACOES -> BigDecimal.valueOf(15.00);
            };
            BigDecimal currentValue = amount.add(amount.multiply(annualRate).divide(BigDecimal.valueOf(100)));

            investmentRepository.save(Investment.builder()
                .user(user)
                .investmentType(type)
                .amount(amount)
                .annualRate(annualRate)
                .currentValue(currentValue.setScale(2, java.math.RoundingMode.HALF_UP))
                .status(InvestmentStatus.ACTIVE)
                .investedAt(LocalDateTime.now().minusDays(10 + i))
                .build());
        }
    }

    private void seedTransactions(User primaryUser, User partnerUser) {
        Account primaryAccount = accountRepository.findByUserId(primaryUser.getId()).stream().findFirst().orElse(null);
        Account partnerAccount = accountRepository.findByUserId(partnerUser.getId()).stream().findFirst().orElse(null);
        if (primaryAccount == null || partnerAccount == null) {
            return;
        }

        List<Transaction> existingTransactions = transactionRepository.findAllByAccountId(primaryAccount.getId());

        if (existingTransactions.stream().noneMatch(t -> "seed-deposit-001".equals(t.getFlowableProcessId()))) {
            primaryAccount.setBalance(primaryAccount.getBalance().add(BigDecimal.valueOf(1500.00)));
            accountRepository.save(primaryAccount);

            transactionRepository.save(Transaction.builder()
                .sourceAccount(null)
                .targetAccount(primaryAccount)
                .amount(BigDecimal.valueOf(1500.00))
                .type(TransactionType.DEPOSIT)
                .status(TransactionStatus.COMPLETED)
                .description("Seed deposit for demo account")
                .flowableProcessId("seed-deposit-001")
                .build());
        }

        if (existingTransactions.stream().noneMatch(t -> "seed-transfer-001".equals(t.getFlowableProcessId()))) {
            primaryAccount.setBalance(primaryAccount.getBalance().subtract(BigDecimal.valueOf(250.00)));
            partnerAccount.setBalance(partnerAccount.getBalance().add(BigDecimal.valueOf(250.00)));
            accountRepository.save(primaryAccount);
            accountRepository.save(partnerAccount);

            transactionRepository.save(Transaction.builder()
                .sourceAccount(primaryAccount)
                .targetAccount(partnerAccount)
                .amount(BigDecimal.valueOf(250.00))
                .type(TransactionType.TRANSFER)
                .status(TransactionStatus.COMPLETED)
                .description("Seed transfer to partner account")
                .flowableProcessId("seed-transfer-001")
                .build());
        }

        if (existingTransactions.stream().noneMatch(t -> "seed-withdrawal-001".equals(t.getFlowableProcessId()))) {
            primaryAccount.setBalance(primaryAccount.getBalance().subtract(BigDecimal.valueOf(90.00)));
            accountRepository.save(primaryAccount);

            transactionRepository.save(Transaction.builder()
                .sourceAccount(primaryAccount)
                .targetAccount(null)
                .amount(BigDecimal.valueOf(90.00))
                .type(TransactionType.WITHDRAWAL)
                .status(TransactionStatus.COMPLETED)
                .description("Seed cash withdrawal")
                .flowableProcessId("seed-withdrawal-001")
                .build());
        }
    }

    private void seedSupportTicket(User user, User adminUser) {
        if (supportTicketRepository.findByUserId(user.getId(), PageRequest.of(0, 10)).getTotalElements() >= 2) {
            return;
        }

        if (supportTicketRepository.findByUserIdAndStatus(user.getId(), TicketStatus.OPEN, PageRequest.of(0, 10)).getContent().stream().noneMatch(t -> "seed-ticket-001".equals(t.getFlowableProcessId()))) {
            supportTicketRepository.save(SupportTicket.builder()
                .userId(user.getId())
                .ownerId(user.getId())
                .assignedAdminId(adminUser != null ? adminUser.getId() : null)
                .subject("Access problem on mobile app")
                .description("Unable to open PIX transfers after first login, please validate the account and limits.")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.MEDIUM)
                .ticketType(TicketType.GENERAL)
                .flowableProcessId("seed-ticket-001")
                .build());
        }

        if (supportTicketRepository.findByUserId(user.getId(), PageRequest.of(0, 10)).getContent().stream().noneMatch(t -> "seed-ticket-002".equals(t.getFlowableProcessId()))) {
            supportTicketRepository.save(SupportTicket.builder()
                .userId(user.getId())
                .ownerId(user.getId())
                .assignedAdminId(adminUser != null ? adminUser.getId() : null)
                .subject("Card limit review request")
                .description("Please review my card credit limit and transaction alerts for the demo profile.")
                .status(TicketStatus.IN_PROGRESS)
                .priority(TicketPriority.HIGH)
                .ticketType(TicketType.DATA_UPDATE)
                .flowableProcessId("seed-ticket-002")
                .build());
        }
    }

    private void seedNotifications(User user) {
        List<Notification> notifications = notificationRepository.findByUserId(user.getId(), PageRequest.of(0, 20)).getContent();
        if (notifications.size() >= 3) {
            return;
        }

        if (notifications.stream().noneMatch(n -> "Welcome to FinBank".equals(n.getTitle()))) {
            notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .userId(user.getId())
                .type(NotificationType.INFO_REQUESTED)
                .channel(NotificationChannel.IN_APP)
                .title("Welcome to FinBank")
                .body("Your demo account is ready. Explore cards, investments, PIX and transactions.")
                .referenceType("SEED")
                .referenceId(1L)
                .isRead(false)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build());
        }

        if (notifications.stream().noneMatch(n -> "Card payment received".equals(n.getTitle()))) {
            notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .userId(user.getId())
                .type(NotificationType.TRANSFER_EXECUTED)
                .channel(NotificationChannel.IN_APP)
                .title("Card payment received")
                .body("A card payment of R$ 120.00 was posted to your demo account.")
                .referenceType("SEED")
                .referenceId(2L)
                .isRead(false)
                .createdAt(LocalDateTime.now().minusHours(6))
                .build());
        }

        if (notifications.stream().noneMatch(n -> "Security notice".equals(n.getTitle()))) {
            notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .userId(user.getId())
                .type(NotificationType.SECURITY_ALERT)
                .channel(NotificationChannel.EMAIL)
                .title("Security notice")
                .body("We detected a new sign-in on your demo account. No action required for local testing.")
                .referenceType("SEED")
                .referenceId(3L)
                .isRead(true)
                .createdAt(LocalDateTime.now().minusHours(2))
                .readAt(LocalDateTime.now().minusHours(1))
                .build());
        }
    }
}

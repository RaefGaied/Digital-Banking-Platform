package com.fintech.banking.config;

import com.fintech.banking.kafka.TransactionEvent;
import com.fintech.banking.kafka.TransactionEventProducer;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.context.annotation.Import;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(IntegrationTestCacheConfiguration.class)
public abstract class IntegrationTestConfig {

    @MockBean
    protected TransactionEventProducer transactionEventProducer;

    static final boolean dockerAvailable = isDockerAvailable();
    static final PostgreSQLContainer<?> postgres = createPostgresContainer();

    private static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable ex) {
            return false;
        }
    }

    private static PostgreSQLContainer<?> createPostgresContainer() {
        if (!dockerAvailable) {
            return null;
        }

        System.setProperty("testcontainers.ryuk.disabled", "true");
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("banking_db")
                .withUsername("banking_user")
                .withPassword("banking_pass");
        try {
            container.start();
            return container;
        } catch (Throwable ex) {
            return null;
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (dockerAvailable && postgres != null) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
            registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
            registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
            registry.add("spring.flyway.enabled", () -> "false");
        } else {
            registry.add("spring.datasource.url", () -> "jdbc:h2:mem:banking_db;DB_CLOSE_DELAY=-1;MODE=LEGACY;DATABASE_TO_UPPER=false");
            registry.add("spring.datasource.username", () -> "sa");
            registry.add("spring.datasource.password", () -> "");
            registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
            registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
            registry.add("spring.flyway.enabled", () -> "false");
            registry.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE DOMAIN IF NOT EXISTS JSONB AS JSON");
        }
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9092");
        registry.add("spring.data.redis.host", () -> "localhost");
        registry.add("spring.data.redis.port", () -> "6379");
    }
}

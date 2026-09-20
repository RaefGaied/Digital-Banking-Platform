package com.fintech.banking.service;

import com.fintech.banking.kafka.TransactionEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.email.enabled:false}")
    private boolean enabled;

    @Value("${app.email.from:no-reply@finbank.local}")
    private String from;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Async
    public void sendWelcome(String recipient, String name) {
        sendHtml(recipient, "Welcome to FinBank", """
                <h2>Welcome to FinBank, %s!</h2>
                <p>Your account has been created successfully.</p>
                <p>You can now securely manage your accounts, cards and transactions.</p>
                """.formatted(escape(name)));
    }

    @Async
    public void sendPasswordReset(String recipient, String name, String rawToken) {
        String link = frontendUrl.replaceAll("/$", "") + "/reset-password?token=" + rawToken;
        sendHtml(recipient, "Reset your FinBank password", """
                <h2>Password reset request</h2>
                <p>Hello %s,</p>
                <p>Use the link below to choose a new password. It expires in 30 minutes.</p>
                <p><a href="%s">Reset my password</a></p>
                <p>If you did not request this, you can safely ignore this email.</p>
                """.formatted(escape(name), link));
    }

    @Async
    public void sendTransactionReceipt(String recipient, TransactionEvent event) {
        sendHtml(recipient, "FinBank transaction receipt", """
                <h2>Transaction receipt</h2>
                <p>Your %s transaction has been completed.</p>
                <ul>
                  <li>Amount: %s</li>
                  <li>Source account: %s</li>
                  <li>Destination account: %s</li>
                  <li>Date: %s</li>
                  <li>Reference: %s</li>
                </ul>
                """.formatted(
                event.getType(),
                event.getAmount(),
                event.getSourceAccountNumber(),
                event.getTargetAccountNumber(),
                event.getOccurredAt(),
                event.getTransactionId()));
    }

    private void sendHtml(String recipient, String subject, String html) {
        if (!enabled) {
            log.info("Email disabled; would send '{}' to {}", subject, recipient);
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.error("Email is enabled but no JavaMailSender is configured");
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(html, true);
            sender.send(message);
        } catch (MessagingException | RuntimeException ex) {
            log.error("Could not send email '{}' to {}", subject, recipient, ex);
        }
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;");
    }
}

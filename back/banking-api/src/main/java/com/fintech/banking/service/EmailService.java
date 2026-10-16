package com.fintech.banking.service;

import com.fintech.banking.kafka.TransactionEvent;
import com.fintech.banking.domain.enums.TransactionType;
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

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

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
        sendHtml(recipient, "Welcome to Banking Customer Support Agent", """
                <h2>Welcome to Banking Customer Support Agent, %s!</h2>
                <p>Your account has been created successfully.</p>
                <p>You can now securely manage your accounts, cards and transactions with our Hybrid AI Assistant.</p>
                """.formatted(escape(name)));
    }

    @Async
    public void sendPasswordReset(String recipient, String name, String rawToken) {
        String link = frontendUrl.replaceAll("/$", "") + "/reset-password?token=" + rawToken;
        sendHtml(recipient, "Reset your password", """
                <h2>Password reset request</h2>
                <p>Hello %s,</p>
                <p>Use the link below to choose a new password. It expires in 30 minutes.</p>
                <p><a href="%s">Reset my password</a></p>
                <p>If you did not request this, you can safely ignore this email.</p>
                """.formatted(escape(name), link));
    }

    @Async
    public void sendEmailChangedConfirmation(String recipient, String name) {
        sendHtml(recipient, "Your FinBank email was changed successfully", """
                <h2>Email address changed successfully</h2>
                <p>Hello %s,</p>
                <p>Your FinBank login email was changed successfully to <strong>%s</strong>.</p>
                <p>If you did not request this change, contact support immediately.</p>
                """.formatted(escape(name), escape(recipient)));
    }

    @Async
    public void sendPasswordResetConfirmation(String recipient, String name) {
        sendHtml(recipient, "Your FinBank password was changed successfully", """
                <h2>Password changed successfully</h2>
                <p>Hello %s,</p>
                <p>Your FinBank password was changed successfully.</p>
                <p>If you did not make this change, contact support immediately.</p>
                """.formatted(escape(name)));
    }

    @Async
    public void sendAccountLockedAlert(String recipient, String name) {
        sendHtml(recipient, "Your FinBank account was locked", """
                <h2>Account temporarily locked</h2>
                <p>Hello %s,</p>
                <p>Your FinBank account was temporarily locked after multiple failed login attempts.</p>
                <p>You can try again after 30 minutes. If this was not you, contact support immediately.</p>
                """.formatted(escape(name)));
    }

    public void sendWithdrawalCode(String recipient, String name, String code, String reference, int validityMinutes) {
        if (!enabled) {
            throw new IllegalStateException("Withdrawal email delivery is disabled");
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            throw new IllegalStateException("Withdrawal email delivery is not configured");
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(recipient);
            helper.setSubject("Your FinBank cash withdrawal code");
            helper.setText("""
                    <h2>Cash withdrawal code</h2>
                    <p>Hello %s,</p>
                    <p>Give this code and its reference to a FinBank counter agent:</p>
                    <p><strong>Code: %s</strong></p>
                    <p>Reference: <code>%s</code></p>
                    <p>This code expires in %d minutes and can only be used once. Never share it by phone or chat.</p>
                    <p>If you did not request this withdrawal, contact FinBank support immediately.</p>
                    """.formatted(escape(name), escape(code), escape(reference), validityMinutes), true);
            sender.send(message);
        } catch (MessagingException | RuntimeException ex) {
            throw new IllegalStateException("Unable to deliver the withdrawal code by email", ex);
        }
    }

    @Async
    public void sendTransactionReceipt(String recipient, TransactionEvent event) {
        sendMessage(recipient, "Banking Customer Support Agent - Reçu de transaction", """
                <h2>Reçu de Transaction / Transaction Receipt</h2>
                <p>Votre opération bancaire a été exécutée et compensée avec succès.</p>
                <ul>
                  <li>Type: %s</li>
                  <li>Montant: %s EUR</li>
                  <li>Compte émetteur: %s</li>
                  <li>Compte destinataire: %s</li>
                  <li>Date: %s</li>
                  <li>Référence: %s</li>
                </ul>
                <p>Veuillez trouver votre reçu officiel au format PDF en pièce jointe.</p>
                """.formatted(
                event.getType(),
                event.getAmount(),
                event.getSourceAccountNumber(),
                event.getTargetAccountNumber(),
                event.getOccurredAt(),
                event.getTransactionId()), pdfBytes(event),
                "finbank-transaction-" + event.getTransactionId() + ".pdf");
    }

    private void sendHtml(String recipient, String subject, String html) {
        sendMessage(recipient, subject, html, null, null);
    }

    private void sendMessage(String recipient, String subject, String html, byte[] attachment,
                             String attachmentName) {
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
            if (attachment != null) {
                helper.addAttachment(attachmentName,
                        new org.springframework.core.io.ByteArrayResource(attachment));
            }
            sender.send(message);
        } catch (MessagingException | RuntimeException ex) {
            log.error("Could not send email '{}' to {}", subject, recipient, ex);
        }
    }

    public byte[] pdfBytes(TransactionEvent event) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            // A4 page with 36pt (0.5 inch) margins
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, output);
            document.open();

            // Color Palette
            Color cPrimaryDark = new Color(15, 23, 42);    // Slate 900
            Color cAccentOrange = new Color(232, 97, 26);   // Brand Orange
            Color cEmerald = new Color(5, 150, 105);        // Emerald 600
            Color cTextMuted = new Color(100, 116, 139);    // Slate 500
            Color cBgLight = new Color(248, 250, 252);      // Slate 50
            Color cBorder = new Color(226, 232, 240);       // Slate 200
            Color cBadgeBg = new Color(220, 252, 231);      // Emerald 100
            Color cBadgeText = new Color(21, 128, 61);      // Emerald 700

            // Fonts
            Font fBankTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, cPrimaryDark);
            Font fBankSub = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, cAccentOrange);
            Font fBankDept = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, cTextMuted);
            Font fDocTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, cPrimaryDark);
            Font fDocSub = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, cTextMuted);

            Font fSectionLabel = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, cTextMuted);
            Font fAmount = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, event.getType() == TransactionType.DEPOSIT ? cEmerald : cPrimaryDark);
            Font fStatusBadge = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, cBadgeText);

            Font fTableKey = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, cTextMuted);
            Font fTableVal = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, cPrimaryDark);
            Font fTableMono = FontFactory.getFont(FontFactory.COURIER_BOLD, 8.5f, cPrimaryDark);
            Font fNoticeTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, new Color(180, 83, 9));
            Font fNotice = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, new Color(120, 53, 15));
            Font fFooter = FontFactory.getFont(FontFactory.HELVETICA, 7.0f, new Color(148, 163, 184));

            // 1. TOP HEADER TABLE (Bank Brand Left, Official Advice Right)
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{62f, 38f});

            PdfPCell brandCell = new PdfPCell();
            brandCell.setBorder(Rectangle.NO_BORDER);
            brandCell.setPaddingBottom(8f);
            brandCell.addElement(new Paragraph("FINBANK INTERNATIONAL S.A.", fBankTitle));
            brandCell.addElement(new Paragraph("Établissement de Crédit & Banque Numérique Agréée", fBankSub));
            brandCell.addElement(new Paragraph("Direction des Opérations & Moyens de Paiement", fBankDept));
            headerTable.addCell(brandCell);

            PdfPCell receiptTitleCell = new PdfPCell();
            receiptTitleCell.setBorder(Rectangle.NO_BORDER);
            receiptTitleCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            receiptTitleCell.setPaddingBottom(8f);
            Paragraph pReceipt = new Paragraph("AVIS D'OPÉRATION BANCAIRE", fDocTitle);
            pReceipt.setAlignment(Element.ALIGN_RIGHT);
            receiptTitleCell.addElement(pReceipt);
            Paragraph pSub = new Paragraph("REÇU OFFICIEL DE TRANSACTION / ADVICE", fDocSub);
            pSub.setAlignment(Element.ALIGN_RIGHT);
            receiptTitleCell.addElement(pSub);
            String shortRef = event.getTransactionId() != null
                    ? "RÉF. : TXN-" + event.getTransactionId().toString().substring(0, 8).toUpperCase()
                    : "RÉF. : TXN-STANDARD";
            Paragraph pRef = new Paragraph(shortRef, FontFactory.getFont(FontFactory.COURIER_BOLD, 8.0f, cAccentOrange));
            pRef.setAlignment(Element.ALIGN_RIGHT);
            receiptTitleCell.addElement(pRef);
            headerTable.addCell(receiptTitleCell);

            document.add(headerTable);

            // 2. ORANGE & NAVY ACCENT STRIP
            PdfPTable accentTable = new PdfPTable(2);
            accentTable.setWidthPercentage(100);
            accentTable.setWidths(new float[]{70f, 30f});
            PdfPCell cOrange = new PdfPCell();
            cOrange.setFixedHeight(2.5f);
            cOrange.setBackgroundColor(cAccentOrange);
            cOrange.setBorder(Rectangle.NO_BORDER);
            accentTable.addCell(cOrange);
            PdfPCell cNavy = new PdfPCell();
            cNavy.setFixedHeight(2.5f);
            cNavy.setBackgroundColor(cPrimaryDark);
            cNavy.setBorder(Rectangle.NO_BORDER);
            accentTable.addCell(cNavy);
            document.add(accentTable);

            document.add(new Paragraph(" "));

            // Format Amount
            BigDecimal amountVal = event.getAmount() != null ? event.getAmount() : BigDecimal.ZERO;
            DecimalFormat df = new DecimalFormat("#,##0.00", new DecimalFormatSymbols(Locale.US));
            boolean isDeposit = event.getType() == TransactionType.DEPOSIT;
            String formattedAmount = (isDeposit ? "+ " : "- ") + df.format(amountVal) + " EUR";

            // 3. FINANCIAL SUMMARY BOX
            PdfPTable summaryBox = new PdfPTable(2);
            summaryBox.setWidthPercentage(100);
            summaryBox.setWidths(new float[]{60f, 40f});

            PdfPCell sumLeft = new PdfPCell();
            sumLeft.setBackgroundColor(cBgLight);
            sumLeft.setBorderColor(cBorder);
            sumLeft.setBorderWidth(1f);
            sumLeft.setPadding(12f);
            sumLeft.addElement(new Paragraph("MONTANT NET DE L'OPÉRATION / NET AMOUNT", fSectionLabel));
            sumLeft.addElement(new Paragraph(formattedAmount, fAmount));
            sumLeft.addElement(new Paragraph("Devise : EUR (Euro) • Valeur Comptable Immédiate", FontFactory.getFont(FontFactory.HELVETICA, 7.5f, cTextMuted)));

            PdfPCell sumRight = new PdfPCell();
            sumRight.setBackgroundColor(cBgLight);
            sumRight.setBorderColor(cBorder);
            sumRight.setBorderWidth(1f);
            sumRight.setPadding(12f);
            sumRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
            sumRight.addElement(new Paragraph("STATUT DU RÈGLEMENT / CLEARING STATUS", fSectionLabel));

            PdfPTable badgeTable = new PdfPTable(1);
            badgeTable.setWidthPercentage(100);
            PdfPCell badgeCell = new PdfPCell(new Phrase("✓ COMPENSÉ & EXÉCUTÉ (SETTLED)", fStatusBadge));
            badgeCell.setBackgroundColor(cBadgeBg);
            badgeCell.setBorderColor(new Color(134, 239, 172));
            badgeCell.setPadding(5f);
            badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            badgeTable.addCell(badgeCell);
            sumRight.addElement(badgeTable);
            sumRight.addElement(new Paragraph("Frais de traitement : 0.00 EUR (Inclus)", FontFactory.getFont(FontFactory.HELVETICA, 7.5f, cTextMuted)));

            summaryBox.addCell(sumLeft);
            summaryBox.addCell(sumRight);
            document.add(summaryBox);

            document.add(new Paragraph(" "));

            // 4. TRANSACTION SPECIFICATION DETAILS TABLE
            PdfPTable detailsTable = new PdfPTable(2);
            detailsTable.setWidthPercentage(100);
            detailsTable.setWidths(new float[]{38f, 62f});

            addTableRow(detailsTable, "Identifiant Unique (End-to-End ID)", String.valueOf(event.getTransactionId()), fTableKey, fTableMono, cBgLight, cBorder);
            String formattedDate = event.getOccurredAt() != null
                    ? event.getOccurredAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))
                    : LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
            addTableRow(detailsTable, "Date & Heure d'Exécution", formattedDate + " UTC", fTableKey, fTableVal, Color.WHITE, cBorder);

            String valueDate = event.getOccurredAt() != null
                    ? event.getOccurredAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    : LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            addTableRow(detailsTable, "Date de Valeur Comptable", valueDate, fTableKey, fTableVal, cBgLight, cBorder);

            String typeFr = switch (String.valueOf(event.getType()).toUpperCase()) {
                case "DEPOSIT" -> "Dépôt de Fonds (Instant Deposit)";
                case "WITHDRAWAL" -> "Retrait de Fonds (Outbound Withdrawal)";
                case "TRANSFER" -> "Virement Interbancaire SEPA (Credit Transfer)";
                default -> String.valueOf(event.getType());
            };
            addTableRow(detailsTable, "Nature de l'Opération", typeFr, fTableKey, fTableVal, Color.WHITE, cBorder);

            String src = event.getSourceAccountNumber() != null ? event.getSourceAccountNumber() : "Alimentation Externe de Compte";
            addTableRow(detailsTable, "Compte Donneur d'Ordre (Émetteur)", src, fTableKey, fTableVal, cBgLight, cBorder);

            String dest = event.getTargetAccountNumber() != null ? event.getTargetAccountNumber() : "Compte Client Titulaire";
            addTableRow(detailsTable, "Compte Bénéficiaire (Destinataire)", dest, fTableKey, fTableVal, Color.WHITE, cBorder);

            String desc = event.getDescription() != null && !event.getDescription().isBlank() ? event.getDescription() : "Règlement d'opération bancaire";
            addTableRow(detailsTable, "Motif / Libellé de l'Opération", desc, fTableKey, fTableVal, cBgLight, cBorder);

            addTableRow(detailsTable, "Canal de Transmission", "Services Bancaires Numériques Sécurisés", fTableKey, fTableVal, Color.WHITE, cBorder);
            addTableRow(detailsTable, "Frais d'Exécution", "0.00 EUR (Sans frais)", fTableKey, fTableVal, cBgLight, cBorder);
            addTableRow(detailsTable, "Norme & Protocole de Règlement", "Réseau Interbancaire SEPA • Norme ISO 20022", fTableKey, fTableVal, Color.WHITE, cBorder);

            document.add(detailsTable);

            document.add(new Paragraph(" "));

            // 5. SECURITY & INTEGRITY NOTICE BOX
            PdfPTable securityBox = new PdfPTable(1);
            securityBox.setWidthPercentage(100);
            PdfPCell secCell = new PdfPCell();
            secCell.setBackgroundColor(new Color(254, 243, 199)); // Amber 100
            secCell.setBorderColor(new Color(252, 211, 77));     // Amber 300
            secCell.setBorderWidth(1f);
            secCell.setPadding(9f);
            secCell.addElement(new Paragraph("AUTHENTICITÉ ET VALEUR PROBANTE DU REÇU", fNoticeTitle));
            secCell.addElement(new Paragraph("Le présent avis d'opération constitue un reçu bancaire officiel certifié délivré par FinBank International S.A. Il atteste de la bonne fin de la transaction et de son inscription définitive au grand livre conformément aux règlements bancaires applicables (DSP2 & normes ISO 20022). Document dématérialisé à valeur juridique probante.", fNotice));
            securityBox.addCell(secCell);
            document.add(securityBox);

            document.add(new Paragraph(" "));

            // 6. PROFESSIONAL BANKING FOOTER
            Paragraph pFooter1 = new Paragraph("FinBank International S.A. • Établissement de crédit agréé et supervisé par les autorités bancaires", fFooter);
            pFooter1.setAlignment(Element.ALIGN_CENTER);
            document.add(pFooter1);

            Paragraph pFooter2 = new Paragraph("Document certifié conforme • Service Clientèle & Support 24/7 : support@finbank.com", fFooter);
            pFooter2.setAlignment(Element.ALIGN_CENTER);
            document.add(pFooter2);

            document.close();
            return output.toByteArray();
        } catch (Exception ex) {
            log.error("Could not generate transaction receipt PDF", ex);
            throw new IllegalStateException("Could not generate transaction receipt PDF", ex);
        }
    }

    private void addTableRow(PdfPTable table, String key, String value, Font fKey, Font fVal, Color bg, Color border) {
        PdfPCell cKey = new PdfPCell(new Phrase(key, fKey));
        cKey.setBackgroundColor(bg);
        cKey.setBorderColor(border);
        cKey.setBorderWidth(0.5f);
        cKey.setPadding(6f);
        table.addCell(cKey);

        PdfPCell cVal = new PdfPCell(new Phrase(value, fVal));
        cVal.setBackgroundColor(bg);
        cVal.setBorderColor(border);
        cVal.setBorderWidth(0.5f);
        cVal.setPadding(6f);
        table.addCell(cVal);
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;");
    }
}

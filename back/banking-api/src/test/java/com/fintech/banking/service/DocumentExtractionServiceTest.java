package com.fintech.banking.service;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DocumentExtractionServiceTest {

    private final DocumentExtractionService service = new DocumentExtractionService();

    @Test
    void shouldExtractFieldsFromBankDocumentSample() {
        String text = """
            Banking Document Intake

            Customer Name: Lucas Martin
            Customer ID: CUS-20481
            Email: lucas.martin@banking.example
            Phone: +33 6 12 34 56 78
            Address: 14 Rue de la Paix, Paris, France
            Product: Credit card
            Account Number: FR76 0000 0000 0000 1234 5678 90
            Document Type: Card blocked
            Issue Summary: Customer reports that the credit card was blocked after suspicious activity on the account.
            Risk Level: High
            Requested Action: Verify card status, confirm identity, and secure the card immediately.
            Preferred Contact: Email and SMS
            """;

        Map<String, String> result = service.extractFromText(text);

        assertEquals("CARD", result.get("documentType"));
        assertTrue(result.get("fullName").contains("Lucas Martin"));
        assertTrue(result.get("email").contains("lucas.martin@banking.example"));
        assertEquals("CREDIT_CARD", result.get("product"));
    }
}

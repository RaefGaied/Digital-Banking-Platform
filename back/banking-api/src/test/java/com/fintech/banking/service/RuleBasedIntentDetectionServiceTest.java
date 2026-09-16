package com.fintech.banking.service;

import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RuleBasedIntentDetectionServiceTest {

    private final RuleBasedIntentDetectionService service = new RuleBasedIntentDetectionService();

    @Test
    void detectsFrenchTransferWithAmountAndHyphenatedAccount() {
        IntentResult result = service.detectIntent("Vire 250 vers le compte 204060-8");

        assertEquals(IntentType.TRANSFER, result.getIntent());
        assertEquals(250, result.getParameters().get("amount").asInt());
        assertEquals("204060-8", result.getParameters().get("targetAccountNumber").asText());
    }

    @Test
    void doesNotTreatAccountNumberAsTransferAmount() {
        IntentResult result = service.detectIntent("Vire vers le compte 204060-8");

        assertEquals(IntentType.TRANSFER, result.getIntent());
        assertEquals(null, result.getParameters().get("amount"));
        assertEquals("204060-8", result.getParameters().get("targetAccountNumber").asText());
    }

    @Test
    void detectsUnaccentedFrenchTransferVerb() {
        assertEquals(IntentType.TRANSFER, service.detectIntent("je veux transferer argent").getIntent());
    }

    @Test
    void detectsFrenchCreditCardCreationRequest() {
        IntentResult result = service.detectIntent("Est-ce que vous pouvez créer une carte de crédit pour moi ?");

        assertEquals(IntentType.CARD_CREATION, result.getIntent());
    }

    @Test
    void detectsExplicitCardCreationRequest() {
        IntentResult result = service.detectIntent("j ai cree une carte type credit mois 4 annee 2030 et les derniers chiffres sont 2316 we de brand visa");

        assertEquals(IntentType.CARD_CREATION, result.getIntent());
    }

    @Test
    void detectsCardCreatedStatusQuestion() {
        IntentResult result = service.detectIntent("est ce que la carte a ete cree??");

        assertEquals(IntentType.CARD_CREATION, result.getIntent());
    }

    @Test
    void detectsCommonBankingIntentCategories() {
        assertEquals(IntentType.PAYMENT, service.detectIntent("Je veux effectuer un paiement").getIntent());
        assertEquals(IntentType.WITHDRAWAL, service.detectIntent("Comment faire un retrait ?").getIntent());
        assertEquals(IntentType.INVESTMENT, service.detectIntent("Je veux investir").getIntent());
        assertEquals(IntentType.PIX, service.detectIntent("Comment utiliser ma clé PIX ?").getIntent());
        assertEquals(IntentType.PROFILE, service.detectIntent("Je veux activer la 2FA").getIntent());
        assertEquals(IntentType.NOTIFICATIONS, service.detectIntent("Où sont mes notifications ?").getIntent());
        assertEquals(IntentType.STOLEN_CARD, service.detectIntent("Ma carte est volée").getIntent());
    }
}

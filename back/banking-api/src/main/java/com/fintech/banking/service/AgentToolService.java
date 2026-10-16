package com.fintech.banking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.entity.Session;
import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.CardBrand;
import com.fintech.banking.domain.enums.CardType;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.dto.request.CreateCardRequest;
import com.fintech.banking.dto.request.TransactionRequest;
import com.fintech.banking.dto.response.AccountResponse;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.PaymentKeyRepository;
import com.fintech.banking.dto.request.PaymentTransferRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentToolService {

    private final BankingAgentService bankingAgentService;
    private final AccountService accountService;
    private final TransactionService transactionService;
    private final CardService cardService;
    private final SupportTicketService supportTicketService;
    private final UserRepository userRepository;
    private final PaymentKeyRepository paymentKeyRepository;
    private final AccountRepository accountRepository;
    private final PaymentKeyService paymentKeyService;
    private static final Pattern CARD_EXPIRY_PATTERN = Pattern.compile("(?:^|\\D)(0?[1-9]|1[0-2])\\s*[/.-]\\s*(20\\d{2})(?:\\D|$)");
    private static final Pattern CARD_LAST_FOUR_PATTERN = Pattern.compile("(?:derniers? chiffres|last four|digits)[^0-9]*(\\d{4})", Pattern.CASE_INSENSITIVE);

    public AgentToolResult executeToolAction(BankingAgent agent,
                                            Session session,
                                            IntentResult intentResult,
                                            String userMessage) {
        if (agent == null) {
            return AgentToolResult.withFallback("Je ne peux pas traiter votre demande car l'agent est introuvable.", "agent.missing", null, null);
        }

        IntentType intent = intentResult != null ? intentResult.getIntent() : null;
        if (intent == null) {
            return AgentToolResult.withFallback("Je ne suis pas sûr de votre demande. Pouvez-vous préciser ce que vous souhaitez faire ?", "agent.unknown_intent", null, AgentDecision.REQUEST_INFO);
        }

        String email = resolveUserEmail(agent.getUserId());
        if (email == null) {
            return AgentToolResult.withFallback("Impossible de retrouver l'utilisateur pour cette session.", "agent.missing_user", null, null);
        }

        Map<String, Object> details = new HashMap<>();
        details.put("intent", intent.name());
        details.put("confidence", intentResult.getConfidence());
        details.put("isSensitive", intentResult.getIsSensitive());

        switch (intent) {
            case BALANCE:
                return handleBalance(email, userMessage, details);
            case HISTORY:
                return handleHistory(email, userMessage, intentResult, details);
            case TRANSFER:
                return handleTransfer(email, session, userMessage, intentResult, details);
            case CARD_CREATION:
                if (looksLikeCardStatusQuestion(userMessage)) {
                    return checkRecentCardStatus(email, userMessage, details);
                }
                if (containsCardDetails(userMessage)) {
                    return collectCardDetails(agent, userMessage, new HashMap<>(), true);
                }
                return new AgentToolResult(
                    localized(userMessage, "Yes, I can help you request a card. Provide the type (credit or debit), brand (Visa or Mastercard), expiry month and year, and the desired last four digits.", "Oui, je peux vous aider à demander une carte. Indiquez le type (crédit ou débit), la marque (Visa ou Mastercard), le nom du titulaire, le mois et l'année d'expiration, ainsi que les 4 derniers chiffres souhaités."),
                        "request_card_details",
                        details,
                        AgentDecision.REQUEST_INFO,
                        true,
                        false,
                        new HashMap<>());
            case CARD_SUPPORT:
                return informational(localized(userMessage, "I can help with a blocked, lost, expired card, or a card-limit question. Please describe the problem.", "Je peux vous aider pour une carte bloquée, perdue, expirée ou pour une question de limite. Précisez le problème rencontré."), "card_support", details);
            case PAYMENT:
                return informational(localized(userMessage, "For a payment, provide the amount, recipient, or payment key, then confirm the operation when I ask you.", "Pour un paiement, indiquez le montant, le bénéficiaire ou la clé de paiement, puis confirmez l'opération lorsque je vous le demanderai."), "payment_guidance", details);
            case WITHDRAWAL:
                return informational(localized(userMessage, "For a withdrawal, provide the amount and make sure your balance and limits allow it.", "Pour un retrait, indiquez le montant souhaité et vérifiez que votre solde et vos limites le permettent."), "withdrawal_guidance", details);
            case INVESTMENT:
                return informational(localized(userMessage, "I can help with your investments, their value, and available products. Please specify your question or investment.", "Je peux vous renseigner sur vos investissements, leur valeur et les produits disponibles. Précisez votre question ou le placement concerné."), "investment_guidance", details);
            case ACCOUNT:
                return handleAccount(email, userMessage, details);
            case PIX:
                return informational(localized(userMessage, "I can help with a PIX key, PIX payment, or PIX transfer. Please specify the operation you need.", "Je peux vous aider avec une clé PIX, un paiement PIX ou un virement PIX. Précisez l'opération souhaitée."), "pix_guidance", details);
            case PROFILE:
                return informational(localized(userMessage, "I can help with your profile, password, or 2FA security. Please specify the change you need.", "Je peux vous aider avec votre profil, votre mot de passe ou la sécurité 2FA. Précisez le changement souhaité."), "profile_guidance", details);
            case NOTIFICATIONS:
                return informational(localized(userMessage, "You can view your notifications and alerts in the Notifications section. Tell me if you are looking for a specific alert.", "Vous pouvez consulter vos notifications et alertes depuis la section Notifications. Précisez si vous recherchez une alerte particulière."), "notifications_guidance", details);
            case SUPPORT:
                return informational(localized(userMessage, "I can help with your account, cards, payments, transfers, or a support ticket. Please describe your request.", "Je peux vous aider avec votre compte, vos cartes, vos paiements, vos virements ou un ticket support. Décrivez votre demande."), "support_guidance", details);
            case FRAUD, STOLEN_CARD, CLAIM, UPDATE_SENSITIVE_DATA:
                return handleSensitiveRequest(email, intent, userMessage, intentResult, details);
            default:
                return AgentToolResult.withFallback("Je ne peux pas traiter cette demande automatiquement pour le moment.", "agent.unsupported_intent", details, AgentDecision.REQUEST_INFO);
        }
    }

    private AgentToolResult informational(String message, String action, Map<String, Object> details) {
        return new AgentToolResult(message, action, details, null, false, false, null);
    }

    private AgentToolResult handleAccount(String email, String userMessage, Map<String, Object> details) {
        String normalized = userMessage == null ? "" : userMessage.toLowerCase(Locale.ROOT);
        boolean asksForOthers = normalized.matches(".*\\b(sarah|someone|somebody|another|other|others|tous|toutes|all|every|everyone|available|exist|existing)\\b.*")
                && normalized.matches(".*\\b(compte|comptes|account|accounts|num(?:é|e)ro|numbers?|numeros?)\\b.*");
        if (asksForOthers) {
            return informational(localized(userMessage,
                    "For privacy and security, I cannot provide another person's account number or list all customer accounts. I can show only your own account number.",
                    "Pour des raisons de confidentialité et de sécurité, je ne peux pas communiquer le numéro d'une autre personne ni lister les comptes des clients. Je peux uniquement afficher votre propre numéro de compte."),
                    "account_privacy_refusal", details);
        }

        try {
            AccountResponse account = accountService.getMyAccount(email);
            boolean asksForOwnNumber = normalized.matches(".*\\b(my|mine|own|mon|ma|mes)\\b.*\\b(account|compte|number|numéro|numero)\\b.*")
                    || normalized.matches(".*\\b(account|compte)\\b.*\\b(numbers?|numéro|numero)\\b.*");
            if (asksForOwnNumber) {
                return informational(localized(userMessage,
                        "Your account number is " + account.getNumber() + ".",
                        "Votre numéro de compte est " + account.getNumber() + "."), "own_account_number", details);
            }
            return informational(accountGuidance(userMessage), "account_guidance", details);
        } catch (Exception ex) {
            log.warn("Failed to fetch available account numbers for {}: {}", email, ex.getMessage());
            return informational(localized(userMessage,
                    "I could not retrieve your account details. Please try again later.",
                    "Je n'ai pas pu récupérer les informations de votre compte. Veuillez réessayer plus tard."), "account_details_failed", details);
        }
    }

    private String accountGuidance(String userMessage) {
        return localized(userMessage,
                "I can help you view your account, branch, account number, and balance. Please specify which information you need.",
                "Je peux vous aider à consulter votre compte, votre agence, votre numéro de compte et votre solde. Précisez l'information recherchée.");
    }

    private String localized(String userMessage, String english, String french) {
        return isEnglish(userMessage) ? english : french;
    }

    private String localized(boolean english, String englishText, String frenchText) {
        return english ? englishText : frenchText;
    }

    private boolean isEnglish(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return false;
        }
        String normalized = " " + userMessage.toLowerCase(java.util.Locale.ROOT) + " ";
        long englishHints = java.util.Arrays.stream(new String[]{
                " where ", " what ", " how ", " account ", " branch ", " balance ", " information "
        }).filter(normalized::contains).count();
        long frenchHints = java.util.Arrays.stream(new String[]{
                " où ", " ou ", " quel ", " comment ", " compte ", " agence ", " solde ", " information "
        }).filter(normalized::contains).count();
        return englishHints > frenchHints;
    }

    private AgentToolResult handleBalance(String email, String userMessage, Map<String, Object> details) {
        try {
            AccountResponse account = accountService.getMyAccount(email);
            details.put("balance", account.getBalance());
                String message = localized(userMessage,
                    String.format("Your current balance is %s.", account.getBalance()),
                    String.format("Votre solde actuel est de %s.", account.getBalance()));
            return new AgentToolResult(message, "check_balance", details, null, false, false, null);
        } catch (Exception ex) {
            log.warn("Failed to fetch account balance for {}: {}", email, ex.getMessage());
            return AgentToolResult.withFallback(localized(userMessage, "I could not retrieve your balance. Please try again later.", "Je n'ai pas pu récupérer votre solde. Veuillez réessayer plus tard."), "check_balance_failed", details, null);
        }
    }

    private AgentToolResult handleHistory(String email, String userMessage, IntentResult intentResult, Map<String, Object> details) {
        try {
            JsonNode params = intentResult.getParameters();
            int limit = 5;
            if (params != null && params.has("limit") && params.get("limit").canConvertToInt()) {
                limit = Math.max(1, Math.min(20, params.get("limit").asInt()));
            }

            var transactions = transactionService.getHistory(email);
            if (transactions.isEmpty()) {
                return new AgentToolResult(localized(userMessage, "No recent transactions were found.", "Aucune transaction récente trouvée."), "fetch_history", details, null, false, false, null);
            }

            StringBuilder summary = new StringBuilder(localized(userMessage, "Here are your latest transactions:\n", "Voici vos dernières transactions :\n"));
            for (int i = 0; i < Math.min(limit, transactions.size()); i++) {
                TransactionResponse tx = transactions.get(i);
                summary.append(String.format("%d. %s %s — %s: %s %s %s\n",
                        i + 1,
                        tx.getType(),
                        tx.getAmount(),
                        isEnglish(userMessage) ? "status" : "statut",
                        tx.getStatus(),
                        tx.getSourceAccountNumber() != null ? (isEnglish(userMessage) ? "from " : "de ") + tx.getSourceAccountNumber() : "",
                        tx.getTargetAccountNumber() != null ? (isEnglish(userMessage) ? "to " : "vers ") + tx.getTargetAccountNumber() : ""));
            }
            details.put("returnedCount", Math.min(limit, transactions.size()));
            return new AgentToolResult(summary.toString().trim(), "fetch_history", details, null, false, false, null);
        } catch (Exception ex) {
            log.warn("Failed to fetch transaction history for {}: {}", email, ex.getMessage());
            return AgentToolResult.withFallback(localized(userMessage, "I could not load your transaction history. Please try again later.", "Je n'ai pas pu charger votre historique. Veuillez réessayer plus tard."), "fetch_history_failed", details, null);
        }
    }

    private AgentToolResult handleTransfer(String email,
                                          Session session,
                                          String userMessage,
                                          IntentResult intentResult,
                                          Map<String, Object> details) {
        JsonNode params = intentResult.getParameters();
        BigDecimal amount = null;
        String targetAccount = null;

        if (params != null) {
            if (params.has("amount") && params.get("amount") != null && !params.get("amount").isNull()) {
                try {
                    amount = params.get("amount").decimalValue();
                } catch (Exception ignored) {
                }
            }
            if (params.has("targetAccountNumber") && !params.get("targetAccountNumber").isNull()) {
                targetAccount = params.get("targetAccountNumber").asText();
            }
        }

        boolean missingAmount = amount == null || amount.compareTo(BigDecimal.ZERO) <= 0;
        boolean missingTarget = targetAccount == null || targetAccount.isBlank();
        if (missingAmount || missingTarget) {
            String message;
            if (missingAmount && missingTarget) {
                message = forgotDestinationAccount(userMessage)
                        ? localized(userMessage,
                        "I cannot retrieve or disclose another customer's account number. Ask the recipient for it or select a saved beneficiary, then provide the amount and destination account.",
                        "Je ne peux pas retrouver ni communiquer le numéro de compte d'un autre client. Demandez-le au bénéficiaire ou sélectionnez un bénéficiaire enregistré, puis indiquez le montant et le compte destinataire.")
                        : localized(userMessage, "To make a transfer, provide the amount and the destination account number or the recipient's payment key.",
                        "Pour effectuer un virement, indiquez le montant et le numéro de compte ou la clé de paiement du destinataire.");
            } else if (missingAmount) {
                message = localized(userMessage, "What amount would you like to transfer to " + targetAccount + "?",
                        "Quel montant souhaitez-vous virer vers " + targetAccount + " ?");
            } else {
                message = localized(userMessage, "Which account number or payment key should receive " + amount + "?",
                        "Quel numéro de compte ou quelle clé de paiement doit recevoir " + amount + " ?");
            }
            return new AgentToolResult(
                    message,
                    "request_transfer_details",
                    details,
                    AgentDecision.REQUEST_INFO,
                    true,
                    false,
                    null);
        }

        boolean viaPaymentKey = isPaymentKeyTarget(targetAccount);
        Map<String, Object> confirmationArgs = new HashMap<>();
        confirmationArgs.put("amount", amount);
        confirmationArgs.put("targetAccountNumber", targetAccount);
        confirmationArgs.put("viaPaymentKey", viaPaymentKey);
        confirmationArgs.put("english", isEnglish(userMessage));

        details.put("targetAccountNumber", targetAccount);
        details.put("transferAmount", amount);
        details.put("confirmationRequired", true);

        return new AgentToolResult(
            viaPaymentKey
                ? localized(userMessage,
                    String.format("Do you confirm the transfer of %s to payment key %s? (yes/no)", amount, targetAccount),
                    String.format("Confirmez-vous le virement de %s vers la clé de paiement %s ? (oui/non)", amount, targetAccount))
                : localized(userMessage,
                    String.format("Do you confirm the transfer of %s to account %s? (yes/no)", amount, targetAccount),
                    String.format("Confirmez-vous le virement de %s vers le compte %s ? (oui/non)", amount, targetAccount)),
                "confirm_transfer",
                details,
                null,
                false,
                true,
                confirmationArgs);
    }

    private boolean isPaymentKeyTarget(String target) {
        String value = target.trim();
        return accountRepository.findByNumber(value).isEmpty()
                && paymentKeyRepository.findByKeyValueAndActiveTrue(value).isPresent();
    }

    private boolean forgotDestinationAccount(String userMessage) {
        if (userMessage == null) {
            return false;
        }
        String normalized = userMessage.toLowerCase(Locale.ROOT);
        return normalized.matches(".*\\b(forgot|forget|forgotten|remember|remembered|oubli(?:é|e|er)|rappelle|souviens)\\b.*")
                && normalized.matches(".*\\b(account|compte|numero|numéro|number)\\b.*");
    }

    private AgentToolResult executeConfirmedTransfer(String email,
                                                      Session session,
                                                      String userMessage,
                                                      Map<String, Object> args) {
        boolean english = args != null && args.get("english") instanceof Boolean
            ? (Boolean) args.get("english")
            : isEnglish(userMessage);
        if (args == null) {
            return AgentToolResult.withFallback(
                localized(english, "The transfer could not be completed: required information is missing.", "Impossible de finaliser le virement: informations manquantes."),
                    "execute_transfer_failed",
                    null,
                    AgentDecision.REQUEST_INFO);
        }

        BigDecimal amount = null;
        String targetAccount = null;

        Object rawAmount = args.get("amount");
        if (rawAmount instanceof Number) {
            amount = BigDecimal.valueOf(((Number) rawAmount).doubleValue());
        } else if (rawAmount instanceof String) {
            try {
                amount = new BigDecimal((String) rawAmount);
            } catch (NumberFormatException ignored) {
            }
        }

        Object rawTarget = args.get("targetAccountNumber");
        if (rawTarget != null) {
            targetAccount = rawTarget.toString();
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 || targetAccount == null || targetAccount.isBlank()) {
            return AgentToolResult.withFallback(
                    localized(english, "The transfer information is invalid. Please try again.", "Informations de virement invalides. Veuillez réessayer."),
                    "execute_transfer_failed",
                    null,
                    AgentDecision.REQUEST_INFO);
        }

        try {
            boolean viaPaymentKey = Boolean.TRUE.equals(args.get("viaPaymentKey"));
            TransactionResponse response;
            if (viaPaymentKey) {
                PaymentTransferRequest keyRequest = new PaymentTransferRequest();
                keyRequest.setPaymentKey(targetAccount);
                keyRequest.setAmount(amount);
                keyRequest.setDescription("Paiement par clé confirmé via l'agent conversationnel");
                response = paymentKeyService.transfer(email, keyRequest);
            } else {
                TransactionRequest request = new TransactionRequest();
                request.setAmount(amount);
                request.setTargetAccountNumber(targetAccount);
                request.setDescription("Virement confirmé via l'agent conversationnel");
                request.setSessionId(session != null ? session.getId() : null);
                response = transactionService.transfer(email, request);
            }
            String targetLabelEn = (viaPaymentKey ? "payment key " : "account ") + targetAccount;
            String targetLabelFr = (viaPaymentKey ? "la clé de paiement " : "le compte ") + targetAccount;
            Map<String, Object> resultDetails = new HashMap<>();
            resultDetails.put("targetAccountNumber", targetAccount);
            resultDetails.put("transferAmount", amount);
            resultDetails.put("transactionStatus", response.getStatus());

            String message;
            if (response.getStatus() != null && response.getStatus().name().equals("PENDING")) {
                message = localized(english,
                        String.format("Your transfer of %s to %s was submitted for validation.", amount, targetLabelEn),
                        String.format("Votre virement de %s vers %s a été soumis pour validation.", amount, targetLabelFr));
            } else {
                message = localized(english,
                        String.format("Your transfer of %s to %s was completed successfully.", amount, targetLabelEn),
                        String.format("Votre virement de %s vers %s a été effectué avec succès.", amount, targetLabelFr));
            }

            return new AgentToolResult(message, "execute_transfer", resultDetails, null, false, false, null);
        } catch (Exception ex) {
            log.warn("Transfer failed for {}: {}", email, ex.getMessage());
            Map<String, Object> errorDetails = new HashMap<>();
            errorDetails.put("error", ex.getMessage());
            boolean destinationNotFound = "Destination account not found".equals(ex.getMessage())
                || "Payment key not found".equals(ex.getMessage());
            String englishMessage = destinationNotFound
                ? String.format("The recipient %s was not found. Check the account number or payment key and try again.", targetAccount)
                : "The transfer could not be completed. Check the amount and destination account, then try again.";
            String frenchMessage = destinationNotFound
                ? String.format("Le destinataire %s est introuvable. Vérifiez le numéro de compte ou la clé de paiement et réessayez.", targetAccount)
                : "Le virement n'a pas pu être effectué. Vérifiez le montant et le compte destinataire, puis réessayez.";
            return new AgentToolResult(
                localized(english, englishMessage, frenchMessage),
                    "execute_transfer_failed",
                    errorDetails,
                    AgentDecision.REQUEST_INFO,
                    true,
                    false,
                    null);
        }
    }

    private AgentToolResult handleSensitiveRequest(String email,
                                                   IntentType intent,
                                                   String userMessage,
                                                   IntentResult intentResult,
                                                   Map<String, Object> details) {
        try {
            boolean emailUpdate = intent == IntentType.UPDATE_SENSITIVE_DATA && isEmailUpdateRequest(userMessage);
            if (emailUpdate) {
                supportTicketService.findLatestEmailChangeTicket(resolveUserId(email)).ifPresent(ticket -> {
                    details.put("existingEmailTicketId", ticket.getId());
                    details.put("existingEmailTicketStatus", ticket.getStatus().name());
                });
                Object existingTicketId = details.get("existingEmailTicketId");
                Object existingTicketStatus = details.get("existingEmailTicketStatus");
                if (existingTicketId != null && "RESOLVED".equals(existingTicketStatus)) {
                    return new AgentToolResult(
                            localized(userMessage,
                                    "Your email verification ticket #" + existingTicketId + " has been approved. Your login email has not changed yet. Open Profile > Complete email change, enter the new address, and confirm your current password. You do not need another ticket.",
                                    "Votre demande de vérification de l’e-mail, ticket #" + existingTicketId + ", a été approuvée. Votre adresse de connexion n’a pas encore changé. Ouvrez Profil > Compléter la modification de l’e-mail, saisissez la nouvelle adresse et confirmez votre mot de passe actuel. Vous n’avez pas besoin d’un nouveau ticket."),
                            "email_change_approved",
                            details,
                            null,
                            false,
                            false,
                            null);
                }
                if (existingTicketId != null && ("OPEN".equals(existingTicketStatus)
                        || "IN_PROGRESS".equals(existingTicketStatus))) {
                    return new AgentToolResult(
                            localized(userMessage,
                                    "Your email-change request is already being reviewed in ticket #" + existingTicketId + ". Track it under Help & Support > Your recent tickets. You do not need to open another ticket.",
                                    "Votre demande de modification d’e-mail est déjà en cours d’examen dans le ticket #" + existingTicketId + ". Suivez-le dans Aide et support > Vos tickets récents. Vous n’avez pas besoin d’ouvrir un autre ticket."),
                            "email_change_pending",
                            details,
                            null,
                            false,
                            false,
                            null);
                }
            }
            String subject = emailUpdate ? localized(userMessage,
                    "Email address change verification",
                    "Vérification de modification d'adresse e-mail") : buildSupportSubject(intent);
            String description = "Demande sensible détectée via le chat : " + userMessage;
            String processKey = determineProcessKey(intent);
            Map<String, Object> variables = new HashMap<>();
            variables.put("userEmail", email);
            variables.put("intent", intent.name());
            variables.put("message", userMessage);
            SupportTicket ticket = supportTicketService.createTicketWithWorkflow(
                    resolveUserId(email),
                    subject,
                    description,
                    mapIntentToTicketType(intent),
                    resolveUserId(email),
                    processKey,
                    variables);

            details.put("ticketProcess", processKey);
            details.put("ticketType", intent.name());
            details.put("supportTicketId", ticket.getId());

            return new AgentToolResult(
                    emailUpdate
                            ? localized(userMessage,
                                    "Your email address has not been changed yet because this request requires identity verification. Support ticket #" + ticket.getId() + " is open. Track it under Help & Support > Your recent tickets. Never share your password or a one-time verification code in chat.",
                                    "Votre adresse e-mail n'a pas encore été modifiée, car cette demande nécessite une vérification d'identité. Le ticket de support #" + ticket.getId() + " est ouvert. Suivez-le dans Aide et support > Vos tickets récents. Ne partagez jamais votre mot de passe ni un code de vérification à usage unique dans le chat.")
                            : localized(userMessage,
                                    "Your request was sent to our verification team. Support ticket #" + ticket.getId() + " is open. Track it under Help & Support > Your recent tickets.",
                                    "Votre demande a été transmise à notre équipe de vérification. Le ticket de support #" + ticket.getId() + " est ouvert. Suivez-le dans Aide et support > Vos tickets récents."),
                    "create_support_ticket",
                    details,
                    null,
                    false,
                    false,
                    null);
        } catch (Exception ex) {
            log.warn("Failed to create support ticket for {}: {}", email, ex.getMessage());
            details.put("error", ex.getMessage());
            return AgentToolResult.withFallback(
                    "Je n'ai pas pu créer un ticket de support pour le moment. Veuillez réessayer plus tard.",
                    "create_support_ticket_failed",
                    details,
                    null);
        }
    }

    private boolean isEmailUpdateRequest(String userMessage) {
        if (userMessage == null) {
            return false;
        }
        String normalized = userMessage.toLowerCase(Locale.ROOT);
        boolean mentionsEmail = normalized.matches("(?s).*\\b(email|e-mail|courriel|mail)\\b.*");
        boolean asksForChange = normalized.matches("(?s).*\\b(change|update|modify|modifier|changer|changez|mettre\\s+à\\s+jour|mise\\s+à\\s+jour)\\b.*");
        return mentionsEmail && asksForChange;
    }

    public AgentToolResult handlePendingToolConfirmation(BankingAgent agent,
                                                          Session session,
                                                          String userMessage,
                                                          IntentResult intentResult) {
        if (agent == null || agent.getContext() == null) {
            return null;
        }

        String pendingAction = bankingAgentService.getPendingToolAction(agent);
        JsonNode pendingArguments = bankingAgentService.getPendingToolArguments(agent);
        if (pendingAction == null) {
            return null;
        }

        if ("request_card_details".equals(pendingAction)) {
            Map<String, Object> args = pendingArguments != null && pendingArguments.isObject()
                    ? new ObjectMapper().convertValue(pendingArguments, Map.class)
                    : new HashMap<>();
            return collectCardDetails(agent, userMessage, args);
        }

        String normalized = userMessage == null ? "" : userMessage.trim().toLowerCase();
        boolean confirm = normalized.matches("^(oui|yes|confirm|confirme|ok|d'accord|d accord|affirmatif|fait le|fais le|fait-le|fais-le|vas-y|vas y|go)$");
        boolean deny = normalized.matches("^(non|no|cancel|annuler|refuser|ne pas)$");

        if (confirm) {
            bankingAgentService.clearPendingToolAction(agent.getId());
            if ("confirm_transfer".equals(pendingAction) || "execute_transfer".equals(pendingAction)) {
                Map<String, Object> args = pendingArguments != null && pendingArguments.isObject()
                        ? new ObjectMapper().convertValue(pendingArguments, Map.class)
                        : null;
                return executeConfirmedTransfer(resolveUserEmail(agent.getUserId()), session, userMessage, args);
            }
            if ("confirm_card_creation".equals(pendingAction)) {
                Map<String, Object> args = pendingArguments != null && pendingArguments.isObject()
                    ? new ObjectMapper().convertValue(pendingArguments, Map.class)
                    : Map.of();
                return createConfirmedCard(resolveUserEmail(agent.getUserId()), args);
            }
            return AgentToolResult.withFallback(
                    "Confirmation reçue, mais aucune action en attente n'a pu être trouvée.",
                    "pending_action_missing",
                    null,
                    AgentDecision.REQUEST_INFO);
        }

        if (deny) {
            bankingAgentService.clearPendingToolAction(agent.getId());
            return new AgentToolResult(
                    "Le virement a été annulé. Si vous le souhaitez, vous pouvez en demander un nouveau.",
                    "cancel_transfer",
                    new HashMap<>(Map.of("pendingAction", pendingAction)),
                    null,
                    false,
                    false,
                    null);
        }

        return new AgentToolResult(
                "Veuillez répondre par oui ou non pour confirmer le virement.",
                "confirm_transfer_prompt",
                Map.of("pendingAction", pendingAction),
                AgentDecision.REQUEST_INFO,
                true,
                false,
                null);
    }

    private AgentToolResult createConfirmedCard(String email, Map<String, Object> args) {
        try {
            CreateCardRequest request = new CreateCardRequest();
            request.setCardType(CardType.valueOf(String.valueOf(args.get("cardType")).toUpperCase(Locale.ROOT)));
            request.setBrand(CardBrand.valueOf(String.valueOf(args.get("brand")).toUpperCase(Locale.ROOT)));
            request.setHolderName(resolveUserName(email));
            request.setExpiryMonth(Integer.valueOf(String.valueOf(args.get("expiryMonth"))));
            request.setExpiryYear(Integer.valueOf(String.valueOf(args.get("expiryYear"))));
            request.setLastFour(String.valueOf(args.get("lastFour")));

            var card = cardService.createCard(email, request);
            return new AgentToolResult(
                    String.format("Votre carte %s %s a été créée avec succès. Elle se termine par %s et expire en %02d/%d.",
                            card.getCardType(), card.getBrand(), card.getLastFour(), card.getExpiryMonth(), card.getExpiryYear()),
                    "create_card",
                    Map.of("cardId", card.getId(), "lastFour", card.getLastFour()),
                    null,
                    false,
                    false,
                    null);
        } catch (Exception ex) {
            log.warn("Card creation failed for {}: {}", email, ex.getMessage());
            return AgentToolResult.withFallback(
                    "La carte n'a pas pu être créée. Vérifiez les informations fournies et réessayez.",
                    "create_card_failed",
                    Map.of("error", String.valueOf(ex.getMessage())),
                    AgentDecision.REQUEST_INFO);
        }
    }

    private boolean looksLikeCardStatusQuestion(String userMessage) {
        if (userMessage == null) {
            return false;
        }

        String normalized = userMessage.toLowerCase(Locale.ROOT)
                .replace("’", "'")
                .replace("à", "a")
                .replace("é", "e")
                .replace("è", "e")
                .replace("ê", "e")
                .replace("ï", "i");

        boolean hasCard = normalized.contains("carte") || normalized.contains("card");
        if (!hasCard) {
            return false;
        }

        boolean explicitCreationIntent = normalized.contains("je veux")
                || normalized.contains("j ai")
                || normalized.contains("jai")
                || normalized.contains("demander une carte")
                || normalized.contains("demande de carte")
                || normalized.contains("ouvrir une carte")
                || normalized.contains("creer une carte")
                || normalized.contains("creee une carte")
                || normalized.contains("creer la carte")
                || normalized.contains("crée une carte")
                || normalized.contains("créer une carte")
                || normalized.contains("type credit")
                || normalized.contains("type debit")
                || normalized.contains("visa")
                || normalized.contains("mastercard")
                || normalized.contains("mois")
                || normalized.contains("annee")
                || normalized.contains("202")
                || normalized.contains("203");

        boolean statusPattern = normalized.contains("est ce que")
                || normalized.contains("est-ce que")
                || normalized.contains("a ete")
                || normalized.contains("a été")
                || normalized.contains("existe")
                || normalized.contains("exist")
                || normalized.contains("deja")
                || normalized.contains("cree")
                || normalized.contains("crée")
                || normalized.contains("created");

        if (statusPattern && !explicitCreationIntent) {
            return true;
        }

        return false;
    }

    private AgentToolResult checkRecentCardStatus(String email, String userMessage, Map<String, Object> details) {
        try {
            var cards = cardService.getMyCards(email);
            if (cards == null || cards.isEmpty()) {
                return informational("Je n'ai pas trouvé de carte active associée à votre compte pour le moment.", "card_status_unknown", details);
            }

            var latest = cards.stream().reduce((first, second) -> second).orElse(cards.get(0));
            return new AgentToolResult(
                    String.format("Oui, votre carte %s %s a bien été créée. Elle se termine par %s et expire en %02d/%d.",
                            latest.getCardType(), latest.getBrand(), latest.getLastFour(), latest.getExpiryMonth(), latest.getExpiryYear()),
                    "card_status",
                    Map.of("cardId", latest.getId(), "lastFour", latest.getLastFour(), "cardType", latest.getCardType(), "brand", latest.getBrand()),
                    null,
                    false,
                    false,
                    null);
        } catch (Exception ex) {
            log.warn("Check card status failed for {}: {}", email, ex.getMessage());
            return AgentToolResult.withFallback(
                    "Je n'ai pas pu vérifier l'état de votre carte pour le moment. Veuillez réessayer plus tard.",
                    "card_status_failed",
                    details,
                    AgentDecision.REQUEST_INFO);
        }
    }

    private String resolveUserName(String email) {
        return userRepository.findByEmail(email)
                .map(User::getName)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    private AgentToolResult collectCardDetails(BankingAgent agent, String userMessage, Map<String, Object> args) {
        return collectCardDetails(agent, userMessage, args, false);
    }

    private AgentToolResult collectCardDetails(BankingAgent agent,
                                               String userMessage,
                                               Map<String, Object> args,
                                               boolean keepRequestOpen) {
        String normalized = userMessage == null ? "" : userMessage.toLowerCase(Locale.ROOT);

        if (normalized.matches(".*\\b(credit|crédit)\\b.*")) args.put("cardType", "CREDIT");
        if (normalized.matches(".*\\b(debit|débit)\\b.*")) args.put("cardType", "DEBIT");
        if (normalized.contains("visa")) args.put("brand", "VISA");
        if (normalized.contains("mastercard") || normalized.contains("master card")) args.put("brand", "MASTERCARD");

        Matcher expiry = CARD_EXPIRY_PATTERN.matcher(normalized);
        if (expiry.find()) {
            args.put("expiryMonth", Integer.valueOf(expiry.group(1)));
            args.put("expiryYear", Integer.valueOf(expiry.group(2)));
        } else {
            Matcher month = Pattern.compile("mois\\s*(?:est|:)?\\s*(\\d{1,2})").matcher(normalized);
            Matcher year = Pattern.compile("(?:année|annee|year)\\s*(?:est|:)?\\s*(20\\d{2})").matcher(normalized);
            if (month.find()) args.put("expiryMonth", Integer.valueOf(month.group(1)));
            if (year.find()) args.put("expiryYear", Integer.valueOf(year.group(1)));
        }

        Matcher lastFour = CARD_LAST_FOUR_PATTERN.matcher(normalized);
        if (lastFour.find()) {
            args.put("lastFour", lastFour.group(1));
        } else {
            Matcher standaloneFour = Pattern.compile("(?<!\\d)(\\d{4})(?!\\d)").matcher(normalized);
            while (standaloneFour.find()) {
                String value = standaloneFour.group(1);
                if (!value.startsWith("20")) {
                    args.put("lastFour", value);
                    break;
                }
            }
        }

        String[] missing = {"cardType", "brand", "expiryMonth", "expiryYear", "lastFour"};
        StringBuilder missingFields = new StringBuilder();
        for (String field : missing) {
            if (!args.containsKey(field)) {
                if (missingFields.length() > 0) missingFields.append(", ");
                missingFields.append(field);
            }
        }

        if (missingFields.length() > 0) {
            bankingAgentService.updateContextFields(agent.getId(), Map.of(
                    "pendingToolAction", "request_card_details",
                    "pendingToolArguments", args));
            return new AgentToolResult(
                    "J'ai enregistré les informations disponibles. Il me manque encore : " + missingFields + ".",
                    "request_card_details",
                    args,
                    AgentDecision.REQUEST_INFO,
                    true,
                    false,
                    args);
        }

        if (keepRequestOpen) {
            bankingAgentService.updateContextFields(agent.getId(), Map.of(
                "pendingToolAction", "request_card_details",
                "pendingToolArguments", args));
            return new AgentToolResult(
                "J'ai enregistré les informations disponibles. Vérifiez-les puis confirmez la demande de carte.",
                "request_card_details",
                args,
                AgentDecision.REQUEST_INFO,
                true,
                false,
                args);
        }

        bankingAgentService.updateContextFields(agent.getId(), Map.of(
            "pendingToolAction", "confirm_card_creation",
            "pendingToolArguments", args));
        return new AgentToolResult(
                String.format("Confirmez-vous la demande de carte %s %s, expiration %02d/%d, derniers chiffres %s ? (oui/non)",
                        args.get("cardType"), args.get("brand"), args.get("expiryMonth"), args.get("expiryYear"), args.get("lastFour")),
                "confirm_card_creation",
                args,
                null,
                false,
                true,
                args);
    }

    private boolean containsCardDetails(String userMessage) {
        if (userMessage == null) {
            return false;
        }

        String normalized = userMessage.toLowerCase(Locale.ROOT);
        return normalized.contains("type credit")
                || normalized.contains("type debit")
                || normalized.contains("visa")
                || normalized.contains("mastercard")
                || normalized.matches(".*\\b(?:mois|annee|année)\\s*[:=]?\\s*\\d{1,2}.*")
                || CARD_EXPIRY_PATTERN.matcher(normalized).find()
                || CARD_LAST_FOUR_PATTERN.matcher(normalized).find();
    }

    private String resolveUserEmail(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElse(null);
    }

    private UUID resolveUserId(String email) {
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    private String buildSupportSubject(IntentType intent) {
        return switch (intent) {
            case FRAUD -> "Signalement de fraude";
            case STOLEN_CARD -> "Carte volée";
            case CLAIM -> "Réclamation client";
            case UPDATE_SENSITIVE_DATA -> "Mise à jour de données sensibles";
            default -> "Support bancaire";
        };
    }

    private TicketType mapIntentToTicketType(IntentType intent) {
        return switch (intent) {
            case FRAUD, STOLEN_CARD, CLAIM -> TicketType.FRAUD;
            case UPDATE_SENSITIVE_DATA -> TicketType.DATA_UPDATE;
            default -> TicketType.GENERAL;
        };
    }

    private String determineProcessKey(IntentType intent) {
        return switch (intent) {
            case FRAUD, STOLEN_CARD, CLAIM -> "fraudValidationProcess";
            case UPDATE_SENSITIVE_DATA -> "dataUpdateValidationProcess";
            default -> "transferValidationProcess";
        };
    }

    public static class AgentToolResult {
        private final String botMessage;
        private final String action;
        private final Map<String, Object> details;
        private final AgentDecision decisionOverride;
        private final boolean requiresMoreInfo;
        private final boolean requiresConfirmation;
        private final Map<String, Object> arguments;

        public AgentToolResult(String botMessage,
                               String action,
                               Map<String, Object> details,
                               AgentDecision decisionOverride,
                               boolean requiresMoreInfo,
                               boolean requiresConfirmation,
                               Map<String, Object> arguments) {
            this.botMessage = botMessage;
            this.action = action;
            this.details = details;
            this.decisionOverride = decisionOverride;
            this.requiresMoreInfo = requiresMoreInfo;
            this.requiresConfirmation = requiresConfirmation;
            this.arguments = arguments;
        }

        public static AgentToolResult withFallback(String botMessage,
                                                  String action,
                                                  Map<String, Object> details,
                                                  AgentDecision decisionOverride) {
            return new AgentToolResult(botMessage, action, details, decisionOverride, decisionOverride == AgentDecision.REQUEST_INFO, false, null);
        }

        public String getBotMessage() {
            return botMessage;
        }

        public String getAction() {
            return action;
        }

        public Map<String, Object> getDetails() {
            return details;
        }

        public AgentDecision getDecisionOverride() {
            return decisionOverride;
        }

        public boolean isRequiresMoreInfo() {
            return requiresMoreInfo;
        }

        public boolean isRequiresConfirmation() {
            return requiresConfirmation;
        }

        public Map<String, Object> getArguments() {
            return arguments;
        }
    }
}

package com.fintech.banking.workflow.delegate;

import com.fintech.banking.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Generic notification service task used across the transfer and fraud
 * BPMN processes. Picks the appropriate {@link NotificationService} message
 * based on the current BPMN activity id so a single delegate bean can be
 * reused by every "Notifier ..." service task.
 */
@Slf4j
@Component("notifyDelegate")
@RequiredArgsConstructor
public class NotifyDelegate implements JavaDelegate {

    private final NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        UUID userId = parseUserId(execution.getVariable("userId"));
        String activityId = execution.getCurrentActivityId();
        Object amount = execution.getVariable("amount");
        Long ticketId = parseTicketId(execution.getVariable("supportTicketId"));
        String comment = stringValue(execution.getVariable("comment"));

        try {
            if (userId == null) {
                log.warn("notifyDelegate: no userId available for activity {}", activityId);
                return;
            }
            switch (activityId == null ? "" : activityId) {
                case "notifyRejectedTask" -> notificationService.notifyTicketUpdated(
                        userId,
                        ticketId,
                        messageOrDefault(comment, "Your sensitive data update request has been rejected."));
                case "notifyInfoTask" -> notificationService.notifyInfoRequested(
                        userId,
                        ticketId,
                        messageOrDefault(comment,
                                "Please provide the additional information needed to continue reviewing your request."));
                case "notifyEscalationTask" -> notificationService.notifyTicketUpdated(
                        userId,
                        ticketId,
                        "Your request has been escalated for priority review.");
                case "taskNotifyApprouve" -> {
                    if (ticketId == null) {
                        notificationService.notifyTransferApproved(userId, String.valueOf(amount));
                    }
                }
                case "taskNotifyRejet" -> notificationService.notifyTransferRejected(userId, "Rejete par l'administrateur");
                case "taskNotifyCompteBloque", "Task_NotifyCompteBloque" -> notificationService.notifyAccountLocked(userId);
                case "taskNotifySoldeInsuffisant" -> notificationService.notifySecurityAlert(userId, "Solde insuffisant pour le virement");
                case "taskNotifyBeneficiaireInvalide" -> notificationService.notifySecurityAlert(userId, "Beneficiaire invalide");
                case "taskNotifyErreurTech" -> notificationService.notifySecurityAlert(userId, "Erreur technique lors du virement");
                case "Task_NotifyBlocage" -> notificationService.notifySecurityAlert(userId, "Carte bloquee suite a une fraude");
                case "Task_NotifyErreur" -> notificationService.notifySecurityAlert(userId, "Echec du blocage de la carte");
                case "Task_NotifyContact" -> notificationService.notifyInfoRequested(userId, "Justificatifs necessaires suite a une alerte fraude");
                case "Task_NotifyFauxPositif" -> notificationService.notifySecurityAlert(userId, "Alerte fraude traitee comme faux positif");
                default -> notificationService.notifySecurityAlert(userId, "Mise a jour du dossier: " + activityId);
            }
        } catch (Exception ex) {
            log.error("notifyDelegate: failed to send notification for activity {}: {}", activityId, ex.getMessage());
        }
    }

    private UUID parseUserId(Object raw) {
        if (raw == null) {
            return null;
        }
        try {
            return UUID.fromString(raw.toString());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private Long parseTicketId(Object raw) {
        if (raw == null) {
            return null;
        }
        try {
            return Long.valueOf(raw.toString());
        } catch (NumberFormatException ex) {
            log.warn("notifyDelegate: invalid supportTicketId {}", raw);
            return null;
        }
    }

    private String stringValue(Object raw) {
        return raw == null ? null : raw.toString();
    }

    private String messageOrDefault(String message, String defaultMessage) {
        return message == null || message.isBlank() ? defaultMessage : message.trim();
    }
}

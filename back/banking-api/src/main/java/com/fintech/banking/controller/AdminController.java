package com.fintech.banking.controller;

import com.fintech.banking.dto.response.ClientResponse;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.UserRole;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.AdminService;
import com.fintech.banking.service.AdminTicketAssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import com.fintech.banking.dto.response.PageResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;
    private final AdminTicketAssistantService adminTicketAssistantService;
    private final UserRepository userRepository;

    private UUID resolveAdminId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found: " + email));
    }

    private String resolveAdminEmail(Authentication authentication) {
        return authentication.getName();
    }

    private void requireAdmin(Authentication authentication) {
        log.info("Admin guard check: name={}, authorities={}",
                authentication != null ? authentication.getName() : "null",
                authentication != null ? authentication.getAuthorities() : "null");
        if (authentication == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Admin access required");
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "Admin access required"));

        if (user.getRole() != UserRole.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminService.DashboardResponse> dashboard(Authentication authentication) {
        requireAdmin(authentication);
        return ResponseEntity.ok(adminService.getDashboard());
    }

    @GetMapping("/tasks")
    public ResponseEntity<PageResponse<AdminService.TaskSummaryResponse>> tasks(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        requireAdmin(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(PageResponse.from(adminService.getTasks(pageable)));
    }

    @GetMapping("/tickets")
    public ResponseEntity<PageResponse<AdminService.TicketSummaryResponse>> tickets(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        requireAdmin(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(PageResponse.from(adminService.getTickets(pageable)));
    }

    @PostMapping("/tickets/{ticketId}/action")
    public ResponseEntity<AdminService.TicketSummaryResponse> actOnGeneralTicket(
            Authentication authentication,
            @PathVariable Long ticketId,
            @Valid @RequestBody AdminService.GeneralTicketActionRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.ok(adminService.handleGeneralTicketAction(
                ticketId,
                resolveAdminId(authentication),
                resolveAdminEmail(authentication),
                request));
    }

    @PostMapping("/tickets/{ticketId}/ai-draft")
    public ResponseEntity<AiTicketReplyDraftResponse> draftGeneralTicketReply(
            Authentication authentication,
            @PathVariable Long ticketId,
            @Valid @RequestBody AiTicketReplyDraftRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.ok(new AiTicketReplyDraftResponse(
                adminTicketAssistantService.draftReply(ticketId, request.getQuestion())));
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<AdminService.TaskDetailResponse> task(
            Authentication authentication,
            @PathVariable Long taskId) {
        requireAdmin(authentication);
        return ResponseEntity.ok(adminService.getTask(taskId));
    }

    @PostMapping("/tasks/{taskId}/action")
    public ResponseEntity<AdminService.TaskDetailResponse> action(
            Authentication authentication,
            @PathVariable Long taskId,
            @Valid @RequestBody AdminService.TaskActionRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.ok(adminService.handleTaskAction(
                taskId,
                resolveAdminId(authentication),
                resolveAdminEmail(authentication),
                request));
    }

    @GetMapping("/users")
    public ResponseEntity<PageResponse<AdminService.UserSummaryResponse>> users(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        requireAdmin(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(PageResponse.from(adminService.getUsers(pageable)));
    }

    @PostMapping("/users/{userId}/block")
    public ResponseEntity<AdminService.UserSummaryResponse> blockUser(
            Authentication authentication,
            @PathVariable UUID userId,
            @RequestParam(required = false) String reason) {
        requireAdmin(authentication);
        return ResponseEntity.ok(adminService.blockUser(userId, resolveAdminEmail(authentication), reason));
    }

    @PostMapping("/users/{userId}/unblock")
    public ResponseEntity<AdminService.UserSummaryResponse> unblockUser(
            Authentication authentication,
            @PathVariable UUID userId) {
        requireAdmin(authentication);
        return ResponseEntity.ok(adminService.unblockUser(userId, resolveAdminEmail(authentication)));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<PageResponse<AdminService.AuditLogResponse>> auditLogs(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        requireAdmin(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(PageResponse.from(adminService.getAuditLogs(pageable)));
    }

    @GetMapping("/security-events")
    public ResponseEntity<PageResponse<AdminService.SecurityEventResponse>> securityEvents(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        requireAdmin(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        return ResponseEntity.ok(PageResponse.from(adminService.getSecurityEvents(pageable)));
    }

    @PostMapping("/security-events/{eventId}/resolve")
    public ResponseEntity<AdminService.SecurityEventResponse> resolveSecurityEvent(
            Authentication authentication,
            @PathVariable UUID eventId) {
        requireAdmin(authentication);
        return ResponseEntity.ok(adminService.resolveSecurityEvent(eventId, resolveAdminEmail(authentication)));
    }

    public record AiTicketReplyDraftRequest(
            @NotBlank @Size(max = 1000) String question) {
        public String getQuestion() {
            return question;
        }
    }

    public record AiTicketReplyDraftResponse(String draft) {
    }
}
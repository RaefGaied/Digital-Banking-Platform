package com.fintech.banking.mcp;

import com.fintech.banking.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class McpToolAuditAspect {

    private final AuditLogService auditLogService;

    @Around("@annotation(org.springframework.ai.tool.annotation.Tool)")
    public Object auditToolCall(ProceedingJoinPoint joinPoint) throws Throwable {
        String toolName = joinPoint.getSignature().getName();
        String email = authenticatedEmail();
        long startedAt = System.nanoTime();
        try {
            Object result = joinPoint.proceed();
            auditLogService.log(email, "MCP_TOOL_CALL", "MCP_TOOL", toolName,
                    "status=SUCCESS,durationMs=" + elapsedMillis(startedAt), "mcp");
            return result;
        } catch (Throwable error) {
            auditLogService.logFailure(email, "MCP_TOOL_CALL",
                    "tool=" + toolName + ",status=FAILURE,durationMs=" + elapsedMillis(startedAt),
                    "mcp");
            throw error;
        }
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    private String authenticatedEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? "unknown" : authentication.getName();
    }
}

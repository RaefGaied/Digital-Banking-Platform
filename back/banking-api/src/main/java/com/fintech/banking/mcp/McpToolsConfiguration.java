package com.fintech.banking.mcp;

import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class McpToolsConfiguration {

    @Bean
    public ToolCallbackProvider bankingToolCallbackProvider(BankingMcpTools bankingMcpTools) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(bankingMcpTools)
                .build();
    }
}

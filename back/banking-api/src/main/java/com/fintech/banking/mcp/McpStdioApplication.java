package com.fintech.banking.mcp;

import com.fintech.banking.BankingApiApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

public class McpStdioApplication {

    public static void main(String[] args) {
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(BankingApiApplication.class)
                .web(WebApplicationType.NONE)
                .run(args)) {
            context.getBean(McpJsonRpcServer.class).serve();
        }
    }
}
package com.fintech.banking.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class McpJsonRpcServer {

    private static final String PROTOCOL_VERSION = "2024-11-05";

    private final McpToolRegistry toolRegistry;
    private final ObjectMapper objectMapper;
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(McpJsonRpcServer.class);

    public McpJsonRpcServer(McpToolRegistry toolRegistry, ObjectMapper objectMapper) {
        this.toolRegistry = toolRegistry;
        this.objectMapper = objectMapper;
    }

    public void serve() {
        serve(System.in, System.out);
    }

    public void serve(InputStream inputStream, OutputStream outputStream) {
        try (BufferedInputStream input = new BufferedInputStream(inputStream);
             BufferedOutputStream output = new BufferedOutputStream(outputStream)) {
            while (true) {
                JsonNode message = readMessage(input);
                if (message == null) {
                    break;
                }

                if (!message.hasNonNull("method")) {
                    continue;
                }

                String method = message.get("method").asText();
                JsonNode idNode = message.get("id");

                if (idNode == null || idNode.isNull()) {
                    continue;
                }

                JsonNode result = handleRequest(method, message.path("params"));
                ObjectNode response = objectMapper.createObjectNode();
                response.put("jsonrpc", "2.0");
                response.set("id", idNode);
                response.set("result", result);
                writeMessage(output, response);
            }
        } catch (IOException ex) {
            logger.error("MCP stdio server stopped", ex);
        }
    }

    private JsonNode handleRequest(String method, JsonNode params) {
        return switch (method) {
            case "initialize" -> handleInitialize();
            case "tools/list" -> handleToolsList();
            case "tools/call" -> handleToolsCall(params);
            default -> errorResult(-32601, "Method not found: " + method);
        };
    }

    private JsonNode handleInitialize() {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("protocolVersion", PROTOCOL_VERSION);
        result.set("serverInfo", serverInfo());

        ObjectNode capabilities = objectMapper.createObjectNode();
        capabilities.set("tools", objectMapper.createObjectNode());
        result.set("capabilities", capabilities);
        return result;
    }

    private JsonNode handleToolsList() {
        ObjectNode result = objectMapper.createObjectNode();
        ArrayNode tools = objectMapper.createArrayNode();

        for (McpToolRegistry.ToolDefinition definition : toolRegistry.listTools()) {
            ObjectNode tool = objectMapper.createObjectNode();
            tool.put("name", definition.name());
            tool.put("description", definition.description());
            tool.set("inputSchema", objectMapper.valueToTree(definition.inputSchema()));
            tools.add(tool);
        }

        result.set("tools", tools);
        return result;
    }

    private JsonNode handleToolsCall(JsonNode params) {
        String toolName = params.path("name").asText(null);
        JsonNode arguments = params.path("arguments");

        try {
            JsonNode payload = toolRegistry.callTool(toolName, arguments);
            ObjectNode result = objectMapper.createObjectNode();
            ArrayNode content = objectMapper.createArrayNode();

            ObjectNode text = objectMapper.createObjectNode();
            text.put("type", "text");
            text.put("text", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload));
            content.add(text);

            result.set("content", content);
            return result;
        } catch (Exception ex) {
            return errorResult(-32000, ex.getMessage());
        }
    }

    private ObjectNode serverInfo() {
        ObjectNode serverInfo = objectMapper.createObjectNode();
        serverInfo.put("name", "fintech-banking-mcp");
        serverInfo.put("version", "1.0.0");
        return serverInfo;
    }

    private ObjectNode errorResult(int code, String message) {
        ObjectNode error = objectMapper.createObjectNode();
        error.put("code", code);
        error.put("message", message == null ? "Unknown error" : message);
        return error;
    }

    private JsonNode readMessage(BufferedInputStream input) throws IOException {
        Map<String, String> headers = new LinkedHashMap<>();
        String line;

        while ((line = readLine(input)) != null) {
            if (line.isBlank()) {
                break;
            }

            int separatorIndex = line.indexOf(':');
            if (separatorIndex > 0) {
                String name = line.substring(0, separatorIndex).trim().toLowerCase();
                String value = line.substring(separatorIndex + 1).trim();
                headers.put(name, value);
            }
        }

        if (headers.isEmpty()) {
            return null;
        }

        int contentLength = Integer.parseInt(headers.getOrDefault("content-length", "0"));
        if (contentLength <= 0) {
            return null;
        }

        byte[] body = input.readNBytes(contentLength);
        if (body.length == 0) {
            return null;
        }

        return objectMapper.readTree(body);
    }

    private void writeMessage(BufferedOutputStream output, JsonNode message) throws IOException {
        byte[] body = objectMapper.writeValueAsBytes(message);
        String header = "Content-Length: " + body.length + "\r\n\r\n";
        output.write(header.getBytes(StandardCharsets.UTF_8));
        output.write(body);
        output.flush();
    }

    private String readLine(BufferedInputStream input) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int current;
        boolean sawCarriageReturn = false;

        while ((current = input.read()) != -1) {
            if (current == '\r') {
                sawCarriageReturn = true;
                continue;
            }
            if (current == '\n') {
                break;
            }
            if (sawCarriageReturn) {
                buffer.write('\r');
                sawCarriageReturn = false;
            }
            buffer.write(current);
        }

        if (current == -1 && buffer.size() == 0 && !sawCarriageReturn) {
            return null;
        }

        if (sawCarriageReturn) {
            buffer.write('\r');
        }

        return buffer.toString(StandardCharsets.UTF_8);
    }
}
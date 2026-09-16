# MCP Agent Contract

This document defines the MCP tools that should wrap the banking agent flow in this project.

The goal is not to replace the Spring Boot backend. The backend remains the source of truth. MCP is the tool layer the model uses to interact with the backend in a structured way.

## Core idea

- The model receives a user message.
- The model chooses a tool call.
- The MCP server calls the backend REST/service layer.
- The backend persists the trace and returns the result.
- The UI can display the decision trail, process id, and agent context.

## Recommended tools

### 1. `agent.create`
Create or return the banking agent linked to a session.

Input:
```json
{
  "sessionId": "uuid",
  "userId": "uuid"
}
```

Backend mapping:
- `BankingAgentService.createAgent(sessionId, userId)`

Output:
```json
{
  "agentId": "uuid",
  "sessionId": "uuid",
  "userId": "uuid",
  "defaultPolicy": "AUTO_EXECUTE"
}
```

### 2. `agent.getBySession`
Fetch the agent attached to a session.

Input:
```json
{
  "sessionId": "uuid"
}
```

Backend mapping:
- `BankingAgentService.getAgentBySessionId(sessionId)`

### 3. `agent.getById`
Fetch one agent by id.

Input:
```json
{
  "agentId": "uuid"
}
```

Backend mapping:
- `BankingAgentService.getAgentById(agentId)`

### 4. `agent.updateContext`
Persist structured agent context.

Input:
```json
{
  "agentId": "uuid",
  "context": {
    "key": "value"
  }
}
```

Backend mapping:
- `BankingAgentService.updateContext(agentId, context)`

Use cases:
- save model reasoning state
- save extracted intent parameters
- save conversation memory
- save transfer trace

### 5. `agent.updateDecision`
Store the last decision taken by the agent.

Input:
```json
{
  "agentId": "uuid",
  "decision": "AUTO_EXECUTE | REQUEST_INFO | TRIGGER_BPMN | BLOCK"
}
```

Backend mapping:
- `BankingAgentService.updateDecision(agentId, decision)`

### 6. `agent.recordLastTransaction`
Link the last processed transaction to the agent.

Input:
```json
{
  "agentId": "uuid",
  "transactionId": "uuid"
}
```

Backend mapping:
- `BankingAgentService.recordLastTransaction(agentId, transactionId)`

### 7. `agent.determineDecision`
Let the backend apply the Sensitive Line rules.

Input:
```json
{
  "agentId": "uuid",
  "intent": "TRANSFER | FRAUD | STOLEN_CARD | CLAIM | UPDATE_SENSITIVE_DATA | OTHER",
  "confidence": 0.92,
  "parameters": {
    "amount": 6000,
    "currency": "EUR"
  }
}
```

Backend mapping:
- `BankingAgentService.determineDecision(agent, intentResult)`
- `TransactionValidationService.validateTransactionAndDecide(...)`

Expected output:
```json
{
  "decision": "TRIGGER_BPMN",
  "reason": "TRANSFER_AMOUNT_ABOVE_5000",
  "trace": {
    "threshold": 5000,
    "evaluatedAt": "2026-06-06T14:00:00"
  }
}
```

### 8. `flowable.listAdminTasks`
List tasks assigned to the admin group.

Input:
```json
{}
```

Backend mapping:
- `FlowableService.listAdminTasks()`

### 9. `flowable.getTask`
Fetch one admin task with its process variables.

Input:
```json
{
  "taskId": "string"
}
```

Backend mapping:
- `FlowableService.getTaskById(taskId)`
- `FlowableService.getProcessVariables(processInstanceId)`

### 10. `flowable.completeTask`
Complete an admin task and propagate the business action.

Input:
```json
{
  "taskId": "string",
  "approved": true,
  "comment": "Checked and approved"
}
```

Backend mapping:
- `FlowableService.completeTask(taskId, vars)`
- `FlowableAdminController` completion logic

## Suggested trace fields

When a tool call is executed, persist these fields in the agent context:

```json
{
  "sessionId": "uuid",
  "agentId": "uuid",
  "userMessage": "Je veux transférer 6000 euros",
  "intent": "TRANSFER",
  "confidence": 0.95,
  "decision": "TRIGGER_BPMN",
  "reason": "TRANSFER_AMOUNT_ABOVE_5000",
  "flowableProcessId": "process-instance-id",
  "transactionId": "uuid",
  "timestamp": "2026-06-06T14:00:00"
}
```

## Suggested tool sequence

### Automatic path
1. User sends a message.
2. Model extracts intent.
3. MCP tool `agent.updateContext` stores the extracted data.
4. MCP tool `agent.determineDecision` returns `AUTO_EXECUTE`.
5. Backend executes the action.
6. MCP tool `agent.recordLastTransaction` stores the transaction id.
7. MCP tool `agent.updateDecision` stores the final decision.

### Sensitive path
1. User sends a message.
2. Model extracts intent.
3. MCP tool `agent.updateContext` stores the extracted data.
4. MCP tool `agent.determineDecision` returns `TRIGGER_BPMN`.
5. Backend creates a support ticket and starts Flowable.
6. MCP tool `agent.updateDecision` stores the decision.
7. MCP tool `agent.recordLastTransaction` stores the transaction id.
8. Admin later uses `flowable.listAdminTasks` and `flowable.completeTask`.

## Minimal MCP server responsibility

The MCP server should only:
- validate tool inputs
- call the Spring Boot backend
- normalize backend responses
- expose a trace-friendly payload to the model

It should not contain banking rules itself. The rules must stay in the backend.

## What is still missing in the codebase

- Persistent audit storage for every tool call, if you want a full trace ledger
- Frontend display of the full agent trace timeline

## Implemented bridges

The backend now exposes an HTTP tool bridge under `/api/v1/mcp` and a stdio MCP transport via `McpStdioApplication` for:

- `agent.create`
- `agent.getBySession`
- `agent.getById`
- `agent.updateContext`
- `agent.updateDecision`
- `agent.recordLastTransaction`
- `agent.determineDecision`
- `flowable.listAdminTasks`
- `flowable.getTask`
- `flowable.completeTask`

## Launch commands

Backend from `back/banking-api`:

```powershell
.\mvnw spring-boot:run
```

Windows-safe local launch used during validation:

```powershell
cmd /c "cd /d back\banking-api && .\mvnw.cmd -Dspring-boot.run.profiles=local spring-boot:run"
```

Packaged jar:

```powershell
.\mvnw -DskipTests package
java -jar .\target\banking-api-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

MCP stdio transport:

```powershell
java -cp .\target\banking-api-0.0.1-SNAPSHOT.jar com.fintech.banking.mcp.McpStdioApplication
```

Local runtime note:

- The app starts with H2 when Postgres is not available.
- `/actuator/health` can still report `DOWN` if Redis is not running.
- Kafka warnings are expected if no broker is listening on `localhost:9092`.
- If port 8080 is already in use, stop the other backend instance before starting a new one.

This bridge reuses the existing Spring services and keeps the banking rules in the backend.

## Conclusion

The project can use MCP as a tool layer above the current backend. The current implementation is an HTTP bridge that matches the MCP contract and invokes the existing Spring services.

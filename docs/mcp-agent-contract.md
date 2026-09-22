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

## Trace and audit coverage

- Every annotated MCP tool call is persisted through `AuditLogService` with the
  authenticated user, tool name, status, duration, and the fixed `mcp` source.
  Tool arguments are intentionally excluded to avoid storing account numbers,
  tokens, or other sensitive values.
- The frontend displays the agent activity timeline and BPMN-related stages in
  the chat view.

## Implemented bridges

The backend now exposes a Spring AI MCP Streamable HTTP server at `/api/v1/mcp`.
The annotated `BankingMcpTools` facade delegates to the existing secured services for:

- `get_my_account`
- `get_my_transaction_history`
- `search_banking_knowledge`
- `prepare_transfer`
- `create_agent`
- `get_agent_by_session`
- `get_agent`
- `update_agent_context`
- `update_agent_decision`
- `record_agent_transaction`
- `determine_agent_decision`
- `list_admin_tasks` (admin only)
- `get_admin_task` (admin only)
- `complete_admin_task` (admin only)

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

MCP Streamable HTTP endpoint:

```powershell
http://localhost:8080/api/v1/mcp
```

Local runtime note:

- The app starts with H2 when Postgres is not available.
- `/actuator/health` can still report `DOWN` if Redis is not running.
- Kafka warnings are expected if no broker is listening on `localhost:9092`.
- If port 8080 is already in use, stop the other backend instance before starting a new one.

MCP clients must authenticate with a user JWT. The server enforces account ownership and
administrator access before invoking tools. `prepare_transfer` only creates a confirmation
plan; execution remains in the secured transaction and Flowable validation services.

## Conclusion

The project uses MCP as a tool layer above the current backend. Spring AI handles MCP
discovery and JSON-RPC transport, while the existing Spring services remain the single
business authority. `determine_agent_decision` also returns a trace containing the
decision reason, sensitive threshold, and evaluation timestamp.

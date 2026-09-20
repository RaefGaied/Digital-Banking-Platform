# ai-agent (Python) — Optional Fallback Service

## Role in the architecture

This service is **not** the primary chatbot engine. All banking decisions
(authentication, account access, transaction execution, balance validation,
sensitive thresholds, BPMN routing, and audit) are owned by the Spring Boot
backend (`back/banking-api`).

`ai-agent` is used only as a fallback when the Java backend's intent
detection (`OllamaIntentDetectionService` -> `OpenAIIntentDetectionService` ->
`RuleBasedIntentDetectionService`) cannot confidently resolve a user message.
In that case, Java calls `POST /chat` on this service to obtain a
natural-language reply. Java remains authoritative: this service never
writes to the database directly, never approves or executes a transfer, and
never bypasses the Sensitive Line or Flowable validation performed by Java --
it only calls the same authenticated Java REST APIs (`/accounts`,
`/transactions`, ...) that a human user would use.

```
Spring Boot ChatService
   |  (only when Java/RAG cannot resolve the intent)
   v
ai-agent /chat  --------------->  Java REST APIs (authenticated)
   |
   v
Natural-language reply returned to ChatService
```

## Responsibilities

- Natural-language understanding for ambiguous or multi-turn requests.
- Conversation state (for example, a transfer amount given in one message and
  the destination account in the next).
- Optional LLM calls (Ollama first, then Groq/OpenAI if configured) purely to
  phrase a helpful response or extract structured parameters.
- Calling Java banking APIs with the same bearer token the user authenticated
  with.

## Non-responsibilities

- No direct PostgreSQL access.
- No transaction execution or approval.
- No bypass of Java validation, the Sensitive Line, or Flowable BPMN.

## Running locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Configuration

See `.env.example` for available environment variables, including
`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `GROQ_API_KEY`, `OPENAI_API_KEY`,
`BASE_URL` (Java backend), and `MEMORY_FILE` (persistent conversation
history).

In Docker Compose, this service is started automatically but is only
exercised by the backend when `ai.agent.enabled=true` and Java could not
resolve the intent on its own.

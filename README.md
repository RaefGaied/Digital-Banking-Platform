# FinBank — Digital Banking Platform

FinBank is a full-stack digital banking application developed as a software
engineering project. It combines a React web client, a Spring Boot REST API,
and a Python AI agent with banking workflows and supporting infrastructure.

> **Project status:** This is a demonstration and academic project, not a
> production banking service. Do not use real customer data, credentials, or
> financial information.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Run the full stack with Docker](#run-the-full-stack-with-docker)
- [Local development](#local-development)
- [Configuration](#configuration)
- [API and service URLs](#api-and-service-urls)
- [Tests and CI](#tests-and-ci)
- [Project structure](#project-structure)
- [Security notes](#security-notes)

## Features

- User registration, authentication, profile management, and two-factor
  authentication.
- Account overview, deposits, withdrawals, transfers, transaction history, and
  receipts.
- Payment-key management and transfers.
- Card and investment management.
- Support tickets, attachments, notifications, and administrative workflows.
- BPMN processes and task management with Flowable.
- AI-assisted chat and document processing, with retrieval-augmented generation
  (RAG) document management and tests available to administrators.
- Audit logs and security-event management.

Feature availability depends on the user's role and application configuration.

## Architecture

```text
Browser
  └── React frontend (served by Nginx)
        └── Spring Boot REST API
              ├── PostgreSQL — application data
              ├── Redis — cache and supporting state
              ├── Kafka + Zookeeper — messaging
              ├── Flowable — BPMN processes and tasks
              ├── Ollama — local language and embedding models
              ├── Python AI agent
              └── Mailpit — local email capture
```

Docker Compose starts the application and its supporting services, including
pgAdmin for local database administration.

## Technology stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Material UI |
| Backend | Java 21, Spring Boot 3.5, Maven |
| Database | PostgreSQL |
| Cache | Redis |
| Messaging | Apache Kafka and Zookeeper |
| Workflow engine | Flowable |
| AI | Python agent, Spring AI, Ollama |
| Local email | Mailpit |
| Containers | Docker and Docker Compose |

## Requirements

- Docker Desktop with Docker Compose v2 (recommended for the complete stack).
- Git.

For running individual components outside Docker, install Java 21, Node.js 22
and npm. Running the AI agent locally also requires Python and the dependencies
listed in `ai-agent/requirements.txt`.

## Run the full stack with Docker

From the repository root:

```bash
docker compose up --build -d
```

The first start may take several minutes: Docker builds the application images
and the Ollama model service downloads the configured chat and embedding models.
Follow startup with:

```bash
docker compose ps
docker compose logs -f backend
```

To stop the services while preserving database and model data:

```bash
docker compose down
```

To also delete the persisted Docker volumes, use `docker compose down -v`.
**This permanently removes local database, model, and agent-memory data.**

### Local service URLs

| Service | URL / port |
|---|---|
| Web application | <http://localhost:5173> |
| Backend API base | <http://localhost:8080/api/v1> |
| Swagger UI | <http://localhost:8080/api/v1/swagger-ui.html> |
| Backend health | <http://localhost:8080/api/v1/actuator/health> |
| AI agent health | <http://localhost:8001/health> |
| pgAdmin | <http://localhost:5050> |
| Mailpit web UI | <http://localhost:8025> |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| Kafka | `localhost:9092` |
| Ollama | <http://localhost:11434> |

The Compose defaults for local pgAdmin access are `admin@banking.com` and
`admin123`. These are development-only credentials; configure a new password
before exposing pgAdmin outside your machine.

## Local development

Docker Compose is still used for PostgreSQL, Redis, Kafka, Zookeeper, and (when
needed) Ollama. Start the dependencies from the repository root:

```bash
docker compose up -d postgres redis zookeeper kafka
```

### Backend

From `back/banking-api`:

```powershell
.\mvnw.cmd spring-boot:run
```

On Linux or macOS:

```bash
./mvnw spring-boot:run
```

The backend reads its defaults from
[`application.yml`](back/banking-api/src/main/resources/application.yml). For
this local setup, its database, Redis, and Kafka defaults point to
`localhost`. AI through Ollama is disabled by default in that file; enable it
and start the Ollama service/models if you want to develop that integration.

### Frontend

In another terminal, from `front`:

```bash
npm ci
npm run dev
```

Vite serves the frontend at <http://localhost:5173>. The client API URL can be
configured with `VITE_API_URL`; use `http://localhost:8080/api/v1` when
connecting to the locally running backend.

### AI agent

The Compose setup builds and runs the Python agent with the backend. For local
Python development, create a virtual environment and install
`ai-agent/requirements.txt`, then configure the agent's environment (including
its backend base URL and `JWT_SECRET`) as needed. The agent listens on port
`8001`; its health endpoint is `/health`.

## Configuration

Docker Compose reads optional overrides from a `.env` file in the repository
root. The checked-in Compose file supplies development defaults, so a `.env`
file is not required for a local run.

| Variable | Compose default | Purpose |
|---|---|---|
| `POSTGRES_PASSWORD` | `banking_pass` | PostgreSQL password |
| `JWT_SECRET` | `dev-only-change-this-secret-in-production` | Shared JWT signing secret |
| `OLLAMA_ENABLED` | `true` | Enable Ollama integration in the Compose backend |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Ollama chat model |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Ollama embedding model |
| `OPENAI_API_KEY` | empty | Optional OpenAI provider key |
| `GROQ_API_KEY` | empty | Optional Groq provider key |
| `EMAIL_ENABLED` | `true` | Enable email delivery to Mailpit |
| `MAIL_FROM` | `no-reply@finbank.local` | Sender address for local email |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL used by the backend |
| `MEMORY_MAX_HISTORY` | `0` | AI agent conversation-history setting |
| `PGADMIN_DEFAULT_PASSWORD` | `admin123` | Local pgAdmin password |

Set secrets through environment variables or an ignored local `.env` file. Do
not commit API keys, production credentials, or real secrets.

## API and service URLs

All backend routes use the `/api/v1` context path. For example:

```http
POST http://localhost:8080/api/v1/auth/register
Content-Type: application/json

{
  "name": "Example User",
  "email": "user@example.com",
  "password": "replace-with-a-local-test-password"
}
```

Use the Swagger UI for the current request schemas and complete endpoint list:
<http://localhost:8080/api/v1/swagger-ui.html>.

The backend exposes its health check at
`GET /api/v1/actuator/health`. Administrative and Flowable endpoints require
appropriate authentication and permissions.

## Tests and CI

The GitHub Actions workflow in `.github/workflows/ci.yml` builds and tests the
backend, lints and builds the frontend, runs Playwright end-to-end tests, and
publishes container images on eligible pushes or manual runs. Runtime deployment
is skipped unless its required deployment secrets are configured.

Run checks locally:

```powershell
# Backend (from back/banking-api)
.\mvnw.cmd test

# Frontend (from front)
npm ci
npm run lint
npm run build
npm run test:e2e
```

The backend tests may require the configured database, Redis, and Kafka
services. Playwright may require browser installation on a new machine:

```powershell
npx playwright install chromium
```

## Project structure

```text
.
├── ai-agent/                 # Python AI agent
├── back/banking-api/         # Spring Boot API and BPMN processes
├── docker/                   # PostgreSQL and pgAdmin container configuration
├── front/                    # React and TypeScript web client
├── images/                   # Project screenshots and diagrams
├── .github/workflows/        # CI and quality workflows
└── docker-compose.yml        # Local multi-service environment
```

## Security notes

- This repository is intended for local development and demonstration only.
- Compose fallback passwords and JWT secrets are insecure development defaults;
  replace them before any shared or exposed deployment.
- Do not use real financial data or expose development services (including
  pgAdmin, PostgreSQL, Redis, Kafka, Mailpit, or Ollama) to untrusted networks.
- Review and configure authentication, authorization, secret storage, network
  access, and operational controls before any production use.

# Plateforme bancaire digitale — Documentation complète

Ce dépôt contient une application full-stack (Java Spring Boot backend + React/TypeScript frontend) destinée à la gestion bancaire (comptes, virements, sessions, notifications). Ce README fournit une analyse complète A→Z utile pour un rapport de stage technique.

## Présentation
- **Nom du projet**: Digital Banking Platform
- **Langages**: Java (Spring Boot) pour le backend, TypeScript + React (Vite) pour le frontend
- **But**: démontrer un service bancaire web avec workflows métier (BPMN), API REST, et interfaces utilisateur modernes.

## Objectifs du stage
- Comprendre l’architecture applicative
- Ajouter / maintenir des fonctionnalités métier (virements, sessions)
- Mettre en place automatisation (build, tests, déploiement)
- Améliorer sécurité et observabilité

## Structure du dépôt
- `back/banking-api/` : service backend Java (Spring Boot)
- `front/` : application frontend React + TypeScript
- `docker/postgres/` : Dockerfile et script d'initialisation de la base
- `docker-compose.yml` : orchestration locale
- `postman_collection.json`, `run-newman.ps1` : tests API automatisés

## Installation (développement)
Prérequis: Java 17+, Node.js 18+, Docker & Docker Compose, Maven (optionnel: utiliser `mvnw`).

Backend:
```bash
cd back/banking-api
./mvnw clean package    # Windows: mvnw.cmd
```

Frontend:
```bash
cd front
npm install
npm run dev    # ou npm run build pour build de production
```

Lancer l’ensemble en local (Docker):
```bash
docker-compose up --build
```

## Exécution des tests
- Tests unitaires backend: `cd back/banking-api && ./mvnw test`
- Tests Postman (collection fournie): `./run-newman.ps1` ou `newman run postman_collection.json -e postman_env.json`

## Architecture & flux
- Frontend: pages, composants, contexte d’authentification (`AuthContext.tsx`), hooks (`useAuth.ts`)
- Backend: contrôleurs REST, services métiers, persistance JPA (voir `pom.xml`)
- DB: PostgreSQL, initialisation via `docker/postgres/init.sql`

Profiles and local DB notes:

- Production / default: PostgreSQL (`spring.datasource.url=jdbc:postgresql://localhost:5432/banking_db`).
- Local development: H2 in-memory is used when running with profile `local` — URL example: `jdbc:h2:mem:banking_db;MODE=PostgreSQL;INIT=RUNSCRIPT FROM 'classpath:h2-init.sql'`. H2 is configured to run in PostgreSQL compatibility mode to ease local runs.
- Tests: Testcontainers Postgres is used in CI/tests (`jdbc:tc:postgresql:16-alpine:///banking_db`).
- BPMN: workflows de validation des virements présents sous la racine (`*.bpmn`)

Voir le diagramme d’architecture: [ARCHITECTURE.md](ARCHITECTURE.md)

## Sécurité
- Auth: vérifier JWT / tokens et expiration
- Ne pas logger d’informations sensibles
- Scanner dépendances: `mvn dependency:check`, `npm audit` ou Snyk

## Observabilité
- Exposer endpoints santé et metrics
- Centraliser logs (ELK, Azure Monitor)
- Ajouter traces distribuées (OpenTelemetry)

## Déploiement recommandé
1. CI: build → tests → image Docker → scan dépendances
2. Registry: push image (Azure ACR / Docker Hub)
3. Orchestration: Kubernetes + secrets manager

## Qualité & recommandations
- Mettre en place CI (GitHub Actions/GitLab CI)
- Ajouter tests d’intégration E2E pour flux critiques (auth, virements)
- Ajouter scanning SAST/DAST et dependency scanning en CI
- Améliorer gestion des secrets (vault / provider cloud)

## Annexes utiles
- Collection Postman: `postman_collection.json`
- Env Postman: `postman_env.json`
- Rapport d'exécution Newman: `newman-report.json`

---
Pour tout détail supplémentaire (diagrammes PNG, génération d’un rapport Word/Markdown structuré, mise en place CI), répondez avec l’option souhaitée.
# 🏦 Vaultly — Digital Banking Platform

<div align="center">

![CI](https://github.com/LeonardoPigatti/fintech/actions/workflows/ci.yml/badge.svg)
![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-green?logo=springboot)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)
![Kafka](https://img.shields.io/badge/Kafka-3.9-black?logo=apachekafka)
![License](https://img.shields.io/badge/license-MIT-green)

**A full-stack fintech platform built with enterprise-grade technologies.**  
Simulating real-world digital banking with event-driven architecture, JWT security, caching, and a modern React UI.

[Features](#-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API Docs](#-api-documentation) • [Security](#-security) • [Testing](#-testing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Entity Diagram](#-entity-diagram)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [User Registration Guide](#-user-registration-guide)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Testing](#-testing)
- [CI/CD](#-cicd)
- [Project Structure](#-project-structure)

---

## 📖 Overview

FinBank is a production-ready digital banking platform that demonstrates modern software engineering practices. Built with **Java 21 + Spring Boot 3.5** on the backend and **React + TypeScript** on the frontend, it implements:

- **Event-driven architecture** with Apache Kafka for transaction streaming
- **Distributed caching** with Redis for balance optimization
- **JWT authentication** with refresh token rotation and revocation
- **Rate limiting** per IP with Bucket4j
- **Asynchronous audit logging** for compliance
- **Database versioning** with Flyway migrations
- **Full containerization** with Docker Compose
- **CI/CD pipeline** with GitHub Actions

---

## ✨ Features

### 🔐 Authentication & Security
- JWT Access Token + Refresh Token with rotation
- Secure logout with database-level token revocation
- Rate Limiting — 20 requests/minute per IP (Bucket4j)
- BCrypt password hashing
- Asynchronous Audit Log for all sensitive operations
- CORS configured for frontend integration
- Change password with current password verification

### 💰 Banking Operations
| Operation | Endpoint | Description |
|-----------|----------|-------------|
| Deposit | `POST /transactions/deposit` | Credit funds to account |
| Withdrawal | `POST /transactions/withdraw` | Debit funds from account |
| Transfer | `POST /transactions/transfer` | Inter-account transfer with validation |
| History | `GET /transactions/history` | Full transaction history |

### ⚡ PIX — Instant Payments (external API name)

Note: the public API and UI keep the historic "PIX" naming to preserve compatibility with demos and external clients. Internally the domain has been renamed to `PaymentKey` (database objects: `payment_keys`, enum `payment_key_type`, Java types `PaymentKey`/`PaymentKeyType`). The endpoints remain under `/pix` and request/response payloads still accept legacy fields such as `pixKey` (the backend maps these via `@JsonAlias`).

- Key registration: EMAIL, TAXID, PHONE, RANDOM
- Instant transfer simulation
- QR Code generation with EMV payload format
- Share PIX key functionality

### 💳 Cards Management
- Full CRUD (Create, Read, Update, Delete)
- Types: CREDIT, DEBIT
- Brands: VISA, MASTERCARD, ELO, AMEX
- Credit limit and available limit tracking
- Soft delete (logical deactivation)

### 📈 Investments
| Product | Annual Rate | Risk |
|---------|------------|------|
| CDB | 12% | Low |
| LCI | 10% | Low |
| LCA | 10.5% | Low |
| Tesouro Direto | 11% | Low |
| Ações | 15% | High |

- Daily compound interest calculation
- Real-time profit/loss tracking
- One-click redemption with automatic balance credit

### 📊 Analytics Dashboard
- Balance evolution chart over time
- Weekly/monthly/all-time spending filters
- Transaction distribution by type (pie chart)
- Volume by type (bar chart)
- Key metrics: largest deposit, largest withdrawal, average transaction

### 🔔 Smart Notifications
- Real-time alerts from transaction and investment data
- Investment profit alerts
- Dismissible notification center with unread badge

### 👤 Profile Management
- View account details with masked taxId
- Toggle notification preferences
- Change password via secure modal
- Quick access to payment methods

---

## 📸 Screenshots

### Dashboard
> Balance overview, weekly spending with filters, recent transactions, cards and PIX section.
<img width="1919" height="872" alt="image" src="https://github.com/user-attachments/assets/7d10ebe1-2c58-499a-8b37-08b88d32a943" />
<img width="1919" height="877" alt="image" src="https://github.com/user-attachments/assets/71a0cd8c-f29d-400b-981e-42fe6786e90a" />


### Cards Page
> Full card management with add, edit and delete functionality.
> <img width="1919" height="868" alt="image" src="https://github.com/user-attachments/assets/595df59d-94d2-4293-98dd-50c062afe756" />
<img width="1919" height="844" alt="image" src="https://github.com/user-attachments/assets/a0c0a5c8-0177-4d35-9123-68954005a66c" />

### Investments Page
> Investment products with real-time compound interest simulation and redemption.
<img width="1919" height="874" alt="image" src="https://github.com/user-attachments/assets/763a1728-27f5-4537-b37d-5389dc40ee05" />
<img width="1919" height="864" alt="image" src="https://github.com/user-attachments/assets/f130f630-5aaf-4d34-bdcb-c34f2b4aa2f5" />

### Analytics Page
> Charts with real transaction data — area chart, pie chart and bar chart.
<img width="1919" height="870" alt="image" src="https://github.com/user-attachments/assets/bd52a7e8-c101-449c-90eb-3993e7708a62" />
<img width="1919" height="864" alt="image" src="https://github.com/user-attachments/assets/1e9f157e-d0bd-4b86-bf53-eae13f537aa3" />

### Profile Page
> User profile with account details and functional settings.
<img width="1919" height="869" alt="image" src="https://github.com/user-attachments/assets/50766917-217b-42a5-afb3-6e4525606c46" />

### Help & Support
> FAQ accordion with topic browser and contact options.
<img width="1918" height="851" alt="image" src="https://github.com/user-attachments/assets/5bf8d70f-aaa2-4a74-b6cc-a086a53e43e1" />

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│                React 18 + TypeScript + Tailwind CSS              │
│          Vite │ React Query │ React Router │ Recharts            │
└──────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS / REST API (JWT Bearer Token)
┌──────────────────────────▼──────────────────────────────────────┐
│                        API GATEWAY LAYER                          │
│              Spring Boot 3.5 (Java 21) — Port 8080               │
│  ┌─────────────┬──────────────┬─────────────┬─────────────────┐ │
│  │ Rate Limit  │  JWT Filter  │    CORS     │ Global Exception │ │
│  │  (Bucket4j) │   (Filter)   │   Config    │    Handler       │ │
│  └─────────────┴──────────────┴─────────────┴─────────────────┘ │
└──────┬──────────┬──────────────┬──────────────┬─────────────────┘
       │          │              │              │
┌──────▼──┐ ┌─────▼──────┐ ┌────▼─────┐ ┌──────▼──────────┐
│  Auth   │ │  Account   │ │  Cards   │ │  Investments    │
│ Service │ │  Service   │ │  Service │ │    Service      │
│         │ │            │ │          │ │                 │
│ register│ │ getBalance │ │   CRUD   │ │ invest / redeem │
│  login  │ │  deposit   │ │          │ │ compound calc   │
│  logout │ │  withdraw  │ └────┬─────┘ └──────┬──────────┘
│ refresh │ │  transfer  │      │               │
└──────┬──┘ └─────┬──────┘      │               │
       │          │              │               │
┌──────▼──────────▼──────────────▼───────────────▼──────────────┐
│                     INFRASTRUCTURE LAYER                         │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ PostgreSQL  │  │    Redis     │  │    Apache Kafka      │   │
│  │    (16)     │  │     (7)      │  │       (3.9)          │   │
│  │             │  │              │  │                      │   │
│  │ Primary DB  │  │ Balance Cache│  │ Topic: transactions  │   │
│  │ JPA/Hibernate│  │ @Cacheable  │  │ Producer + Consumer  │   │
│  │ Flyway V1-V7│  │ @CacheEvict │  │ Async Audit Log      │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Transaction Event Flow

```
HTTP Request
     │
     ▼
TransactionController
     │
     ▼
TransactionService ──────────────────────► KafkaProducer
     │                                          │
     ▼                                          ▼
AccountRepository                      Topic: transactions
(debit/credit balance)                         │
     │                                          ▼
     ▼                                   KafkaConsumer
RedisCache                              (async processing)
(evict balance cache)                          │
     │                                          ▼
     ▼                                    AuditLogService
HTTP Response                          (@Async — non-blocking)
     │                                          │
     ▼                                          ▼
201 Created                              AuditLogRepository
                                        (persist audit entry)
```

### Authentication Flow

```
POST /auth/login
     │
     ▼
AuthService.authenticate()
     │
     ├── UserRepository.findByEmail()
     ├── BCrypt.matches(password, hash)
     ├── JwtService.generateAccessToken()  ──► { exp: 24h }
     ├── JwtService.generateRefreshToken() ──► { exp: 7d }
     └── RefreshTokenRepository.save()
     │
     ▼
{ accessToken, refreshToken }

─────────────────────────────────────

Every authenticated request:

Authorization: Bearer <accessToken>
     │
     ▼
JwtAuthenticationFilter
     │
     ├── JwtService.extractEmail()
     ├── UserDetailsService.loadUserByUsername()
     └── SecurityContextHolder.setAuthentication()
     │
     ▼
Controller (authenticated)
```

---

## 🤖 AI Chatbot Architecture

The banking assistant is orchestrated by **Spring Boot**, not by the Python service. Java
owns every security-sensitive decision; any LLM is only used to interpret free-text
messages.

```
React frontend
     │
     ▼
Spring Boot ChatService  (primary orchestrator)
     │
     ▼
IntentDetectionService (chosen automatically, in this order)
     ├── OllamaIntentDetectionService   → local Ollama model (ai.ollama.enabled=true)
     ├── OpenAIIntentDetectionService   → OpenAI/Azure OpenAI (when an API key is set)
     └── RuleBasedIntentDetectionService → deterministic regex fallback (always available)
     │
     ▼
IntentResult { intent, parameters, confidence, isSensitive }
     │
     ▼
TransactionValidationService ("Sensitive Line")
     ├── AUTO_EXECUTE   → low-risk actions run immediately (balance, history, …)
     ├── REQUEST_INFO   → intent unclear → optional Python fallback for a natural-language reply
     ├── TRIGGER_BPMN   → high-value transfers, card fraud, sensitive data changes
     └── BLOCK          → rejected outright
     │
     ▼
Flowable BPMN (processes/*.bpmn) — human validation for sensitive operations
     │
     ▼
PostgreSQL — accounts, transactions, audit log, workflow tasks
```

### Role of each component

| Component | Responsibility |
|-----------|-----------------|
| `ChatService` | Single entry point for chat messages; always runs first. |
| `OllamaIntentDetectionService` | Calls a local Ollama model through Spring AI's `ChatClient` and returns structured JSON intents. Falls back to the rule-based detector on any failure. |
| `OpenAIIntentDetectionService` | Optional cloud LLM path (OpenAI or Azure OpenAI) used only when Ollama is disabled and an API key is configured. |
| `RuleBasedIntentDetectionService` | Deterministic, dependency-free fallback; guarantees the chatbot keeps working even with no LLM configured. |
| `TransactionValidationService` | The "Sensitive Line": decides whether an intent can run automatically, needs more information, must go through Flowable, or must be blocked (for example, transfers above `app.sensitive-line.threshold`, default `5000`). |
| `RagKnowledgeService` | Retrieval-Augmented Generation over `rag_documents` (pgvector). Embeddings are generated locally through Spring AI's Ollama `EmbeddingModel` (`nomic-embed-text`, 768 dimensions — zero cost, no external API). Only matches above the similarity threshold (`rag.similarity-threshold`, default `0.72`) are used; otherwise falls back to the static file-based knowledge base. |
| Flowable BPMN processes | `transfer-validation.bpmn`, `fraud-validation.bpmn`, `data-update-validation.bpmn` — human-in-the-loop approval for sensitive operations. |
| `ai-agent` (Python/FastAPI) | **Optional fallback only.** Used solely when Java cannot resolve an intent (`REQUEST_INFO`) with enough confidence. It never touches the database directly, never executes transfers, and never bypasses Java validation — it only calls the same authenticated Java REST APIs a human user would. |

Ollama is configured through `OLLAMA_ENABLED`, `OLLAMA_BASE_URL`, and `OLLAMA_MODEL`
(defaults: enabled in Docker Compose, `http://ollama:11434`, `qwen2.5:7b`). Disabling
Ollama automatically re-enables the OpenAI path if an API key is present, and the
rule-based detector is always the last line of defense.

---

## 🗄️ Entity Diagram

```
┌─────────────────┐         ┌─────────────────────┐
│      users      │         │      accounts        │
├─────────────────┤         ├─────────────────────┤
│ id (UUID) PK    │◄────────│ id (UUID) PK         │
│ name            │  1   1  │ user_id (UUID) FK    │
│ email (unique)  │         │ number (unique)      │
│ taxId (unique)  │         │ agency               │
│ password (hash) │         │ balance (NUMERIC)    │
│ created_at      │         │ created_at           │
└────────┬────────┘         └─────────────────────┘
         │
         │ 1
         │
    ┌────┴────────────────────────────────┐
    │                                     │
    │ *                                   │ *
┌───▼──────────────┐         ┌────────────▼────────┐
│   transactions   │         │      payment_keys     │
├──────────────────┤         ├─────────────────────┤
│ id (UUID) PK     │         │ id (UUID) PK         │
│ account_id FK    │         │ user_id (UUID) FK    │
│ type (ENUM)      │         │ key_type (VARCHAR)   │
│ amount (NUMERIC) │         │ key_value (unique)   │
│ description      │         │ active (BOOLEAN)     │
│ status (ENUM)    │         │ created_at           │
│ source_account   │         └─────────────────────┘
│ target_account   │
│ created_at       │         ┌─────────────────────┐
└──────────────────┘         │       cards          │
                             ├─────────────────────┤
┌──────────────────┐         │ id (UUID) PK         │
│   refresh_tokens │         │ user_id (UUID) FK    │
├──────────────────┤         │ card_type (ENUM)     │
│ id (UUID) PK     │         │ brand (ENUM)         │
│ user_id FK       │         │ holder_name          │
│ token (unique)   │         │ last_four            │
│ revoked (BOOL)   │         │ expiry_month         │
│ created_at       │         │ expiry_year          │
│ expires_at       │         │ credit_limit         │
└──────────────────┘         │ available_limit      │
                             │ active (BOOLEAN)     │
┌──────────────────┐         │ created_at           │
│   audit_logs     │         └─────────────────────┘
├──────────────────┤
│ id (UUID) PK     │         ┌─────────────────────┐
│ user_email       │         │    investments       │
│ action           │         ├─────────────────────┤
│ entity_type      │         │ id (UUID) PK         │
│ entity_id        │         │ user_id (UUID) FK    │
│ created_at       │         │ investment_type(ENUM)│
└──────────────────┘         │ amount (NUMERIC)     │
                             │ annual_rate          │
                             │ current_value        │
                             │ status (ENUM)        │
                             │ invested_at          │
                             │ redeemed_at          │
                             └─────────────────────┘
```

### Flyway Migration History

| Version | Description |
|---------|-------------|
| V1 | Create users, accounts, transactions tables |
| V2 | Create audit_logs table |
| V3 | Create refresh_tokens table |
| V4 | Create payment_keys table with enum type |
| V5 | Fix payment_keys — change enum to VARCHAR |
| V6 | Create cards table with card_type and card_brand enums |
| V7 | Create investments table with investment_type and investment_status enums |

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Java | 21 | Language (LTS) |
| Spring Boot | 3.5 | Framework |
| Spring Security | 6.5 | Authentication & Authorization |
| Spring Data JPA | 3.5 | ORM / Database Access |
| Spring Kafka | 3.5 | Event Streaming |
| Spring Cache | 3.5 | Cache Abstraction |
| Spring AI | 1.0 | LLM orchestration (`ChatClient`) |
| Ollama | — | Local LLM provider (default: `qwen2.5:7b`) |
| Flowable BPMN | — | Sensitive-operation approval workflows |
| PostgreSQL | 16 | Primary Relational Database |
| Redis | 7 | Distributed Cache |
| Apache Kafka | 3.9 | Message Broker |
| Flyway | 10 | Database Migration |
| Bucket4j | 8.10 | Rate Limiting |
| JJWT | 0.12 | JWT Token Management |
| BCrypt | — | Password Hashing |
| Lombok | 1.18 | Boilerplate Reduction |
| Springdoc OpenAPI | 2.8 | Swagger UI / API Docs |
| Testcontainers | 1.20 | Integration Testing |
| JUnit 5 | — | Unit Testing |
| Mockito | — | Mocking |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI Library |
| TypeScript | 5 | Type Safety |
| Vite | 6 | Build Tool & Dev Server |
| Tailwind CSS | 3 | Utility-first Styling |
| React Query | 5 | Server State Management |
| React Router | 6 | Client-side Routing |
| Axios | 1 | HTTP Client with Interceptors |
| Recharts | 2 | Data Visualization |
| qrcode.react | 3 | PIX QR Code Generation |
| Lucide React | 0.4 | Icon Library |

### DevOps & Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container Orchestration |
| Nginx | Frontend Server + Reverse Proxy |
| GitHub Actions | CI/CD Pipeline |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Docker Desktop | Latest | [docker.com](https://docker.com) |
| Git | Any | [git-scm.com](https://git-scm.com) |

> **Note:** For local development without Docker, you'll also need JDK 21 and Node.js 20+.

### 🐳 Run with Docker (Recommended)

```bash
# From the repository root
docker compose up --build
```

This is the single supported command for the full stack. It starts PostgreSQL, Redis, Kafka, Zookeeper, the Spring Boot backend, and the React frontend together.

**Services started by Docker Compose:**
| Service | Port | Description |
|---------|------|-------------|
| Frontend (Nginx) | 5173 | React application |
| Backend (Spring Boot) | 8080 | REST API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| Kafka | 9092 | Message Broker |
| Zookeeper | 2181 | Kafka Coordinator |

### 💻 Run Locally (Development)

#### Step 1 — Start Infrastructure

```bash
# Start only database and messaging services
docker compose up -d postgres redis zookeeper kafka
```

#### Step 2 — Run Backend

```bash
cd back/banking-api

# Linux/Mac
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

Backend will be available at `http://localhost:8080/api/v1`

#### Step 3 — Run Frontend

```bash
cd front
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## ⚙️ Environment Configuration

### Backend — `application.yml`

```yaml
server:
  port: 8080
  servlet:
    context-path: /api/v1

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/banking_db
    username: banking_user
    password: banking_pass

  data:
    redis:
      host: localhost
      port: 6379

  kafka:
    bootstrap-servers: localhost:9092

  jpa:
    hibernate:
      ddl-auto: validate          # Flyway manages schema
    show-sql: false

  flyway:
    enabled: true
    locations: classpath:db/migration

application:
  jwt:
    secret: your-256-bit-secret-key
    expiration: 86400000          # 24 hours in ms
    refresh-expiration: 604800000 # 7 days in ms
```

### Docker Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/banking_db` | Database URL |
| `SPRING_DATASOURCE_USERNAME` | `banking_user` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | `banking_pass` | DB password |
| `SPRING_DATA_REDIS_HOST` | `redis` | Redis hostname |
| `ACCOUNTS_CACHE_TTL` | `5m` | Redis TTL for cached account summaries |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | Kafka broker |

Completed transaction receipt emails are deduplicated per transaction and recipient
using Redis for seven days. If Redis is temporarily unavailable, the consumer logs
the condition and still attempts delivery so a cache outage does not block notifications.

### Frontend — `.env`

```env
VITE_API_URL=http://localhost:8080/api/v1
```

### Nginx Reverse Proxy — `nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api {
        proxy_pass http://banking-backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## � User Registration Guide

When creating a new account, fill in the following fields:

### Registration Fields

#### 1️⃣ **Full Name**
- **What to enter:** Your complete legal name
- **Format:** Letters, spaces (no numbers or special characters)
- **Example:** `João Silva`, `Maria da Silva Santos`
- **Min length:** At least 1 character
- **Max length:** No limit
- **Required:** ✅ Yes

#### 2️⃣ **Email Address**
- **What to enter:** Your active email address
- **Format:** Valid email format (username@domain.com)
- **Examples:** 
  - ✅ `joao.silva@email.com`
  - ✅ `maria@gmail.com`
  - ❌ `invalid.email` (missing @domain)
  - ❌ `user@` (missing domain)
- **Validation:** Must be unique (only one account per email)
- **Used for:** Login and account recovery
- **Required:** ✅ Yes

#### 3️⃣ **Tax ID** (Cadastro de Pessoa Física / Tax Identifier)
- **What to enter:** Your taxpayer identification number (e.g., Brazilian tax ID — 11 digits)
- **Format:** Digits only; formatting (dots/hyphen) will be stripped automatically
- **Examples:**
  - ✅ `12345678901`
  - ❌ `123.456.789-01` (will be auto-stripped)
  - ❌ `1234567890` (invalid length)
- **Validation:** Must be unique (only one account per tax identifier)
- **Length:** Varies by country; for Brazil typically 11 digits
- **Required:** ✅ Yes
- **Note:** Used as a unique identifier alongside email; referred to as `taxId` in API examples

#### 4️⃣ **Password**
- **What to enter:** A secure password to protect your account
- **Minimum length:** 6 characters
- **Recommended:** At least 10 characters with mix of:
  - 📌 Uppercase letters (A-Z)
  - 📌 Lowercase letters (a-z)
  - 📌 Numbers (0-9)
  - 📌 Special characters (!@#$%^&*)
- **Examples:**
  - ✅ `SecurePass123!` (strong)
  - ✅ `MyBank@2024` (strong)
  - ⚠️ `Pass123` (acceptable, but weak)
  - ❌ `123456` (too simple)
  - ❌ `pass` (too short)
- **Visibility:** Toggle eye icon to show/hide password
- **Required:** ✅ Yes
- **Security:** Stored as BCrypt hash, never stored in plain text

### Step-by-Step Registration Example

```
Full Name:      Paulo Oliveira Costa
Email:          paulo.costa@gmail.com
TaxId:          11122233344
Password:       FinBank@2024
```

### Validation Rules & Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Email already exists` | Another account uses this email | Use a different email address |
| `TaxId already exists` | Another account uses this taxId | Use a different taxId or login if it's yours |
| `Invalid email format` | Email doesn't match pattern | Check format: user@domain.com |
| `Password too short` | Less than 6 characters | Enter at least 6 characters |
| `Email required` | Email field is empty | Fill in your email address |

---

## �📡 API Documentation

Full interactive documentation: `http://localhost:8080/api/v1/swagger-ui.html`

### Authentication

```http
### Register
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Leonardo Silva",
  "email": "leonardo@email.com",
  "taxId": "12345678901",
  "password": "123456"
}
```
### Login
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "leonardo@email.com",
  "password": "123456"
}

# Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}

### Refresh Token
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}

### Logout
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Account & Transactions

```http
### Get Account
GET /api/v1/accounts/me
Authorization: Bearer <accessToken>

### Deposit
POST /api/v1/transactions/deposit
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 1000.00,
  "description": "Salary"
}

### Transfer
POST /api/v1/transactions/transfer
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 250.00,
  "targetAccountNumber": "59627626",
  "description": "Rent payment"
}
```

### PIX

```http
### Register PIX Key
POST /api/v1/pix/keys
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "keyType": "EMAIL",
  "keyValue": "leonardo@email.com"
}

### PIX Transfer
POST /api/v1/pix/transfer
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "pixKey": "leonardo@email.com",
  "amount": 100.00,
  "description": "Lunch split"
}
```

### Cards

```http
### Add Card
POST /api/v1/cards
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "cardType": "CREDIT",
  "brand": "VISA",
  "holderName": "LEONARDO SILVA",
  "lastFour": "1234",
  "expiryMonth": 12,
  "expiryYear": 2028,
  "creditLimit": 5000.00
}

### Update Card
PUT /api/v1/cards/{cardId}
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "cardType": "CREDIT",
  "brand": "VISA",
  "holderName": "LEONARDO SILVA",
  "lastFour": "1234",
  "expiryMonth": 12,
  "expiryYear": 2029,
  "creditLimit": 8000.00
}
```

### Investments

```http
### Invest
POST /api/v1/investments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "investmentType": "CDB",
  "amount": 1000.00
}

### Redeem
POST /api/v1/investments/{investmentId}/redeem
Authorization: Bearer <accessToken>
```

---

## 🔒 Security

### JWT Token Strategy

```
Access Token:
  - Algorithm: HMAC SHA-256
  - Expiration: 24 hours
  - Contains: email (subject), issued-at, expiration
  - Storage: Memory (React state / localStorage)

Refresh Token:
  - Format: UUID v4
  - Expiration: 7 days
  - Storage: Database (refresh_tokens table)
  - Revocable: Yes (revoked flag)
  - One-time use rotation on refresh
```

### Rate Limiting Strategy

```
Limit:     20 requests per minute
Scope:     Per IP address
Algorithm: Token Bucket (Bucket4j)
Response:  429 Too Many Requests
Reset:     Rolling window (60 seconds)
```

### Password Security

```
Algorithm:    BCrypt
Strength:     10 rounds
Verification: matches(raw, encoded) on login
Change:       requires current password verification
```

### Audit Log

Every sensitive operation is logged asynchronously:
```
┌─────────────────────────────────────────────┐
│ user_email | action         | entity | time  │
├─────────────────────────────────────────────┤
│ user@x.com | DEPOSIT        | Acct   | 10:00 │
│ user@x.com | TRANSFER       | Txn    | 10:05 │
│ user@x.com | PIX_KEY_REG    | PIX    | 10:10 │
│ user@x.com | LOGIN          | User   | 10:15 │
│ user@x.com | PASSWORD_CHANGE| User   | 10:20 │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Run Tests

```bash
cd back/banking-api

# Run all tests
./mvnw test

# Run specific test class
./mvnw test -Dtest=AuthControllerTest

# Run with verbose output
./mvnw test -Dsurefire.useFile=false
```

### Test Infrastructure

Tests use **Testcontainers** to spin up real PostgreSQL and Redis instances:

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class IntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine");
}
```

### Test Coverage

| Test Class | Coverage |
|-----------|----------|
| `AuthControllerTest` | Register, login, invalid credentials |
| `TransactionControllerTest` | Deposit, withdrawal, history, Kafka events |
| `BankingApiApplicationTests` | Context load verification |

---

## ⚙️ CI/CD

### GitHub Actions Pipeline

Pipeline runs on every push to `main` and on pull requests:

```yaml
Triggers: push/PR to main
Runner:   ubuntu-latest

Services:
  - PostgreSQL 16 (health-checked)
  - Redis 7 (health-checked)
  - Zookeeper 7.6
  - Kafka 7.6

Steps:
  1. Checkout code
  2. Setup JDK 21 (Temurin, Maven cache)
  3. chmod +x mvnw
  4. ./mvnw compile
  5. ./mvnw test (with all env vars)
  6. Upload surefire reports as artifact
```

### Pipeline Status

![CI](https://github.com/LeonardoPigatti/fintech/actions/workflows/ci.yml/badge.svg)

View runs: [GitHub Actions](https://github.com/LeonardoPigatti/fintech/actions)

---

## 📁 Project Structure

```
fintech/
│
├── .github/
│   └── workflows/
│       └── ci.yml                        # GitHub Actions CI pipeline
│
├── back/
│   └── banking-api/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/com/fintech/banking/
│       │   │   │   ├── BankingApiApplication.java
│       │   │   │   ├── config/
│       │   │   │   │   ├── SecurityConfig.java       # JWT, CORS, filter chain
│       │   │   │   │   ├── RedisConfig.java          # Cache configuration
│       │   │   │   │   └── KafkaConfig.java          # Producer/Consumer config
│       │   │   │   ├── controller/
│       │   │   │   │   ├── AuthController.java       # /auth/*
│       │   │   │   │   ├── AccountController.java    # /accounts/*
│       │   │   │   │   ├── TransactionController.java# /transactions/*
│       │   │   │   │   ├── PaymentKeyController.java # /pix/*
│       │   │   │   │   ├── CardController.java       # /cards/*
│       │   │   │   │   ├── InvestmentController.java # /investments/*
│       │   │   │   │   └── UserController.java       # /users/*
│       │   │   │   ├── domain/
│       │   │   │   │   ├── entity/
│       │   │   │   │   │   ├── User.java
│       │   │   │   │   │   ├── Account.java
│       │   │   │   │   │   ├── Transaction.java
│       │   │   │   │   │   ├── PaymentKey.java
│       │   │   │   │   │   ├── Card.java
│       │   │   │   │   │   ├── Investment.java
│       │   │   │   │   │   ├── RefreshToken.java
│       │   │   │   │   │   └── AuditLog.java
│       │   │   │   │   └── enums/
│       │   │   │   │       ├── TransactionType.java
│       │   │   │   │       ├── TransactionStatus.java
│       │   │   │   │       ├── PaymentKeyType.java
│       │   │   │   │       ├── CardType.java
│       │   │   │   │       ├── CardBrand.java
│       │   │   │   │       ├── InvestmentType.java
│       │   │   │   │       └── InvestmentStatus.java
│       │   │   │   ├── dto/
│       │   │   │   │   ├── request/               # Request DTOs
│       │   │   │   │   └── response/              # Response DTOs
│       │   │   │   ├── repository/                # Spring Data JPA Repos
│       │   │   │   ├── security/
│       │   │   │   │   ├── filter/
│       │   │   │   │   │   └── JwtAuthenticationFilter.java
│       │   │   │   │   ├── ratelimit/
│       │   │   │   │   │   └── RateLimitFilter.java
│       │   │   │   │   └── JwtService.java
│       │   │   │   └── service/
│       │   │   │       ├── AuthService.java
│       │   │   │       ├── AccountService.java
│       │   │   │       ├── TransactionService.java
│       │   │   │       ├── PixService.java
│       │   │   │       ├── CardService.java
│       │   │   │       ├── InvestmentService.java
│       │   │   │       ├── AuditLogService.java
│       │   │   │       └── impl/                  # Service implementations
│       │   │   └── resources/
│       │   │       ├── application.yml
│       │   │       └── db/migration/
│       │   │           ├── V1__create_initial_tables.sql
│       │   │           ├── V2__create_audit_log.sql
│       │   │           ├── V3__create_refresh_tokens.sql
│       │   │           ├── V4__create_pix_keys.sql
│       │   │           ├── V5__fix_pix_keys_type.sql
│       │   │           ├── V6__create_cards.sql
│       │   │           └── V7__create_investments.sql
│       │   └── test/                              # Unit + Integration tests
│       ├── Dockerfile                             # Multi-stage JDK→JRE
│       └── pom.xml
│
├── front/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts          # Axios instance with JWT interceptors
│   │   │   ├── account.ts         # Account & transaction API
│   │   │   ├── auth.ts            # Authentication API
│   │   │   ├── cards.ts           # Cards API
│   │   │   ├── investments.ts     # Investments API
│   │   │   └── user.ts            # User profile API
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx  # Main layout with header
│   │   │   │   └── Sidebar.tsx    # Navigation sidebar
│   │   │   └── ui/
│   │   │       └── Notifications.tsx # Notification center
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Global auth state
│   │   ├── hooks/
│   │   │   └── useAuth.ts         # Auth hook (re-exports context)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx  # Main dashboard
│   │   │   ├── TransactionsPage.tsx # Deposit/Withdraw/Transfer/PIX/QR
│   │   │   ├── HistoryPage.tsx    # Transaction history
│   │   │   ├── CardsPage.tsx      # Cards CRUD
│   │   │   ├── InvestPage.tsx     # Investment simulation
│   │   │   ├── AnalyticsPage.tsx  # Charts & metrics
│   │   │   ├── ProfilePage.tsx    # Profile & settings
│   │   │   └── HelpPage.tsx       # FAQ & support
│   │   ├── utils/
│   │   │   └── formatters.ts      # Currency, date formatters
│   │   ├── types/                 # TypeScript type definitions
│   │   ├── App.tsx                # Router configuration
│   │   └── main.tsx               # Entry point
│   ├── nginx.conf                 # Nginx config with API proxy
│   ├── Dockerfile                 # Multi-stage Node→Nginx
│   ├── tailwind.config.js         # Custom colors (orange/cream theme)
│   └── vite.config.ts
│
└── docker-compose.yml             # Full stack: 6 services
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a Pull Request

### Commit Convention

```
feat:     New feature
fix:      Bug fix
ci:       CI/CD changes
refactor: Code refactoring
test:     Tests
docs:     Documentation
chore:    Maintenance
```

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <p>Built with ❤️ using Java, Spring Boot, React and TypeScript</p>
  <p>
    <img src="https://img.shields.io/badge/Java-21-orange?logo=openjdk" />
    <img src="https://img.shields.io/badge/Spring%20Boot-3.5-green?logo=springboot" />
    <img src="https://img.shields.io/badge/React-18-blue?logo=react" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
    <img src="https://img.shields.io/badge/Docker-Compose-blue?logo=docker" />
  </p>
</div>

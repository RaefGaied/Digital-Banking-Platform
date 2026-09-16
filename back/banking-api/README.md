# 🏦 Banking API

![Java](https://img.shields.io/badge/Java-21-orange?style=flat-square&logo=java)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-green?style=flat-square&logo=springboot)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-red?style=flat-square&logo=redis)
![Kafka](https://img.shields.io/badge/Kafka-7.6-black?style=flat-square&logo=apachekafka)
![JWT](https://img.shields.io/badge/JWT-Auth-purple?style=flat-square&logo=jsonwebtokens)
![Swagger](https://img.shields.io/badge/Swagger-UI-brightgreen?style=flat-square&logo=swagger)

API REST de carteira digital desenvolvida com Java 21 e Spring Boot 3.5, simulando operações de um banco digital. Projeto desenvolvido para portfólio com foco em boas práticas, segurança e arquitetura profissional.

## 🚀 Tecnologias

- **Java 21** + **Spring Boot 3.5**
- **Spring Security** + **JWT** (autenticação stateless)
- **PostgreSQL** (banco de dados relacional)
- **Flyway** (migrations de banco de dados)
- **Redis** (cache)
- **Apache Kafka** (mensageria)
- **Swagger/OpenAPI 3** (documentação)
- **Docker** + **Docker Compose**
- **Lombok** + **MapStruct**
- **Testcontainers** (testes de integração)

## 📋 Pré-requisitos

- Java 21+
- Docker Desktop
- Maven 3.9+

## ⚙️ Como rodar

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/banking-api.git
cd banking-api
```

### 2. Suba os containers
```bash
cd ../..
docker compose up --build
```

### 3. Rode a aplicação localmente sem Docker
```bash
./mvnw spring-boot:run
```

### 4. MCP runtime

Para validar o transporte MCP exposto pelo backend:

```powershell
.\mvnw -DskipTests package
java -jar .\target\banking-api-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
cmd /c "cd /d . && .\mvnw.cmd -Dspring-boot.run.profiles=local spring-boot:run"
```

Observações de ambiente:

- Em perfil local, o app pode subir com H2 mesmo sem PostgreSQL.
- Se Redis não estiver ativo, `/actuator/health` pode mostrar `DOWN`.
- Se Kafka não estiver ativo, aparecem warnings de conexão em `localhost:9092`.
- Se a porta 8080 já estiver ocupada, pare a outra instância antes de executar o launcher.

### 5. Acesse a documentação
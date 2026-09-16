FROM maven:3.9.11-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml ./
RUN mvn -B dependency:go-offline -q
COPY src ./src
RUN mvn -B package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

FROM maven:3.9.11-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 \
		for attempt in 1 2 3 4 5; do \
			mvn -B -Dmaven.test.skip=true -Dmaven.wagon.http.retryHandler.count=3 \
				-Dmaven.wagon.httpconnectionManager.ttlSeconds=60 dependency:go-offline -q && exit 0; \
			echo "Maven dependency download attempt $attempt failed; retrying..."; \
			sleep 5; \
		done; \
		exit 1
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
		for attempt in 1 2 3 4 5; do \
			mvn -B -Dmaven.test.skip=true -DskipTests package -q \
				-Dmaven.wagon.http.retryHandler.count=10 \
				-Dmaven.wagon.httpconnectionManager.ttlSeconds=60 && exit 0; \
			echo "Maven build attempt $attempt failed; retrying..."; \
			sleep 5; \
		done; \
		exit 1

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

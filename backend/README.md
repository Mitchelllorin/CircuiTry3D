# CircuiTry3D Backend

Spring Boot API for Ohm’s Law.

## Run locally

- With Maven installed: `mvn spring-boot:run`
- With wrapper here: `./mvnw spring-boot:run` (requires Java 17 and network to download Maven)

## Endpoints

- `POST /api/ohms-law`
  - body: `{ voltage?, current?, resistance? }` provide exactly two
  - result: `{ voltage, current, resistance }`

## Build

- `./mvnw -DskipTests package`
- Result: `target/*.jar`

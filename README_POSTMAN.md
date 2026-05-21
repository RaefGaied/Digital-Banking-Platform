Postman / Newman: Running API Tests

- Start the backend and dependencies (Docker Compose) first:
  - `docker-compose up --build` (ensure backend at http://localhost:8080 and use the `/api/v1` context path)

- Import collection: `postman_collection.json` and environment `postman_env.json` into Postman.
  - Ensure the active environment is "Digital Banking Platform - Local".
  - Run the collection (Auth tests first).

- Run with Newman (PowerShell):
  - `./run-newman.ps1`
  - Or use `npx newman run postman_collection.json -e postman_env.json --delay-request 100`

- Notes:
  - Collection uses the `{{baseUrl}}` variable. Default env sets it to `http://localhost:8080/api/v1`.
  - After successful login, `accessToken` and `refreshToken` are set automatically in the environment by the collection scripts.
  - If some requests still have hardcoded raw URLs, Postman will prefer the `raw` value; prefer importing both files and running with the environment.

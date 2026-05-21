#!/usr/bin/env pwsh
# Run the Postman collection locally using npx newman
# Usage: Open PowerShell and run: .\run-newman.ps1

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "npx not found. Install Node.js (which includes npx) or run 'npm i -g newman'."
  exit 1
}

$n = "postman_collection.json"
$e = "postman_env.json"

Write-Host "Running Newman: collection=$n env=$e"

npx newman run $n -e $e --delay-request 100 --reporters cli,json --reporter-json-export newman-report.json

if ($LASTEXITCODE -eq 0) {
  Write-Host "Newman run completed successfully. Report: newman-report.json"
} else {
  Write-Error "Newman run failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

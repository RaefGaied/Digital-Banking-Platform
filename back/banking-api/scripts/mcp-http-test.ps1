$base = 'http://localhost:8080/api/v1'

# Login
$loginBody = @{ email = 'admin@finbank.local'; password = 'Admin@1234!' } | ConvertTo-Json
Write-Host "POST $base/auth/login"
$login = Invoke-RestMethod -Method Post -Uri ($base + '/auth/login') -ContentType 'application/json' -Body $loginBody
$token = $login.clientResponse.accessToken
Write-Host "Access token length:" ($token.Length)
$hdr = @{ Authorization = "Bearer $token" }

# Create agent
$sessionId = [guid]::NewGuid().ToString()
Write-Host "POST $base/mcp/agent/create -> sessionId: $sessionId"
$createBody = @{ sessionId = $sessionId } | ConvertTo-Json
$create = Invoke-RestMethod -Method Post -Uri ($base + '/mcp/agent/create') -Headers $hdr -ContentType 'application/json' -Body $createBody
Write-Host "Agent created:" ($create.data | ConvertTo-Json -Depth 5)
$agentId = $create.data.id

# Determine decision
$detReq = @{ agentId = $agentId; intent = 'TRANSFER'; confidence = 0.92; message = 'Transfer to vendor'; isSensitive = $false; parameters = @{ amount = 1200 } }
$detBody = $detReq | ConvertTo-Json -Depth 10
Write-Host "POST $base/mcp/agent/determine-decision"
$det = Invoke-RestMethod -Method Post -Uri ($base + '/mcp/agent/determine-decision') -Headers $hdr -ContentType 'application/json' -Body $detBody
Write-Host "Decision response:" ($det | ConvertTo-Json -Depth 10)

# List admin tasks
Write-Host "GET $base/mcp/flowable/admin-tasks"
$tasks = Invoke-RestMethod -Method Get -Uri ($base + '/mcp/flowable/admin-tasks') -Headers $hdr
Write-Host "Admin tasks:" ($tasks | ConvertTo-Json -Depth 10)

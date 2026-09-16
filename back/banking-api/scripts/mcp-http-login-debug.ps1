$url='http://localhost:8080/api/v1/auth/login'
$payload = @{ email = 'admin@finbank.local'; password = 'Admin@1234!' }

$client = New-Object System.Net.Http.HttpClient
$json = [System.Text.Json.JsonSerializer]::Serialize($payload)
$content = New-Object System.Net.Http.StringContent($json, [System.Text.Encoding]::UTF8, 'application/json')
$resp = $client.PostAsync($url, $content).GetAwaiter().GetResult()
Write-Host "Status:" $resp.StatusCode
$body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
Write-Host "Body:" $body
$resp.Headers | Format-List

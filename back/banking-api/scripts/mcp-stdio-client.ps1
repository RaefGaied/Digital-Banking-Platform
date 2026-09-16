<#
PowerShell MCP stdio JSON-RPC test client
Usage:
  .\mcp-stdio-client.ps1 -JarPath ".\target\banking-api-0.0.1-SNAPSHOT.jar"

This script launches the MCP stdio main class and sends framed JSON-RPC requests:
  1) initialize
  2) tools/list
  3) tools/call for the first returned tool (with empty arguments)

It prints responses to the console.
#>
param(
    [string]$JarPath = "target\banking-api-0.0.1-SNAPSHOT.jar",
    [int]$TimeoutMs = 30000
)

$encoding = [System.Text.Encoding]::UTF8

# Start the Spring Boot app via mvnw so McpStdioApplication runs in the child process.
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$mvnCmd = ".\\mvnw.cmd spring-boot:run -Dspring-boot.run.mainClass=com.fintech.banking.mcp.McpStdioApplication -Dspring-boot.run.profiles=local"
$psi.Arguments = "/c cd back\\banking-api && $mvnCmd"
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$started = $proc.Start()
if (-not $started) { Write-Error "Failed to start mvnw process"; exit 1 }

# Helper: write framed message (Content-Length header + body bytes)
function Send-Frame([int]$id, [string]$method, $params) {
    $obj = @{ jsonrpc = '2.0'; id = $id; method = $method; params = $params }
    $json = $obj | ConvertTo-Json -Depth 10
    $body = $encoding.GetBytes($json)
    $header = "Content-Length: $($body.Length)`r`n`r`n"
    $headerBytes = $encoding.GetBytes($header)

    $stream = $proc.StandardInput.BaseStream
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($body, 0, $body.Length)
    $stream.Flush()
}

# Helper: read one framed response (blocking up to TimeoutMs)
function Read-Frame([int]$timeoutMs) {
    $outStream = $proc.StandardOutput.BaseStream
    $start = [DateTime]::UtcNow

    # Read headers line-by-line until blank line
    $headers = @{}
    while ($true) {
        $lineBytes = New-Object System.Collections.ArrayList
        while ($true) {
            $b = $outStream.ReadByte()
            if ($b -lt 0) { break }
            $c = [char]$b
            $lineBytes.Add($b) | Out-Null
            if ($c -eq "`n") { break }
        }

        if ($lineBytes.Count -eq 0) { 
            # no data yet
            Start-Sleep -Milliseconds 10
            if (([DateTime]::UtcNow - $start).TotalMilliseconds -gt $timeoutMs) { throw "Timeout waiting for header" }
            continue
        }

        $line = $encoding.GetString(($lineBytes.ToArray()))
        $line = $line.TrimEnd("`r","`n")
        if ($line -eq '') { break }
        $idx = $line.IndexOf(":")
        if ($idx -ge 0) {
            $name = $line.Substring(0,$idx).Trim().ToLower()
            $value = $line.Substring($idx+1).Trim()
            $headers[$name] = $value
        }
    }

    if (-not $headers.ContainsKey('content-length')) { 
        # Ignore non-framed lines (logs) and continue waiting for framed response
        return Read-Frame -timeoutMs $timeoutMs
    }
    $len = [int]$headers['content-length']
    $buffer = New-Object byte[] $len
    $read = 0
    while ($read -lt $len) {
        $n = $outStream.Read($buffer, $read, $len - $read)
        if ($n -le 0) { throw "Stream closed while reading body" }
        $read += $n
        if (([DateTime]::UtcNow - $start).TotalMilliseconds -gt $timeoutMs) { throw "Timeout reading body" }
    }
    $bodyStr = $encoding.GetString($buffer)
    return $bodyStr | ConvertFrom-Json
}

try {
    Write-Host "Waiting briefly for server to initialize..."
    Start-Sleep -Milliseconds 800

    Write-Host "-> Sending initialize"
    Send-Frame -id 1 -method 'initialize' -params @{ }
    $initResp = Read-Frame -timeoutMs $TimeoutMs
    Write-Host "<- initialize response:`n$($initResp | ConvertTo-Json -Depth 6)"

    Write-Host "-> Requesting tools/list"
    Send-Frame -id 2 -method 'tools/list' -params @{ }
    $listResp = Read-Frame -timeoutMs $TimeoutMs
    Write-Host "<- tools/list response:`n$($listResp | ConvertTo-Json -Depth 6)"

    # Try to pick first tool and call it with empty arguments
    $tools = $listResp.result.tools
    if ($tools -and $tools.Count -gt 0) {
        $first = $tools[0].name
        Write-Host "-> Calling tool: $first (empty arguments)"
        $callParams = @{ name = $first; arguments = @{} }
        Send-Frame -id 3 -method 'tools/call' -params $callParams
        $callResp = Read-Frame -timeoutMs $TimeoutMs
        Write-Host "<- tools/call response:`n$($callResp | ConvertTo-Json -Depth 6)"
    } else {
        Write-Warning "No tools reported by server"
    }
} catch {
    Write-Error "Error communicating with MCP stdio server: $_"
} finally {
    if (-not $proc.HasExited) {
        $proc.Kill()
        $proc.WaitForExit()
    }
}

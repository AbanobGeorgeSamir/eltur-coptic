param(
    [string]$DeviceId,
    [string]$ApiBaseUrl = 'https://eltur-coptic-api-server.vercel.app/api'
)

$ErrorActionPreference = 'Stop'
$mobileDirectory = Split-Path -Parent $PSCommandPath
Push-Location $mobileDirectory

try {
    $ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
    if (-not $ApiBaseUrl.EndsWith('/api')) {
        $ApiBaseUrl += '/api'
    }

    try {
        $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -TimeoutSec 10
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -eq 503) {
            throw "The API is reachable at $ApiBaseUrl, but its database is unavailable (HTTP 503)."
        }
        throw "The API is not reachable at $ApiBaseUrl. Check the server address and network, then try again."
    }

    if ($health.status -ne 'ok') {
        throw "The API responded at $ApiBaseUrl, but its database is not healthy."
    }

    Write-Host "Using API: $ApiBaseUrl"
    $flutterArguments = @('run', "--dart-define=API_BASE_URL=$ApiBaseUrl")
    if ($DeviceId) {
        $flutterArguments += @('-d', $DeviceId)
    }

    & flutter @flutterArguments
    $flutterExitCode = $LASTEXITCODE
    exit $flutterExitCode
}
finally {
    Pop-Location
}


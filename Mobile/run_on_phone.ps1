param(
    [string]$DeviceId
)

$ErrorActionPreference = 'Stop'
$mobileDirectory = Split-Path -Parent $PSCommandPath
Push-Location $mobileDirectory

try {
    $network = Get-NetIPConfiguration |
        Where-Object {
            $_.NetAdapter.Status -eq 'Up' -and
            $_.IPv4DefaultGateway -and
            $_.IPv4Address
        } |
        Sort-Object `
            @{ Expression = { if ($_.NetAdapter.InterfaceAlias -match 'Wi-?Fi') { 0 } else { 1 } } },
            @{ Expression = { $_.NetAdapter.InterfaceMetric } } |
        Select-Object -First 1

    $hostAddress = $network.IPv4Address |
        Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
        Select-Object -First 1 -ExpandProperty IPAddress

    if (-not $hostAddress) {
        throw 'Could not find an active Wi-Fi/LAN IPv4 address for this computer.'
    }

    $apiBaseUrl = "http://${hostAddress}:8000/api"
    try {
        $health = Invoke-RestMethod -Uri "$apiBaseUrl/health" -TimeoutSec 4
    }
    catch {
        throw "The local API is not reachable at $apiBaseUrl. Start the backend, then run this script again."
    }

    if ($health.status -ne 'ok') {
        throw "The API responded at $apiBaseUrl, but its database is not healthy."
    }

    Write-Host "Using API: $apiBaseUrl"
    $flutterArguments = @('run', "--dart-define=API_BASE_URL=$apiBaseUrl")
    if ($DeviceId) {
        $flutterArguments += @('-d', $DeviceId)
    }

    $flutterCommand = Get-Command flutter -CommandType Application -ErrorAction Stop |
        Select-Object -First 1
    $flutterSdkRoot = Split-Path -Parent (Split-Path -Parent $flutterCommand.Source)
    $originalPath = $env:PATH
    $mappedDrive = $null
    $flutterExitCode = 1

    try {
        if ($flutterSdkRoot -match '\s') {
            $candidateDrive = [char]$null
            foreach ($candidate in [char[]](90..68)) {
                if (-not (Get-PSDrive -Name $candidate -ErrorAction SilentlyContinue)) {
                    $candidateDrive = $candidate
                    break
                }
            }

            if (-not $candidateDrive) {
                throw 'Could not find an unused drive letter for the Flutter SDK path.'
            }

            $mappedDrive = '{0}:' -f $candidateDrive
            $sdkParent = Split-Path -Parent $flutterSdkRoot
            & $env:ComSpec /c "subst $mappedDrive `"$sdkParent`""
            if ($LASTEXITCODE -ne 0) {
                throw "Could not create a temporary drive mapping for Flutter at $sdkParent."
            }

            $sdkFolder = Split-Path -Leaf $flutterSdkRoot
            $env:PATH = "$(Join-Path $mappedDrive (Join-Path $sdkFolder 'bin'));$env:PATH"
        }

        & flutter @flutterArguments
        $flutterExitCode = $LASTEXITCODE
    }
    finally {
        $env:PATH = $originalPath
        if ($mappedDrive) {
            & subst $mappedDrive /d | Out-Null
        }
    }

    exit $flutterExitCode
}
finally {
    Pop-Location
}

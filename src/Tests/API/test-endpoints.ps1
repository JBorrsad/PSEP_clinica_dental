# Script para probar los endpoints protegidos
$token = Get-Content -Path "auth_token.txt" -Raw

if (-not $token) {
    Write-Host "No se encontró el token. Ejecute primero test-login.ps1"
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Url
    )
    
    Write-Host "`n===== Probando endpoint: $Name ====="
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -Headers $headers
        Write-Host "Respuesta exitosa!"
        Write-Host "Cantidad de elementos: $($response.Count)"
        Write-Host "Primer elemento: $($response[0] | ConvertTo-Json -Depth 1)"
        return $response
    } catch {
        Write-Host "Error al acceder al endpoint: $_"
        Write-Host "StatusCode: $($_.Exception.Response.StatusCode.value__)"
        
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Respuesta: $responseBody"
            $reader.Close()
        }
        return $null
    }
}

# Probar todos los endpoints
$baseUrl = "http://localhost:5021/api"

Write-Host "Probando endpoints con token: $token"

# Endpoint de todas las citas
$allAppointments = Test-Endpoint -Name "Todas las citas" -Url "$baseUrl/Appointments"

# Endpoint de citas pendientes
$pendingAppointments = Test-Endpoint -Name "Citas pendientes" -Url "$baseUrl/Appointments/Pending"

# Endpoint de historial de citas
$historyItems = Test-Endpoint -Name "Historial de citas" -Url "$baseUrl/Appointments/History"

# Resumen
Write-Host "`n===== Resumen de resultados ====="
Write-Host "Todas las citas: $($allAppointments.Count) elementos"
Write-Host "Citas pendientes: $($pendingAppointments.Count) elementos"
Write-Host "Historial de citas: $($historyItems.Count) elementos" 
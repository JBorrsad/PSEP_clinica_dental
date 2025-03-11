# Script para probar los endpoints de API necesarios para el panel de administración

$baseUrl = "http://localhost:5021/api"
$loginUrl = "$baseUrl/Auth/login"

# 1. Primero obtenemos un token de autenticación
$loginData = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "1. Probando login con usuario: admin, password: admin" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $loginUrl -Method Post -ContentType "application/json" -Body $loginData
    Write-Host "Login exitoso. Token recibido:" -ForegroundColor Green
    $token = $response.token
    Write-Host $token -ForegroundColor Gray
} catch {
    Write-Host "Error en login:" -ForegroundColor Red
    Write-Host "StatusCode:" $_.Exception.Response.StatusCode.value__
    Write-Host "StatusDescription:" $_.Exception.Response.StatusDescription
    exit
}

# Función para probar un endpoint con el token
function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET"
    )
    
    Write-Host "`n$Name" -ForegroundColor Cyan
    Write-Host "URL: $Url" -ForegroundColor Gray
    Write-Host "Method: $Method" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -ContentType "application/json"
        Write-Host "Respuesta exitosa:" -ForegroundColor Green
        
        # Si la respuesta es un array, mostrar el número de elementos
        if ($response -is [array]) {
            Write-Host "Número de elementos: $($response.Count)" -ForegroundColor Green
            
            # Mostrar el primer elemento como muestra
            if ($response.Count -gt 0) {
                Write-Host "Primer elemento de muestra:" -ForegroundColor Green
                $response[0] | ConvertTo-Json
            }
        } else {
            $response | ConvertTo-Json
        }
        
        return $true
    } catch {
        Write-Host "Error en la solicitud:" -ForegroundColor Red
        Write-Host "StatusCode:" $_.Exception.Response.StatusCode.value__
        Write-Host "StatusDescription:" $_.Exception.Response.StatusDescription
        
        # Intentar leer el cuerpo de la respuesta de error
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Mensaje de error:" $responseBody
        } catch {
            Write-Host "No se pudo leer el cuerpo de la respuesta de error"
        }
        
        return $false
    }
}

# 2. Probar endpoint de citas (usado por el calendario)
Test-Endpoint -Name "2. GET /api/Appointments (usado por el calendario)" -Url "$baseUrl/Appointments"

# 3. Probar endpoint de citas pendientes (usado en el sidebar)
Test-Endpoint -Name "3. GET /api/Appointments/Pending (usado en el sidebar)" -Url "$baseUrl/Appointments/Pending"

# 4. Probar endpoint de historial de citas (usado en el sidebar)
Test-Endpoint -Name "4. GET /api/Appointments/History (usado en el sidebar)" -Url "$baseUrl/Appointments/History"

# 5. Probar endpoint de citas para una fecha específica
$today = Get-Date -Format "yyyy-MM-dd"
Test-Endpoint -Name "5. GET /api/Appointments/ForDate/{date} (usado para mostrar citas de un día)" -Url "$baseUrl/Appointments/ForDate/$today"

Write-Host "`nPruebas completadas" -ForegroundColor Cyan 
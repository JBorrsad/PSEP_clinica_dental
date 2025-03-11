# Script para probar la API
$baseUrl = "http://localhost:5021/api"

# Función para probar un endpoint
function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = ""
    )
    
    Write-Host "`n===== Probando endpoint: $Name ====="
    Write-Host "URL: $Url"
    Write-Host "Método: $Method"
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        if ($Body -ne "") {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "Respuesta exitosa!"
        if ($response -is [array]) {
            Write-Host "Cantidad de elementos: $($response.Count)"
            if ($response.Count -gt 0) {
                Write-Host "Primer elemento:"
                $response[0] | Format-List
            }
        } else {
            Write-Host "Respuesta:"
            $response | Format-List
        }
        
        return $response
    } catch {
        Write-Host "Error al acceder al endpoint: $_" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "StatusCode: $statusCode" -ForegroundColor Red
            
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Respuesta: $responseBody" -ForegroundColor Red
            $reader.Close()
        }
        
        return $null
    }
}

# Probar login
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

$loginResponse = Test-Endpoint -Name "Login" -Url "$baseUrl/Auth/login" -Method "POST" -Body $loginBody

if ($loginResponse -and $loginResponse.token) {
    $token = $loginResponse.token
    Write-Host "Token obtenido: $token"
    
    # Guardar el token para usarlo en otras pruebas
    $token | Out-File -FilePath "auth_token.txt"
    
    # Crear headers con el token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # Probar endpoint de citas
    $appointments = Test-Endpoint -Name "Todas las citas" -Url "$baseUrl/Appointments" -Headers $authHeaders
    
    # Probar endpoint de citas pendientes
    $pendingAppointments = Test-Endpoint -Name "Citas pendientes" -Url "$baseUrl/Appointments/Pending" -Headers $authHeaders
    
    # Probar endpoint de historial
    $history = Test-Endpoint -Name "Historial de citas" -Url "$baseUrl/Appointments/History" -Headers $authHeaders
    
    # Resumen
    Write-Host "`n===== Resumen de resultados ====="
    Write-Host "Todas las citas: $($appointments.Count) elementos"
    Write-Host "Citas pendientes: $($pendingAppointments.Count) elementos"
    Write-Host "Historial de citas: $($history.Count) elementos"
} else {
    Write-Host "No se pudo obtener el token. No se pueden probar los endpoints protegidos." -ForegroundColor Red
} 
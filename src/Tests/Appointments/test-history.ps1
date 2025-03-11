# Script para probar el endpoint de historial de citas
$baseUrl = "http://localhost:5021/api"

Write-Host "===== Probando endpoint de historial de citas ====="

# Primero obtener un token de autenticación
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "Obteniendo token de autenticación..."
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    # Mostrar solo los primeros 20 caracteres del token por seguridad
    $tokenPreview = $token.Substring(0, [Math]::Min(20, $token.Length)) + "..."
    Write-Host "Token obtenido: $tokenPreview" -ForegroundColor Green
    
    # Crear headers con el token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # Probar endpoint de historial de citas
    Write-Host "`nConsultando historial de citas..."
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method GET -Headers $authHeaders
    
    # Mostrar resultados
    Write-Host "Respuesta exitosa!" -ForegroundColor Green
    Write-Host "Cantidad de registros en historial: $($historyResponse.Count)"
    
    if ($historyResponse.Count -gt 0) {
        Write-Host "`nDetalle del historial de citas:"
        foreach ($item in $historyResponse) {
            Write-Host "`n------------------------------"
            Write-Host "ID de Cita: $($item.appointmentId)"
            Write-Host "Paciente: $($item.patientName)"
            Write-Host "Acción: $($item.action)"
            Write-Host "Fecha y Hora: $($item.timestamp)"
            Write-Host "------------------------------"
        }
        
        # Agrupar por tipo de acción
        $accionesPorTipo = $historyResponse | Group-Object -Property action
        
        Write-Host "`nResumen por tipo de acción:"
        foreach ($grupo in $accionesPorTipo) {
            Write-Host "$($grupo.Name): $($grupo.Count) registros"
        }
        
        # Agrupar por paciente
        $accionesPorPaciente = $historyResponse | Group-Object -Property patientName
        
        Write-Host "`nRegistros por paciente:"
        foreach ($grupo in $accionesPorPaciente) {
            Write-Host "$($grupo.Name): $($grupo.Count) registros"
        }
    } else {
        Write-Host "No hay historial de citas en el sistema" -ForegroundColor Yellow
    }
    
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
} 
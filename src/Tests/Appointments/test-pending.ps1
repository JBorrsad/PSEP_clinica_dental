# Script para probar el endpoint de citas pendientes
$baseUrl = "http://localhost:5021/api"

Write-Host "===== Probando endpoint de citas pendientes ====="

# Primero obtener un token de autenticación
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "Obteniendo token de autenticación..."
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    Write-Host "Token obtenido: $token" -ForegroundColor Green
    
    # Crear headers con el token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # Probar endpoint de citas pendientes
    Write-Host "`nConsultando citas pendientes..."
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
    
    # Mostrar resultados
    Write-Host "Respuesta exitosa!" -ForegroundColor Green
    Write-Host "Cantidad de citas pendientes: $($pendingResponse.Count)"
    
    if ($pendingResponse.Count -gt 0) {
        Write-Host "`nDetalle de citas pendientes:"
        foreach ($appointment in $pendingResponse) {
            $estado = if ($appointment.isConfirmed) { "Confirmada" } else { "Pendiente" }
            Write-Host "`n------------------------------"
            Write-Host "ID: $($appointment.id)"
            Write-Host "Paciente: $($appointment.patientName)"
            Write-Host "Teléfono: $($appointment.contactPhone)"
            Write-Host "Fecha: $($appointment.appointmentDateTime)"
            Write-Host "Tratamiento: $($appointment.treatmentType)"
            Write-Host "Estado: $estado"
            Write-Host "------------------------------"
        }
    } else {
        Write-Host "No hay citas pendientes en el sistema" -ForegroundColor Yellow
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
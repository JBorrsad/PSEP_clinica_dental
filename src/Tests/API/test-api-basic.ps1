# Script básico para probar la API
$baseUrl = "http://localhost:5021/api"

Write-Host "===== PRUEBA BÁSICA DE LA API DE CLÍNICA DENTAL ====="
Write-Host "URL Base: $baseUrl"

# Prueba de autenticación
Write-Host "`nPrueba de autenticación..." -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    
    Write-Host "Autenticación exitosa!" -ForegroundColor Green
    
    # Crear headers con el token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # Prueba de citas pendientes
    Write-Host "`nPrueba de citas pendientes..." -ForegroundColor Cyan
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
    Write-Host "Citas pendientes: $($pendingResponse.Count)" -ForegroundColor Green
    
    # Prueba de historial
    Write-Host "`nPrueba de historial de citas..." -ForegroundColor Cyan
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method GET -Headers $authHeaders
    Write-Host "Registros en historial: $($historyResponse.Count)" -ForegroundColor Green
    
    # Prueba de creación de cita
    Write-Host "`nPrueba de creación de cita..." -ForegroundColor Cyan
    
    $authHeadersWithContentType = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $fechaCita = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    $nuevaCita = @{
        patientName = "Paciente Básico"
        contactPhone = "666111222"
        contactEmail = "basico@ejemplo.com"
        appointmentDateTime = $fechaCita
        treatmentType = "revisión"
        notes = "Cita creada desde script básico"
    } | ConvertTo-Json
    
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments" -Method POST -Headers $authHeadersWithContentType -Body $nuevaCita
    Write-Host "Cita creada con ID: $($createResponse.id)" -ForegroundColor Green
    
    Write-Host "`nTodas las pruebas completadas con éxito!" -ForegroundColor Green
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n===== FIN DE LA PRUEBA BÁSICA =====" -ForegroundColor Cyan 
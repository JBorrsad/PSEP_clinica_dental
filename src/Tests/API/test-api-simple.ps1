# Script simplificado para probar la API
$baseUrl = "http://localhost:5021/api"

Write-Host "===== PRUEBA SIMPLIFICADA DE LA API DE CLÍNICA DENTAL ====="
Write-Host "URL Base: $baseUrl"
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "------------------------------------------------------"

# 1. Prueba de autenticación
Write-Host "`n1. PRUEBA DE AUTENTICACIÓN" -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $tokenPreview = $token.Substring(0, [Math]::Min(20, $token.Length)) + "..."
    
    Write-Host "[ÉXITO] Autenticación" -ForegroundColor Green
    Write-Host "  Token obtenido: $tokenPreview" -ForegroundColor Green
    Write-Host "------------------------------------------------------"
    
    # Crear headers con el token para las siguientes pruebas
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # 2. Prueba de obtención de citas pendientes
    Write-Host "`n2. PRUEBA DE CITAS PENDIENTES" -ForegroundColor Cyan
    try {
        $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
        
        Write-Host "[ÉXITO] Obtención de citas pendientes" -ForegroundColor Green
        Write-Host "  Se encontraron $($pendingResponse.Count) citas pendientes" -ForegroundColor Green
        Write-Host "------------------------------------------------------"
        
        if ($pendingResponse.Count -gt 0) {
            Write-Host "Detalles de la primera cita pendiente:" -ForegroundColor Cyan
            Write-Host "  ID: $($pendingResponse[0].id)"
            Write-Host "  Paciente: $($pendingResponse[0].patientName)"
            Write-Host "  Fecha: $($pendingResponse[0].appointmentDateTime)"
            Write-Host "  Tratamiento: $($pendingResponse[0].treatmentType)"
            Write-Host "------------------------------------------------------"
        }
    } 
    catch {
        Write-Host "[ERROR] Obtención de citas pendientes" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host "------------------------------------------------------"
    }
    
    # 3. Prueba de obtención del historial de citas
    Write-Host "`n3. PRUEBA DE HISTORIAL DE CITAS" -ForegroundColor Cyan
    try {
        $historyResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method GET -Headers $authHeaders
        
        Write-Host "[ÉXITO] Obtención de historial de citas" -ForegroundColor Green
        Write-Host "  Se encontraron $($historyResponse.Count) registros en el historial" -ForegroundColor Green
        Write-Host "------------------------------------------------------"
        
        if ($historyResponse.Count -gt 0) {
            Write-Host "Detalles del primer registro del historial:" -ForegroundColor Cyan
            Write-Host "  ID de Cita: $($historyResponse[0].appointmentId)"
            Write-Host "  Paciente: $($historyResponse[0].patientName)"
            Write-Host "  Acción: $($historyResponse[0].action)"
            Write-Host "  Fecha y Hora: $($historyResponse[0].timestamp)"
            Write-Host "------------------------------------------------------"
        }
    } 
    catch {
        Write-Host "[ERROR] Obtención de historial de citas" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host "------------------------------------------------------"
    }
    
    # 4. Prueba de creación de una nueva cita
    Write-Host "`n4. PRUEBA DE CREACIÓN DE CITA" -ForegroundColor Cyan
    
    # Crear headers con el token y el tipo de contenido
    $authHeadersWithContentType = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Datos de la nueva cita
    $fechaCita = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    $nuevaCita = @{
        patientName = "Paciente de Prueba Simple"
        contactPhone = "666555444"
        contactEmail = "paciente.simple@ejemplo.com"
        appointmentDateTime = $fechaCita
        treatmentType = "revisión"
        notes = "Cita creada desde script de prueba simple"
    } | ConvertTo-Json
    
    try {
        $createUrl = "$baseUrl/Appointments"
        $createResponse = Invoke-RestMethod -Uri $createUrl -Method POST -Headers $authHeadersWithContentType -Body $nuevaCita
        
        Write-Host "[ÉXITO] Creación de nueva cita" -ForegroundColor Green
        Write-Host "  Cita creada con ID: $($createResponse.id)" -ForegroundColor Green
        Write-Host "------------------------------------------------------"
        
        Write-Host "Detalles de la cita creada:" -ForegroundColor Cyan
        Write-Host "  ID: $($createResponse.id)"
        Write-Host "  Paciente: $($createResponse.patientName)"
        Write-Host "  Fecha y Hora: $($createResponse.appointmentDateTime)"
        Write-Host "  Tipo de Tratamiento: $($createResponse.treatmentType)"
        Write-Host "------------------------------------------------------"
    } 
    catch {
        Write-Host "[ERROR] Creación de nueva cita" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host "------------------------------------------------------"
    }
} 
catch {
    Write-Host "[ERROR] Autenticación" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host "------------------------------------------------------"
}

Write-Host "`n===== FIN DE LA PRUEBA SIMPLIFICADA =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 
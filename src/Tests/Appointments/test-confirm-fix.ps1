# Script para probar si la confirmación de citas funciona correctamente después de las correcciones
$baseUrl = "http://localhost:5021/api"

Write-Host "===== PRUEBA DE CONFIRMACIÓN DE CITAS ====="
Write-Host "URL Base: $baseUrl"
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "------------------------------------------------------"

# Obtener token de autenticación
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

try {
    Write-Host "1. Obteniendo token de autenticación..." -ForegroundColor Cyan
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $tokenPreview = $token.Substring(0, [Math]::Min(20, $token.Length)) + "..."
    
    Write-Host "[ÉXITO] Token obtenido: $tokenPreview" -ForegroundColor Green
    
    # Crear headers con el token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # Obtener citas pendientes
    Write-Host "`n2. Obteniendo citas pendientes..." -ForegroundColor Cyan
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
    
    if ($pendingResponse.Count -eq 0) {
        Write-Host "[ERROR] No hay citas pendientes para confirmar" -ForegroundColor Red
        exit
    }
    
    Write-Host "[ÉXITO] Se encontraron $($pendingResponse.Count) citas pendientes" -ForegroundColor Green
    
    # Seleccionar la primera cita pendiente
    $citaParaConfirmar = $pendingResponse[0]
    Write-Host "`n3. Seleccionando cita para confirmar:" -ForegroundColor Cyan
    Write-Host "   ID: $($citaParaConfirmar.id)"
    Write-Host "   Paciente: $($citaParaConfirmar.patientName)"
    Write-Host "   Fecha: $($citaParaConfirmar.appointmentDateTime)"
    Write-Host "   Estado actual: $($citaParaConfirmar.status) (IsConfirmed: $($citaParaConfirmar.isConfirmed))"
    
    # Confirmar la cita usando el endpoint específico
    Write-Host "`n4. Confirmando la cita usando PUT..." -ForegroundColor Cyan
    $confirmUrl = "$baseUrl/Appointments/$($citaParaConfirmar.id)/Confirm"
    
    try {
        $confirmResponse = Invoke-RestMethod -Uri $confirmUrl -Method PUT -Headers $authHeaders
        Write-Host "[ÉXITO] Cita confirmada correctamente usando PUT" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] No se pudo confirmar la cita usando PUT: $($_.Exception.Message)" -ForegroundColor Red
        
        # Intentar con POST
        Write-Host "`n5. Intentando confirmar la cita usando POST..." -ForegroundColor Cyan
        try {
            $confirmResponse = Invoke-RestMethod -Uri $confirmUrl -Method POST -Headers $authHeaders
            Write-Host "[ÉXITO] Cita confirmada correctamente usando POST" -ForegroundColor Green
        }
        catch {
            Write-Host "[ERROR] No se pudo confirmar la cita usando POST: $($_.Exception.Message)" -ForegroundColor Red
            exit
        }
    }
    
    # Verificar el estado de la cita después de confirmarla
    Write-Host "`n6. Verificando el estado de la cita después de confirmarla..." -ForegroundColor Cyan
    $appointmentUrl = "$baseUrl/Appointments/$($citaParaConfirmar.id)"
    $updatedAppointment = Invoke-RestMethod -Uri $appointmentUrl -Method GET -Headers $authHeaders
    
    Write-Host "   Estado actualizado: $($updatedAppointment.status) (IsConfirmed: $($updatedAppointment.isConfirmed))"
    
    if ($updatedAppointment.isConfirmed -eq $true -and $updatedAppointment.status -eq "Confirmada") {
        Write-Host "`n[ÉXITO] La cita se ha confirmado correctamente y su estado se ha actualizado" -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] La cita se ha confirmado pero su estado no se ha actualizado correctamente" -ForegroundColor Red
    }
    
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n===== FIN DE LA PRUEBA =====" -ForegroundColor Cyan 
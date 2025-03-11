# Test de cancelación de citas
# Este script prueba la funcionalidad de cancelación de citas y verifica que se han eliminado de la lista de pendientes

# Configuración
$baseUrl = "http://localhost:5021/api"
$username = "admin"
$password = "admin"

# 1. Obtener un token de autenticación
Write-Host "1. Obteniendo token de autenticación..." -ForegroundColor Cyan
$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $authResponse.token
    Write-Host "Token obtenido: $($token.Substring(0, 15))..." -ForegroundColor Green
}
catch {
    Write-Host "Error al obtener token: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# 2. Obtener citas pendientes antes de la cancelación
Write-Host "`n2. Obteniendo citas pendientes antes de la cancelación..." -ForegroundColor Cyan
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $pendingBefore = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method Get -Headers $headers
    $pendingCountBefore = $pendingBefore.Count
    Write-Host "Número de citas pendientes antes: $pendingCountBefore" -ForegroundColor Yellow
    
    if ($pendingCountBefore -eq 0) {
        Write-Host "No hay citas pendientes para cancelar. Finalizando script." -ForegroundColor Red
        exit 0
    }
    
    # Mostrar las citas pendientes
    Write-Host "Lista de citas pendientes antes de cancelar:" -ForegroundColor Yellow
    foreach ($appointment in $pendingBefore) {
        Write-Host "ID: $($appointment.id), Paciente: $($appointment.patientName), Fecha: $($appointment.appointmentDateTime), Tratamiento: $($appointment.treatmentType)" -ForegroundColor White
    }
    
    # Seleccionar la primera cita para cancelar
    $appointmentToCancel = $pendingBefore[0]
    $appointmentId = $appointmentToCancel.id
    Write-Host "`nSeleccionada para cancelar: ID $appointmentId - $($appointmentToCancel.patientName)" -ForegroundColor Magenta
}
catch {
    Write-Host "Error al obtener citas pendientes: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# 3. Cancelar la cita seleccionada
Write-Host "`n3. Cancelando la cita ID $appointmentId..." -ForegroundColor Cyan
try {
    $cancelUrl = "$baseUrl/Appointments/$appointmentId/Cancel"
    $cancelResponse = Invoke-RestMethod -Uri $cancelUrl -Method Put -Headers $headers
    Write-Host "Cita cancelada exitosamente" -ForegroundColor Green
    Write-Host "Respuesta: $($cancelResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Green
}
catch {
    Write-Host "Error al cancelar la cita: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# 4. Obtener citas pendientes después de la cancelación
Write-Host "`n4. Obteniendo citas pendientes después de la cancelación..." -ForegroundColor Cyan
try {
    $pendingAfter = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method Get -Headers $headers
    $pendingCountAfter = $pendingAfter.Count
    Write-Host "Número de citas pendientes después: $pendingCountAfter" -ForegroundColor Yellow
    
    # Verificar que la cita cancelada ya no está en la lista
    $citaEliminada = $true
    foreach ($appointment in $pendingAfter) {
        if ($appointment.id -eq $appointmentId) {
            $citaEliminada = $false
            Write-Host "ERROR: La cita con ID $appointmentId todavía aparece en la lista de pendientes" -ForegroundColor Red
            break
        }
    }
    
    if ($citaEliminada) {
        Write-Host "ÉXITO: La cita con ID $appointmentId ya no aparece en la lista de pendientes" -ForegroundColor Green
    }
    
    # Verificar que el número de citas ha disminuido
    if ($pendingCountAfter -eq $pendingCountBefore - 1) {
        Write-Host "ÉXITO: El número de citas pendientes ha disminuido correctamente" -ForegroundColor Green
    }
    else {
        Write-Host "ERROR: El número de citas pendientes no ha disminuido correctamente. Antes: $pendingCountBefore, Después: $pendingCountAfter" -ForegroundColor Red
    }
    
    # Mostrar las citas pendientes restantes
    if ($pendingCountAfter -gt 0) {
        Write-Host "`nLista de citas pendientes después de cancelar:" -ForegroundColor Yellow
        foreach ($appointment in $pendingAfter) {
            Write-Host "ID: $($appointment.id), Paciente: $($appointment.patientName), Fecha: $($appointment.appointmentDateTime), Tratamiento: $($appointment.treatmentType)" -ForegroundColor White
        }
    }
}
catch {
    Write-Host "Error al obtener citas pendientes después de cancelar: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# 5. Verificar que la cita cancelada aparece en el historial
Write-Host "`n5. Verificando que la cita aparece en el historial..." -ForegroundColor Cyan
try {
    $history = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method Get -Headers $headers
    
    $encontrada = $false
    foreach ($item in $history) {
        if ($item.appointmentId -eq $appointmentId) {
            $encontrada = $true
            Write-Host "ÉXITO: La cita cancelada aparece en el historial con ID $($item.id)" -ForegroundColor Green
            Write-Host "Detalles: Acción: $($item.action), Fecha: $($item.timestamp), Cita ID: $($item.appointmentId)" -ForegroundColor Green
            break
        }
    }
    
    if (-not $encontrada) {
        Write-Host "ERROR: La cita cancelada no aparece en el historial" -ForegroundColor Red
    }
}
catch {
    Write-Host "Error al obtener el historial: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

Write-Host "`nPrueba de cancelación completada!" -ForegroundColor Cyan 
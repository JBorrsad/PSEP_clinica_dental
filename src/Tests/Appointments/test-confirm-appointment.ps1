# Script para probar la confirmación de una cita

param (
    [int]$appointmentId = 1
)

$baseUrl = "http://localhost:5021/api"

Write-Host "===== Probando confirmación de cita ====="
Write-Host "ID de cita a confirmar: $appointmentId"

# Primero obtener un token de autenticación
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "`nObteniendo token de autenticación..."
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
    
    # Verificar estado actual de la cita
    Write-Host "`nVerificando estado actual de la cita ID: $appointmentId..."
    $appointmentUrl = "$baseUrl/Appointments/$appointmentId"
    $appointmentResponse = Invoke-RestMethod -Uri $appointmentUrl -Method GET -Headers $authHeaders
    
    # Determinar el estado actual de la cita
    $estadoActual = if ($appointmentResponse.isConfirmed) { 
        "Confirmada" 
    } else { 
        if ($appointmentResponse.isCanceled) {
            "Cancelada"
        } else {
            "Pendiente"
        }
    }
    
    Write-Host "Estado actual de la cita: $estadoActual"
    
    # Si la cita ya está confirmada, mostrar mensaje y salir
    if ($estadoActual -eq "Confirmada") {
        Write-Host "La cita ya está confirmada. No es necesario confirmarla nuevamente." -ForegroundColor Yellow
        exit
    }
    
    # Si la cita está cancelada, mostrar mensaje y salir
    if ($estadoActual -eq "Cancelada") {
        Write-Host "La cita está cancelada. No se puede confirmar una cita cancelada." -ForegroundColor Red
        exit
    }
    
    # Confirmar la cita
    Write-Host "`nConfirmando la cita ID: $appointmentId..."
    $confirmUrl = "$baseUrl/Appointments/$appointmentId/confirm"
    $confirmResponse = Invoke-RestMethod -Uri $confirmUrl -Method POST -Headers $authHeaders
    
    Write-Host "Respuesta exitosa!" -ForegroundColor Green
    Write-Host "La cita ha sido confirmada correctamente."
    
    # Verificar el nuevo estado de la cita
    Write-Host "`nVerificando el nuevo estado de la cita..."
    $updatedAppointment = Invoke-RestMethod -Uri $appointmentUrl -Method GET -Headers $authHeaders
    
    # Determinar el nuevo estado de la cita
    $nuevoEstado = if ($updatedAppointment.isConfirmed) { 
        "Confirmada" 
    } else { 
        if ($updatedAppointment.isCanceled) {
            "Cancelada"
        } else {
            "Pendiente"
        }
    }
    
    Write-Host "Nuevo estado de la cita: $nuevoEstado" -ForegroundColor Green
    
    # Mostrar detalles actualizados de la cita
    Write-Host "`nDetalles actualizados de la cita:"
    Write-Host "------------------------------"
    Write-Host "ID: $($updatedAppointment.id)"
    Write-Host "Paciente: $($updatedAppointment.patientName)"
    Write-Host "Teléfono: $($updatedAppointment.contactPhone)"
    Write-Host "Email: $($updatedAppointment.contactEmail)"
    Write-Host "Fecha y Hora: $($updatedAppointment.appointmentDateTime)"
    Write-Host "Tipo de Tratamiento: $($updatedAppointment.treatmentType)"
    Write-Host "Estado: $nuevoEstado"
    
    # Mostrar notas solo si existen
    if (![string]::IsNullOrEmpty($updatedAppointment.notes)) {
        Write-Host "Notas: $($updatedAppointment.notes)"
    } else {
        Write-Host "Notas: (Sin notas)"
    }
    
    # Mostrar fechas de creación y actualización
    if ($updatedAppointment.createdAt) {
        Write-Host "Fecha de Creación: $($updatedAppointment.createdAt)"
    }
    if ($updatedAppointment.updatedAt) {
        Write-Host "Última Actualización: $($updatedAppointment.updatedAt)"
    }
    Write-Host "------------------------------"
    
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
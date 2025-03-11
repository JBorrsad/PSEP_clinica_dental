# Script para probar la cancelación de una cita

param (
    [int]$appointmentId = 1,
    [string]$method = "PUT"  # Método HTTP a utilizar: PUT, POST o DELETE
)

$baseUrl = "http://localhost:5021/api"

Write-Host "===== Probando cancelación de cita ====="
Write-Host "ID de cita a cancelar: $appointmentId"
Write-Host "Método HTTP a utilizar: $method"

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
    
    # Si la cita ya está cancelada, mostrar mensaje y salir
    if ($estadoActual -eq "Cancelada") {
        Write-Host "La cita ya está cancelada. No es necesario cancelarla nuevamente." -ForegroundColor Yellow
        exit
    }
    
    # Cancelar la cita
    Write-Host "`nCancelando la cita ID: $appointmentId usando método $method..."
    $cancelUrl = "$baseUrl/Appointments/$appointmentId/cancel"
    
    # Intentar con el método especificado
    try {
        $cancelResponse = Invoke-RestMethod -Uri $cancelUrl -Method $method -Headers $authHeaders
        Write-Host "Respuesta exitosa usando método $method!" -ForegroundColor Green
        Write-Host "La cita ha sido cancelada correctamente."
    }
    catch {
        Write-Host "Error al usar método $method" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "StatusCode: $statusCode" -ForegroundColor Red
            
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Respuesta: $responseBody" -ForegroundColor Red
            $reader.Close()
        }
        
        # Si el método especificado falla, intentar con otros métodos
        if ($method -ne "PUT") {
            Write-Host "`nIntentando con método PUT..." -ForegroundColor Yellow
            try {
                $cancelResponse = Invoke-RestMethod -Uri $cancelUrl -Method PUT -Headers $authHeaders
                Write-Host "Respuesta exitosa usando método PUT!" -ForegroundColor Green
                Write-Host "La cita ha sido cancelada correctamente."
            }
            catch {
                Write-Host "Error al usar método PUT" -ForegroundColor Red
            }
        }
        
        if ($method -ne "POST") {
            Write-Host "`nIntentando con método POST..." -ForegroundColor Yellow
            try {
                $cancelResponse = Invoke-RestMethod -Uri $cancelUrl -Method POST -Headers $authHeaders
                Write-Host "Respuesta exitosa usando método POST!" -ForegroundColor Green
                Write-Host "La cita ha sido cancelada correctamente."
            }
            catch {
                Write-Host "Error al usar método POST" -ForegroundColor Red
            }
        }
        
        if ($method -ne "DELETE") {
            Write-Host "`nIntentando con método DELETE..." -ForegroundColor Yellow
            try {
                $cancelResponse = Invoke-RestMethod -Uri $cancelUrl -Method DELETE -Headers $authHeaders
                Write-Host "Respuesta exitosa usando método DELETE!" -ForegroundColor Green
                Write-Host "La cita ha sido cancelada correctamente."
            }
            catch {
                Write-Host "Error al usar método DELETE" -ForegroundColor Red
            }
        }
    }
    
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
    
    Write-Host "------------------------------"
    
} catch {
    Write-Host "Error general" -ForegroundColor Red
} 
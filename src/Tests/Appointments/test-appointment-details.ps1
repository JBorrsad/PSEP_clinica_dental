# Script para probar el endpoint de detalles de una cita específica

# Obtener el ID de la cita como parámetro o usar un valor predeterminado
param (
    [int]$appointmentId = 1
)

$baseUrl = "http://localhost:5021/api"

Write-Host "===== Probando endpoint de detalles de cita ====="
Write-Host "ID de cita a consultar: $appointmentId"

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
    
    # Probar endpoint de detalles de cita
    Write-Host "`nConsultando detalles de la cita ID: $appointmentId..."
    $appointmentUrl = "$baseUrl/Appointments/$appointmentId"
    $appointmentResponse = Invoke-RestMethod -Uri $appointmentUrl -Method GET -Headers $authHeaders
    
    # Mostrar resultados
    Write-Host "Respuesta exitosa!" -ForegroundColor Green
    
    # Determinar el estado de la cita
    $estado = if ($appointmentResponse.isConfirmed) { 
        "Confirmada" 
    } else { 
        if ($appointmentResponse.isCanceled) {
            "Cancelada"
        } else {
            "Pendiente"
        }
    }
    
    # Mostrar detalles de la cita
    Write-Host "`nDetalles de la cita:"
    Write-Host "------------------------------"
    Write-Host "ID: $($appointmentResponse.id)"
    Write-Host "Paciente: $($appointmentResponse.patientName)"
    Write-Host "Teléfono: $($appointmentResponse.contactPhone)"
    Write-Host "Email: $($appointmentResponse.contactEmail)"
    Write-Host "Fecha y Hora: $($appointmentResponse.appointmentDateTime)"
    Write-Host "Tipo de Tratamiento: $($appointmentResponse.treatmentType)"
    Write-Host "Estado: $estado"
    
    # Mostrar notas solo si existen
    if (![string]::IsNullOrEmpty($appointmentResponse.notes)) {
        Write-Host "Notas: $($appointmentResponse.notes)"
    } else {
        Write-Host "Notas: (Sin notas)"
    }
    
    # Mostrar fechas de creación y actualización
    if ($appointmentResponse.createdAt) {
        Write-Host "Fecha de Creación: $($appointmentResponse.createdAt)"
    }
    if ($appointmentResponse.updatedAt) {
        Write-Host "Última Actualización: $($appointmentResponse.updatedAt)"
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
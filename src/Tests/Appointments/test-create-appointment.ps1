# Script para probar la creación de una nueva cita

$baseUrl = "http://localhost:5021/api"

Write-Host "===== Probando creación de una nueva cita ====="

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
        "Content-Type" = "application/json"
    }
    
    # Datos de la nueva cita
    $fechaCita = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    $nuevaCita = @{
        patientName = "Paciente de Prueba"
        contactPhone = "666777888"
        contactEmail = "paciente@ejemplo.com"
        appointmentDateTime = $fechaCita
        treatmentType = "consulta"
        notes = "Cita creada desde script de prueba"
    } | ConvertTo-Json
    
    Write-Host "`nCreando nueva cita con los siguientes datos:"
    Write-Host "Paciente: Paciente de Prueba"
    Write-Host "Teléfono: 666777888"
    Write-Host "Email: paciente@ejemplo.com"
    Write-Host "Fecha: $fechaCita"
    Write-Host "Tratamiento: consulta"
    Write-Host "Notas: Cita creada desde script de prueba"
    
    # Crear la cita
    $createUrl = "$baseUrl/Appointments"
    $createResponse = Invoke-RestMethod -Uri $createUrl -Method POST -Headers $authHeaders -Body $nuevaCita
    
    Write-Host "`nRespuesta exitosa!" -ForegroundColor Green
    Write-Host "La cita ha sido creada correctamente."
    
    # Mostrar detalles de la cita creada
    Write-Host "`nDetalles de la cita creada:"
    Write-Host "------------------------------"
    Write-Host "ID: $($createResponse.id)"
    Write-Host "Paciente: $($createResponse.patientName)"
    Write-Host "Teléfono: $($createResponse.contactPhone)"
    Write-Host "Email: $($createResponse.contactEmail)"
    Write-Host "Fecha y Hora: $($createResponse.appointmentDateTime)"
    Write-Host "Tipo de Tratamiento: $($createResponse.treatmentType)"
    
    # Determinar el estado de la cita
    $estado = if ($createResponse.isConfirmed) { 
        "Confirmada" 
    } else { 
        if ($createResponse.isCanceled) {
            "Cancelada"
        } else {
            "Pendiente"
        }
    }
    
    Write-Host "Estado: $estado"
    
    # Mostrar notas solo si existen
    if (![string]::IsNullOrEmpty($createResponse.notes)) {
        Write-Host "Notas: $($createResponse.notes)"
    } else {
        Write-Host "Notas: (Sin notas)"
    }
    
    Write-Host "------------------------------"
    
    # Verificar que la cita aparece en la lista de citas pendientes
    Write-Host "`nVerificando que la cita aparece en la lista de citas pendientes..."
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
    
    $citaEncontrada = $pendingResponse | Where-Object { $_.id -eq $createResponse.id }
    
    if ($citaEncontrada) {
        Write-Host "La cita se encuentra correctamente en la lista de citas pendientes." -ForegroundColor Green
    } else {
        Write-Host "¡Error! La cita no se encuentra en la lista de citas pendientes." -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error general" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "StatusCode: $statusCode" -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta: $responseBody" -ForegroundColor Red
        $reader.Close()
    }
} 
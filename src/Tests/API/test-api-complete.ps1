# Script completo para probar todos los endpoints de la API
$baseUrl = "http://localhost:5021/api"

Write-Host "===== PRUEBA COMPLETA DE LA API DE CLÍNICA DENTAL ====="
Write-Host "URL Base: $baseUrl"
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "------------------------------------------------------"

# Función para mostrar el resultado de una prueba
function Show-TestResult {
    param (
        [string]$testName,
        [bool]$success,
        [string]$message = ""
    )
    
    if ($success) {
        Write-Host "[ÉXITO] $testName" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $testName" -ForegroundColor Red
    }
    
    if ($message) {
        Write-Host "  $message" -ForegroundColor $(if ($success) { "Green" } else { "Red" })
    }
    
    Write-Host "------------------------------------------------------"
}

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
    
    Show-TestResult -testName "Autenticación" -success $true -message "Token obtenido: $tokenPreview"
    
    # Crear headers con el token para las siguientes pruebas
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # 2. Prueba de obtención de citas pendientes
    Write-Host "`n2. PRUEBA DE CITAS PENDIENTES" -ForegroundColor Cyan
    try {
        $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
        
        Show-TestResult -testName "Obtención de citas pendientes" -success $true -message "Se encontraron $($pendingResponse.Count) citas pendientes"
        
        if ($pendingResponse.Count -gt 0) {
            Write-Host "Detalles de la primera cita pendiente:" -ForegroundColor Cyan
            Write-Host "  ID: $($pendingResponse[0].id)"
            Write-Host "  Paciente: $($pendingResponse[0].patientName)"
            Write-Host "  Fecha: $($pendingResponse[0].appointmentDateTime)"
            Write-Host "  Tratamiento: $($pendingResponse[0].treatmentType)"
            Write-Host "------------------------------------------------------"
        }
    } catch {
        Show-TestResult -testName "Obtención de citas pendientes" -success $false -message "Error: $_"
    }
    
    # 3. Prueba de obtención del historial de citas
    Write-Host "`n3. PRUEBA DE HISTORIAL DE CITAS" -ForegroundColor Cyan
    try {
        $historyResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method GET -Headers $authHeaders
        
        Show-TestResult -testName "Obtención de historial de citas" -success $true -message "Se encontraron $($historyResponse.Count) registros en el historial"
        
        if ($historyResponse.Count -gt 0) {
            Write-Host "Detalles del primer registro del historial:" -ForegroundColor Cyan
            Write-Host "  ID de Cita: $($historyResponse[0].appointmentId)"
            Write-Host "  Paciente: $($historyResponse[0].patientName)"
            Write-Host "  Acción: $($historyResponse[0].action)"
            Write-Host "  Fecha y Hora: $($historyResponse[0].timestamp)"
            Write-Host "------------------------------------------------------"
            
            # Agrupar por tipo de acción
            $accionesPorTipo = $historyResponse | Group-Object -Property action
            
            Write-Host "Resumen por tipo de acción:" -ForegroundColor Cyan
            foreach ($grupo in $accionesPorTipo) {
                Write-Host "  $($grupo.Name): $($grupo.Count) registros"
            }
            Write-Host "------------------------------------------------------"
        }
    } catch {
        Show-TestResult -testName "Obtención de historial de citas" -success $false -message "Error: $_"
    }
    
    # 4. Prueba de obtención de detalles de una cita específica
    Write-Host "`n4. PRUEBA DE DETALLES DE CITA" -ForegroundColor Cyan
    
    # Obtener el ID de la primera cita pendiente, si existe
    $appointmentId = if ($pendingResponse -and $pendingResponse.Count -gt 0) { $pendingResponse[0].id } else { 1 }
    
    try {
        $appointmentUrl = "$baseUrl/Appointments/$appointmentId"
        $appointmentResponse = Invoke-RestMethod -Uri $appointmentUrl -Method GET -Headers $authHeaders
        
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
        
        Show-TestResult -testName "Obtención de detalles de cita (ID: $appointmentId)" -success $true -message "Paciente: $($appointmentResponse.patientName), Estado: $estado"
        
        Write-Host "Detalles completos de la cita:" -ForegroundColor Cyan
        Write-Host "  ID: $($appointmentResponse.id)"
        Write-Host "  Paciente: $($appointmentResponse.patientName)"
        Write-Host "  Teléfono: $($appointmentResponse.contactPhone)"
        Write-Host "  Email: $($appointmentResponse.contactEmail)"
        Write-Host "  Fecha y Hora: $($appointmentResponse.appointmentDateTime)"
        Write-Host "  Tipo de Tratamiento: $($appointmentResponse.treatmentType)"
        Write-Host "  Estado: $estado"
        
        if (![string]::IsNullOrEmpty($appointmentResponse.notes)) {
            Write-Host "  Notas: $($appointmentResponse.notes)"
        }
        Write-Host "------------------------------------------------------"
    } catch {
        Show-TestResult -testName "Obtención de detalles de cita (ID: $appointmentId)" -success $false -message "Error: $_"
    }
    
    # 5. Prueba de creación de una nueva cita
    Write-Host "`n5. PRUEBA DE CREACIÓN DE CITA" -ForegroundColor Cyan
    
    # Crear headers con el token y el tipo de contenido
    $authHeadersWithContentType = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Datos de la nueva cita
    $fechaCita = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    $nuevaCita = @{
        patientName = "Paciente de Prueba API"
        contactPhone = "666999888"
        contactEmail = "paciente.prueba@ejemplo.com"
        appointmentDateTime = $fechaCita
        treatmentType = "revisión"
        notes = "Cita creada desde script de prueba completo"
    } | ConvertTo-Json
    
    try {
        $createUrl = "$baseUrl/Appointments"
        $createResponse = Invoke-RestMethod -Uri $createUrl -Method POST -Headers $authHeadersWithContentType -Body $nuevaCita
        
        Show-TestResult -testName "Creación de nueva cita" -success $true -message "Cita creada con ID: $($createResponse.id)"
        
        Write-Host "Detalles de la cita creada:" -ForegroundColor Cyan
        Write-Host "  ID: $($createResponse.id)"
        Write-Host "  Paciente: $($createResponse.patientName)"
        Write-Host "  Fecha y Hora: $($createResponse.appointmentDateTime)"
        Write-Host "  Tipo de Tratamiento: $($createResponse.treatmentType)"
        Write-Host "------------------------------------------------------"
        
        # Guardar el ID de la cita creada para las siguientes pruebas
        $newAppointmentId = $createResponse.id
        
        # 6. Prueba de confirmación de cita
        if ($newAppointmentId) {
            Write-Host "`n6. PRUEBA DE CONFIRMACIÓN DE CITA" -ForegroundColor Cyan
            
            try {
                $confirmUrl = "$baseUrl/Appointments/$newAppointmentId/confirm"
                $confirmResponse = Invoke-RestMethod -Uri $confirmUrl -Method POST -Headers $authHeaders
                
                # Verificar el nuevo estado de la cita
                $updatedAppointment = Invoke-RestMethod -Uri "$baseUrl/Appointments/$newAppointmentId" -Method GET -Headers $authHeaders
                
                $nuevoEstado = if ($updatedAppointment.isConfirmed) { 
                    "Confirmada" 
                } else { 
                    if ($updatedAppointment.isCanceled) {
                        "Cancelada"
                    } else {
                        "Pendiente"
                    }
                }
                
                $success = $nuevoEstado -eq "Confirmada"
                
                Show-TestResult -testName "Confirmación de cita (ID: $newAppointmentId)" -success $success -message "Nuevo estado: $nuevoEstado"
            } catch {
                Show-TestResult -testName "Confirmación de cita (ID: $newAppointmentId)" -success $false -message "Error: $_"
            }
            
            # 7. Prueba de cancelación de cita
            Write-Host "`n7. PRUEBA DE CANCELACIÓN DE CITA" -ForegroundColor Cyan
            
            try {
                $cancelUrl = "$baseUrl/Appointments/$newAppointmentId/cancel"
                $cancelResponse = $null
                
                # Intentar con diferentes métodos HTTP
                $methods = @("PUT", "POST", "DELETE")
                $success = $false
                
                foreach ($method in $methods) {
                    try {
                        Write-Host "  Intentando con método $method..." -ForegroundColor Yellow
                        $cancelResponse = Invoke-RestMethod -Uri $cancelUrl -Method $method -Headers $authHeaders
                        $success = $true
                        Write-Host "  Método $method exitoso!" -ForegroundColor Green
                        break
                    } catch {
                        Write-Host "  Método $method fallido" -ForegroundColor Red
                    }
                }
                
                if ($success) {
                    # Verificar el nuevo estado de la cita
                    $updatedAppointment = Invoke-RestMethod -Uri "$baseUrl/Appointments/$newAppointmentId" -Method GET -Headers $authHeaders
                    
                    $nuevoEstado = if ($updatedAppointment.isConfirmed) { 
                        "Confirmada" 
                    } else { 
                        if ($updatedAppointment.isCanceled) {
                            "Cancelada"
                        } else {
                            "Pendiente"
                        }
                    }
                    
                    $success = $nuevoEstado -eq "Cancelada"
                    
                    Show-TestResult -testName "Cancelación de cita (ID: $newAppointmentId)" -success $success -message "Nuevo estado: $nuevoEstado"
                } else {
                    Show-TestResult -testName "Cancelación de cita (ID: $newAppointmentId)" -success $false -message "Todos los métodos HTTP fallaron"
                }
            } catch {
                Show-TestResult -testName "Cancelación de cita (ID: $newAppointmentId)" -success $false -message "Error: $_"
            }
        }
    } catch {
        Show-TestResult -testName "Creación de nueva cita" -success $false -message "Error: $_"
    }
    
    # 8. Prueba de WebSocket (solo instrucciones)
    Write-Host "`n8. INSTRUCCIONES PARA PROBAR WEBSOCKET" -ForegroundColor Cyan
    
    Write-Host "Para probar la conexión WebSocket, ejecute el script 'test-websocket-simple.ps1'" -ForegroundColor Yellow
    Write-Host "O use el siguiente comando con wscat (si está instalado):" -ForegroundColor Yellow
    Write-Host "wscat -c 'ws://localhost:5021/ws' -H 'Authorization: Bearer $token'" -ForegroundColor Cyan
    
    Write-Host "------------------------------------------------------"
    
} catch {
    Show-TestResult -testName "Autenticación" -success $false -message "Error: $_"
}

Write-Host "`n===== FIN DE LA PRUEBA COMPLETA =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 
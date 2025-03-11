# Script maestro para probar todos los endpoints principales de la API
$baseUrl = "http://localhost:5021/api"

Write-Host "===== PRUEBA COMPLETA DE LA API =====" -ForegroundColor Cyan
Write-Host "URL base: $baseUrl" -ForegroundColor Cyan
Write-Host "Fecha de ejecución: $(Get-Date)" -ForegroundColor Cyan
Write-Host "=======================================`n" -ForegroundColor Cyan

# Resultados de las pruebas
$resultados = @{}

# Función para registrar resultados
function Registrar-Resultado {
    param (
        [string]$prueba,
        [bool]$exitoso,
        [string]$mensaje = ""
    )
    
    $resultados[$prueba] = @{
        "Exitoso" = $exitoso
        "Mensaje" = $mensaje
    }
    
    $colorEstado = if ($exitoso) { "Green" } else { "Red" }
    $estado = if ($exitoso) { "EXITOSO" } else { "FALLIDO" }
    
    Write-Host "`n>> Resultado de prueba [$prueba]: " -NoNewline
    Write-Host $estado -ForegroundColor $colorEstado
    if ($mensaje) {
        Write-Host "   $mensaje"
    }
}

# Primero obtener un token de autenticación
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "1. Autenticación" -ForegroundColor Yellow
Write-Host "-------------------"
Write-Host "Obteniendo token de autenticación..."

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
    
    Registrar-Resultado -prueba "Autenticación" -exitoso $true -mensaje "Token obtenido correctamente"
    
    # 2. Obtener citas pendientes
    Write-Host "`n2. Citas Pendientes" -ForegroundColor Yellow
    Write-Host "-------------------"
    Write-Host "Consultando citas pendientes..."
    
    try {
        $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
        Write-Host "Citas pendientes encontradas: $($pendingResponse.Count)" -ForegroundColor Green
        
        if ($pendingResponse.Count -gt 0) {
            Write-Host "Primera cita pendiente: ID $($pendingResponse[0].id), Paciente: $($pendingResponse[0].patientName)"
        }
        
        Registrar-Resultado -prueba "Citas Pendientes" -exitoso $true -mensaje "Se encontraron $($pendingResponse.Count) citas pendientes"
    }
    catch {
        Registrar-Resultado -prueba "Citas Pendientes" -exitoso $false -mensaje "Error: $($_.Exception.Message)"
    }
    
    # 3. Obtener historial de citas
    Write-Host "`n3. Historial de Citas" -ForegroundColor Yellow
    Write-Host "-------------------"
    Write-Host "Consultando historial de citas..."
    
    try {
        $historyResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method GET -Headers $authHeaders
        Write-Host "Registros en historial: $($historyResponse.Count)" -ForegroundColor Green
        
        if ($historyResponse.Count -gt 0) {
            $accionesPorTipo = $historyResponse | Group-Object -Property action
            Write-Host "Tipos de acciones registradas:"
            foreach ($grupo in $accionesPorTipo) {
                Write-Host "  - $($grupo.Name): $($grupo.Count) registros"
            }
        }
        
        Registrar-Resultado -prueba "Historial de Citas" -exitoso $true -mensaje "Se encontraron $($historyResponse.Count) registros en el historial"
    }
    catch {
        Registrar-Resultado -prueba "Historial de Citas" -exitoso $false -mensaje "Error: $($_.Exception.Message)"
    }
    
    # 4. Crear una nueva cita
    Write-Host "`n4. Creación de Cita" -ForegroundColor Yellow
    Write-Host "-------------------"
    Write-Host "Creando una nueva cita..."
    
    try {
        # Datos de la nueva cita
        $fechaCita = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
        $idPrueba = Get-Random -Minimum 1000 -Maximum 9999
        $nuevaCita = @{
            patientName = "Paciente Prueba $idPrueba"
            contactPhone = "666$idPrueba"
            contactEmail = "paciente$idPrueba@ejemplo.com"
            appointmentDateTime = $fechaCita
            treatmentType = "consulta"
            notes = "Cita de prueba $idPrueba creada el $(Get-Date)"
        } | ConvertTo-Json
        
        Write-Host "Datos de la cita:"
        Write-Host "  - Paciente: Paciente Prueba $idPrueba"
        Write-Host "  - Teléfono: 666$idPrueba"
        Write-Host "  - Fecha: $fechaCita"
        
        $createResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments" -Method POST -Headers $authHeaders -Body $nuevaCita
        Write-Host "Cita creada exitosamente con ID: $($createResponse.id)" -ForegroundColor Green
        
        $idNuevaCita = $createResponse.id
        Registrar-Resultado -prueba "Creación de Cita" -exitoso $true -mensaje "Cita creada con ID: $idNuevaCita"
        
        # 5. Consultar detalles de la cita creada
        Write-Host "`n5. Detalles de Cita" -ForegroundColor Yellow
        Write-Host "-------------------"
        Write-Host "Consultando detalles de la cita recién creada (ID: $idNuevaCita)..."
        
        try {
            $appointmentResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/$idNuevaCita" -Method GET -Headers $authHeaders
            
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
            
            Write-Host "Detalles obtenidos:" -ForegroundColor Green
            Write-Host "  - ID: $($appointmentResponse.id)"
            Write-Host "  - Paciente: $($appointmentResponse.patientName)"
            Write-Host "  - Estado: $estado"
            
            Registrar-Resultado -prueba "Detalles de Cita" -exitoso $true -mensaje "Detalles obtenidos correctamente para la cita ID: $idNuevaCita"
            
            # 6. Confirmar la cita
            Write-Host "`n6. Confirmación de Cita" -ForegroundColor Yellow
            Write-Host "-------------------"
            Write-Host "Intentando confirmar la cita ID: $idNuevaCita..."
            
            try {
                $confirmUrl = "$baseUrl/Appointments/$idNuevaCita/confirm"
                $confirmResponse = Invoke-RestMethod -Uri $confirmUrl -Method POST -Headers $authHeaders
                
                # Verificar si la confirmación funcionó
                $citaActualizada = Invoke-RestMethod -Uri "$baseUrl/Appointments/$idNuevaCita" -Method GET -Headers $authHeaders
                
                if ($citaActualizada.isConfirmed) {
                    Write-Host "Cita confirmada exitosamente" -ForegroundColor Green
                    Registrar-Resultado -prueba "Confirmación de Cita" -exitoso $true -mensaje "Cita ID: $idNuevaCita confirmada correctamente"
                } else {
                    Write-Host "La cita no se confirmó a pesar de la respuesta exitosa" -ForegroundColor Yellow
                    Registrar-Resultado -prueba "Confirmación de Cita" -exitoso $false -mensaje "No se pudo confirmar la cita a pesar de que el servidor aceptó la solicitud"
                }
            }
            catch {
                $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Desconocido" }
                Write-Host "Error al confirmar la cita: StatusCode $statusCode" -ForegroundColor Red
                
                # Si el método POST no funciona, intentamos con PUT
                Write-Host "Intentando con método PUT..." -ForegroundColor Yellow
                try {
                    $confirmResponse = Invoke-RestMethod -Uri $confirmUrl -Method PUT -Headers $authHeaders
                    Registrar-Resultado -prueba "Confirmación de Cita" -exitoso $true -mensaje "Cita confirmada con método PUT en lugar de POST"
                }
                catch {
                    Registrar-Resultado -prueba "Confirmación de Cita" -exitoso $false -mensaje "Error: No se pudo confirmar la cita con ningún método HTTP"
                }
            }
            
            # 7. Cancelar la cita
            Write-Host "`n7. Cancelación de Cita" -ForegroundColor Yellow
            Write-Host "-------------------"
            Write-Host "Intentando cancelar la cita ID: $idNuevaCita..."
            
            try {
                $cancelUrl = "$baseUrl/Appointments/$idNuevaCita/cancel"
                $cancelResponse = Invoke-RestMethod -Uri $cancelUrl -Method PUT -Headers $authHeaders
                
                # Verificar si la cancelación funcionó
                $citaActualizada = Invoke-RestMethod -Uri "$baseUrl/Appointments/$idNuevaCita" -Method GET -Headers $authHeaders
                
                if ($citaActualizada.isCanceled) {
                    Write-Host "Cita cancelada exitosamente" -ForegroundColor Green
                    Registrar-Resultado -prueba "Cancelación de Cita" -exitoso $true -mensaje "Cita ID: $idNuevaCita cancelada correctamente"
                } else {
                    Write-Host "La cita no se canceló a pesar de la respuesta exitosa" -ForegroundColor Yellow
                    Registrar-Resultado -prueba "Cancelación de Cita" -exitoso $false -mensaje "No se pudo cancelar la cita a pesar de que el servidor aceptó la solicitud"
                }
            }
            catch {
                Registrar-Resultado -prueba "Cancelación de Cita" -exitoso $false -mensaje "Error: $($_.Exception.Message)"
            }
        }
        catch {
            Registrar-Resultado -prueba "Detalles de Cita" -exitoso $false -mensaje "Error: $($_.Exception.Message)"
        }
    }
    catch {
        Registrar-Resultado -prueba "Creación de Cita" -exitoso $false -mensaje "Error: $($_.Exception.Message)"
    }
    
} catch {
    Registrar-Resultado -prueba "Autenticación" -exitoso $false -mensaje "Error: $($_.Exception.Message)"
}

# Mostrar resumen de resultados
Write-Host "`n`n===== RESUMEN DE RESULTADOS =====" -ForegroundColor Cyan
$exitosos = 0
$fallidos = 0

foreach ($prueba in $resultados.Keys | Sort-Object) {
    $resultado = $resultados[$prueba]
    $colorEstado = if ($resultado.Exitoso) { "Green" } else { "Red" }
    $estado = if ($resultado.Exitoso) { "EXITOSO" } else { "FALLIDO" }
    
    Write-Host "$prueba: " -NoNewline
    Write-Host $estado -ForegroundColor $colorEstado
    
    if ($resultado.Exitoso) {
        $exitosos++
    } else {
        $fallidos++
        Write-Host "  Detalles: $($resultado.Mensaje)" -ForegroundColor Red
    }
}

$colorResumen = if ($fallidos -gt 0) { "Red" } else { "Green" }
Write-Host "`nTotal de pruebas: $($resultados.Count)" -ForegroundColor Cyan
Write-Host "Pruebas exitosas: $exitosos" -ForegroundColor Green
Write-Host "Pruebas fallidas: $fallidos" -ForegroundColor $colorResumen
Write-Host "=======================================`n" -ForegroundColor Cyan 
# Script para probar la conexión WebSocket y recibir notificaciones en tiempo real
# Requiere el módulo WebSocket-Client que debe instalarse previamente con:
# Install-Module -Name WebSocket-Client -Scope CurrentUser -Force

param (
    [int]$tiempoEscucha = 30  # Tiempo en segundos que el script escuchará por notificaciones
)

$baseUrl = "http://localhost:5021/api"
$wsUrl = "ws://localhost:5021/ws"

Write-Host "===== Probando conexión WebSocket para notificaciones en tiempo real ====="

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
    
    # Verificar si el módulo WebSocket-Client está instalado
    if (-not (Get-Module -ListAvailable -Name WebSocket-Client)) {
        Write-Host "`nEl módulo WebSocket-Client no está instalado." -ForegroundColor Yellow
        Write-Host "Para instalarlo, ejecute el siguiente comando:" -ForegroundColor Yellow
        Write-Host "Install-Module -Name WebSocket-Client -Scope CurrentUser -Force" -ForegroundColor Yellow
        Write-Host "`nAlternativamente, puede usar el siguiente comando para probar la conexión WebSocket:" -ForegroundColor Yellow
        Write-Host "wscat -c '$wsUrl' -H 'Authorization: Bearer $token'" -ForegroundColor Yellow
        exit
    }
    
    # Conectar al WebSocket
    Write-Host "`nConectando al WebSocket en $wsUrl..."
    $wsConnection = New-WebSocketClient -Uri $wsUrl
    
    # Agregar el token de autenticación a los headers
    $wsConnection.Headers.Add("Authorization", "Bearer $token")
    
    # Conectar
    $wsConnection.Connect()
    
    if ($wsConnection.State -eq "Open") {
        Write-Host "Conexión WebSocket establecida correctamente!" -ForegroundColor Green
        
        # Registrar evento para mensajes recibidos
        Register-ObjectEvent -InputObject $wsConnection -EventName MessageReceived -Action {
            $message = $Event.SourceEventArgs.Message
            Write-Host "`n[$(Get-Date)] Mensaje recibido:" -ForegroundColor Cyan
            Write-Host $message -ForegroundColor Cyan
            
            # Intentar parsear el mensaje como JSON
            try {
                $jsonMessage = $message | ConvertFrom-Json
                Write-Host "Tipo de notificación: $($jsonMessage.type)" -ForegroundColor Cyan
                Write-Host "Datos: $($jsonMessage.data | ConvertTo-Json)" -ForegroundColor Cyan
            } catch {
                Write-Host "El mensaje no es un JSON válido" -ForegroundColor Yellow
            }
        }
        
        # Registrar evento para errores
        Register-ObjectEvent -InputObject $wsConnection -EventName Error -Action {
            $errorMsg = $Event.SourceEventArgs.Exception.Message
            Write-Host "`n[$(Get-Date)] Error en WebSocket: $errorMsg" -ForegroundColor Red
        }
        
        # Registrar evento para cierre de conexión
        Register-ObjectEvent -InputObject $wsConnection -EventName Closed -Action {
            Write-Host "`n[$(Get-Date)] Conexión WebSocket cerrada" -ForegroundColor Yellow
        }
        
        # Enviar un mensaje de prueba
        $testMessage = @{
            type = "ping"
            data = @{
                timestamp = (Get-Date).ToString("o")
            }
        } | ConvertTo-Json
        
        Write-Host "`nEnviando mensaje de prueba: $testMessage"
        $wsConnection.Send($testMessage)
        
        # Esperar por notificaciones durante el tiempo especificado
        Write-Host "`nEscuchando notificaciones durante $tiempoEscucha segundos..."
        Write-Host "Mientras tanto, puede crear, confirmar o cancelar citas en otra ventana para generar notificaciones."
        
        # Esperar
        Start-Sleep -Seconds $tiempoEscucha
        
        # Cerrar conexión
        Write-Host "`nCerrando conexión WebSocket..."
        $wsConnection.Close()
        
        # Desregistrar eventos
        Get-EventSubscriber | Unregister-Event
        
        Write-Host "Prueba de WebSocket completada." -ForegroundColor Green
    } else {
        Write-Host "No se pudo establecer la conexión WebSocket. Estado: $($wsConnection.State)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error general: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "StatusCode: $statusCode" -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta: $responseBody" -ForegroundColor Red
        $reader.Close()
    }
} 
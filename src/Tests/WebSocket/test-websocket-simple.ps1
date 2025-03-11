# Script para probar la conexión WebSocket de manera simple
# Este script no establece una conexión WebSocket real, pero proporciona instrucciones
# para probar la conexión usando herramientas externas como wscat o un navegador web

$baseUrl = "http://localhost:5021/api"
$wsUrl = "ws://localhost:5021/ws"

Write-Host "===== Instrucciones para probar la conexión WebSocket ====="

# Primero obtener un token de autenticación
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "`nObteniendo token de autenticación..."
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    
    Write-Host "Token obtenido correctamente!" -ForegroundColor Green
    
    # Mostrar instrucciones para probar con wscat
    Write-Host "`n1. Usando wscat (si está instalado):" -ForegroundColor Yellow
    Write-Host "Ejecute el siguiente comando en una terminal:" -ForegroundColor Yellow
    Write-Host "wscat -c '$wsUrl' -H 'Authorization: Bearer $token'" -ForegroundColor Cyan
    
    # Mostrar instrucciones para probar con un navegador
    Write-Host "`n2. Usando un navegador web:" -ForegroundColor Yellow
    Write-Host "Abra la consola de desarrollador (F12) y ejecute el siguiente código JavaScript:" -ForegroundColor Yellow
    
    $jsCode = @"
// Crear una conexión WebSocket
const socket = new WebSocket('$wsUrl');

// Agregar el token de autenticación en el evento de apertura
socket.addEventListener('open', function (event) {
    console.log('Conexión WebSocket establecida');
    
    // Enviar el token como primer mensaje (depende de cómo esté implementado el servidor)
    socket.send(JSON.stringify({
        type: 'auth',
        token: '$token'
    }));
    
    // Enviar un mensaje de prueba
    socket.send(JSON.stringify({
        type: 'ping',
        data: {
            timestamp: new Date().toISOString()
        }
    }));
});

// Escuchar por mensajes
socket.addEventListener('message', function (event) {
    console.log('Mensaje recibido del servidor:', event.data);
    try {
        const data = JSON.parse(event.data);
        console.log('Datos parseados:', data);
    } catch (e) {
        console.log('El mensaje no es un JSON válido');
    }
});

// Escuchar por errores
socket.addEventListener('error', function (event) {
    console.error('Error en la conexión WebSocket:', event);
});

// Escuchar por cierre de conexión
socket.addEventListener('close', function (event) {
    console.log('Conexión WebSocket cerrada:', event.code, event.reason);
});
"@
    
    Write-Host $jsCode -ForegroundColor Cyan
    
    # Mostrar instrucciones para probar con curl (para verificar el endpoint, no para WebSocket)
    Write-Host "`n3. Verificar que el endpoint WebSocket existe (usando curl):" -ForegroundColor Yellow
    Write-Host "curl -v $wsUrl" -ForegroundColor Cyan
    Write-Host "Nota: Esto solo verificará que el endpoint existe, no establecerá una conexión WebSocket." -ForegroundColor Yellow
    
    # Mostrar instrucciones para probar con Postman
    Write-Host "`n4. Usando Postman:" -ForegroundColor Yellow
    Write-Host "- Abra Postman y cree una nueva solicitud de tipo 'WebSocket Request'" -ForegroundColor Yellow
    Write-Host "- Ingrese la URL: $wsUrl" -ForegroundColor Cyan
    Write-Host "- En la pestaña 'Headers', agregue:" -ForegroundColor Yellow
    Write-Host "  Authorization: Bearer $token" -ForegroundColor Cyan
    Write-Host "- Haga clic en 'Connect' para establecer la conexión" -ForegroundColor Yellow
    Write-Host "- Una vez conectado, puede enviar mensajes como:" -ForegroundColor Yellow
    Write-Host "  {" -ForegroundColor Cyan
    Write-Host "    \"type\": \"ping\"," -ForegroundColor Cyan
    Write-Host "    \"data\": {" -ForegroundColor Cyan
    Write-Host "      \"timestamp\": \"$(Get-Date -Format o)\"" -ForegroundColor Cyan
    Write-Host "    }" -ForegroundColor Cyan
    Write-Host "  }" -ForegroundColor Cyan
    
    # Guardar el token en un archivo para facilitar su uso
    $tokenFile = "websocket-token.txt"
    $token | Out-File -FilePath $tokenFile
    Write-Host "`nEl token ha sido guardado en el archivo '$tokenFile' para facilitar su uso." -ForegroundColor Green
    
} catch {
    Write-Host "Error al obtener el token de autenticación: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "StatusCode: $statusCode" -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta: $responseBody" -ForegroundColor Red
        $reader.Close()
    }
} 
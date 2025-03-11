# Script para crear una cita de ejemplo y confirmarla

$baseUrl = "http://localhost:5021/api"
$loginUrl = "$baseUrl/Auth/login"

# 1. Obtener token de autenticación
$loginData = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "1. Autenticando como admin..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $loginUrl -Method Post -ContentType "application/json" -Body $loginData
    $token = $response.token
    Write-Host "Autenticación exitosa" -ForegroundColor Green
} catch {
    Write-Host "Error en autenticación: $_" -ForegroundColor Red
    exit
}

# Función para invocar un endpoint
function Invoke-ApiEndpoint {
    param (
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    Write-Host "`n$Name" -ForegroundColor Cyan
    Write-Host "URL: $Url" -ForegroundColor Gray
    Write-Host "Method: $Method" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
        }
        
        if ($Body -ne $null) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $params.Add("Body", $jsonBody)
            Write-Host "Body: $jsonBody" -ForegroundColor Gray
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "Respuesta exitosa" -ForegroundColor Green
        
        return $response
    } catch {
        Write-Host "Error en la solicitud: $_" -ForegroundColor Red
        return $null
    }
}

# 2. Crear una cita para hoy (ahora + 2 horas)
$ahora = Get-Date
$horaCita = $ahora.AddHours(2)

$citaData = @{
    patientName = "Paciente Ejemplo"
    contactPhone = "666777888"
    email = "ejemplo@correo.com"
    appointmentDateTime = $horaCita.ToString("o")
    durationMinutes = 30
    treatmentType = "revision"
    isConfirmed = $false
    notes = "Cita de ejemplo creada por script"
    status = "Programada"
}

Write-Host "2. Creando cita de ejemplo para hoy a las $($horaCita.ToString('HH:mm'))" -ForegroundColor Cyan
$cita = Invoke-ApiEndpoint -Name "Crear cita" -Url "$baseUrl/Appointments" -Method "POST" -Body $citaData

if ($cita -eq $null) {
    Write-Host "No se pudo crear la cita" -ForegroundColor Red
    exit
}

Write-Host "Cita creada con ID: $($cita.id)" -ForegroundColor Green

# 3. Esperar 3 segundos
Write-Host "Esperando 3 segundos antes de confirmar..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 4. Confirmar la cita creada
Write-Host "3. Confirmando la cita..." -ForegroundColor Cyan
$confirmacion = Invoke-ApiEndpoint -Name "Confirmar cita" -Url "$baseUrl/Appointments/$($cita.id)/Confirm" -Method "PUT"

if ($confirmacion -eq $null) {
    Write-Host "No se pudo confirmar la cita" -ForegroundColor Red
    exit
}

Write-Host "Cita confirmada correctamente" -ForegroundColor Green

# 5. Mostrar mensaje final
Write-Host "`nOperación completada correctamente!" -ForegroundColor Green
Write-Host "Ahora puedes verificar en el dashboard de administración que:" -ForegroundColor White
Write-Host "1. La cita aparece en el calendario" -ForegroundColor White
Write-Host "2. Hay una entrada en el historial" -ForegroundColor White 
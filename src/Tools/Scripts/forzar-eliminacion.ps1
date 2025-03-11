# FORZAR ELIMINACIÓN DE CITA
# Este script es la "opción nuclear" para eliminar una cita que se niega a desaparecer

param(
    [Parameter(Mandatory=$true)]
    [int]$IdCita
)

Write-Host "========= FORZAR ELIMINACIÓN TOTAL =========" -ForegroundColor Red
Write-Host "Este script eliminará COMPLETAMENTE la cita $IdCita de todos los sistemas" -ForegroundColor Red
Write-Host ""

# Opciones de confirmación
$opciones = [System.Management.Automation.Host.ChoiceDescription[]] @(
    [System.Management.Automation.Host.ChoiceDescription]::new("&Sí", "Eliminar permanentemente la cita"),
    [System.Management.Automation.Host.ChoiceDescription]::new("&No", "Cancelar la operación")
)

# Pedir confirmación
$resultado = $host.UI.PromptForChoice("CONFIRMACIÓN", "¿Estás ABSOLUTAMENTE SEGURO de que quieres eliminar permanentemente esta cita?", $opciones, 1)

if ($resultado -eq 1) {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit
}

Write-Host "Iniciando secuencia de eliminación forzada..." -ForegroundColor Cyan

# 1. Intentar eliminar vía API
Write-Host "1. Intentando eliminar vía API..." -ForegroundColor Cyan
try {
    # Obtener un token de autenticación primero
    $loginData = @{
        username = "admin"
        password = "admin"
    } | ConvertTo-Json

    $authResponse = Invoke-RestMethod -Uri "http://localhost:5021/api/Auth/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $authResponse.token

    Write-Host "   Token obtenido: $($token.Substring(0, 15))..." -ForegroundColor Green

    # Intentar DELETE con el token
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:5021/api/Appointments/$IdCita" -Method Delete -Headers @{
        Authorization = "Bearer $token"
    } -ErrorAction SilentlyContinue

    Write-Host "   Solicitud DELETE enviada correctamente" -ForegroundColor Green
}
catch {
    Write-Host "   Error al usar la API: $_" -ForegroundColor Yellow
    Write-Host "   Continuando con eliminación directa..." -ForegroundColor Yellow
}

# 2. Eliminar directamente del archivo JSON
Write-Host "2. Eliminando directamente del archivo JSON..." -ForegroundColor Cyan
try {
    $dataDir = "src/Server/API/Data"
    $appointmentsFile = "$dataDir/appointments.json"

    if (Test-Path $appointmentsFile) {
        # Hacer una copia de seguridad
        Copy-Item $appointmentsFile "$appointmentsFile.bak" -Force
        Write-Host "   Copia de seguridad creada en $appointmentsFile.bak" -ForegroundColor Green

        # Leer el archivo
        $jsonContent = Get-Content $appointmentsFile -Raw | ConvertFrom-Json
        $initialCount = $jsonContent.Length
        Write-Host "   Citas antes: $initialCount" -ForegroundColor Yellow

        # Filtrar para eliminar la cita con el ID especificado
        $filteredAppointments = $jsonContent | Where-Object { $_.Id -ne $IdCita }
        $finalCount = $filteredAppointments.Length

        # Guardar el archivo filtrado
        $filteredAppointments | ConvertTo-Json -Depth 10 | Set-Content $appointmentsFile -Force

        if ($initialCount -eq $finalCount) {
            Write-Host "   No se encontró la cita con ID $IdCita en el archivo" -ForegroundColor Yellow
        } else {
            Write-Host "   ÉXITO: Cita eliminada del JSON. Citas restantes: $finalCount" -ForegroundColor Green
        }
    } else {
        Write-Host "   Archivo de citas no encontrado en: $appointmentsFile" -ForegroundColor Red
    }
}
catch {
    Write-Host "   Error al manipular archivo JSON: $_" -ForegroundColor Red
}

# 3. Eliminar de Firebase
Write-Host "3. Eliminando de Firebase..." -ForegroundColor Cyan
try {
    $firebaseUrl = "https://psep-d6a75-default-rtdb.europe-west1.firebasedatabase.app"
    $apiKey = "AIzaSyDMu2FOHNOXwcwXh_SK7fXo8wyx83nx340"

    # Obtener todas las citas para encontrar la clave
    $response = Invoke-RestMethod -Uri "$firebaseUrl/appointments.json?auth=$apiKey" -Method Get -ErrorAction SilentlyContinue

    # Buscar la cita por su ID
    $firebaseKey = $null
    foreach ($key in $response.PSObject.Properties.Name) {
        if ($response.$key.Id -eq $IdCita) {
            $firebaseKey = $key
            break
        }
    }

    if ($firebaseKey) {
        Write-Host "   Encontrada cita en Firebase con clave: $firebaseKey" -ForegroundColor Green

        # Eliminar la cita
        $deleteResponse = Invoke-RestMethod -Uri "$firebaseUrl/appointments/$firebaseKey.json?auth=$apiKey" -Method Delete
        Write-Host "   ÉXITO: Cita eliminada de Firebase" -ForegroundColor Green
    }
    else {
        Write-Host "   No se encontró la cita con ID $IdCita en Firebase" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   Error al eliminar de Firebase: $_" -ForegroundColor Red
}

# 4. Agregar entrada al historial para documentar
Write-Host "4. Registrando la eliminación forzada en el historial..." -ForegroundColor Cyan
try {
    $historyFile = "src/Server/API/Data/appointment_history.json"
    
    if (Test-Path $historyFile) {
        $history = Get-Content $historyFile -Raw | ConvertFrom-Json
        if (-not $history) { $history = @() }
        
        $historyEntry = @{
            "Id" = [Guid]::NewGuid().ToString()
            "AppointmentId" = $IdCita
            "PatientName" = "ELIMINACIÓN FORZADA"
            "Timestamp" = (Get-Date).ToString("o")
            "Action" = "ELIMINACIÓN EXTREMA FORZADA"
        }
        
        $history += $historyEntry
        $history | ConvertTo-Json -Depth 10 | Set-Content $historyFile -Force
        
        Write-Host "   Registro agregado al historial local" -ForegroundColor Green
        
        # También agregar a Firebase
        $null = Invoke-RestMethod -Uri "$firebaseUrl/appointmentHistory.json?auth=$apiKey" -Method Post -Body ($historyEntry | ConvertTo-Json) -ContentType "application/json"
        Write-Host "   Registro agregado al historial de Firebase" -ForegroundColor Green
    }
    else {
        Write-Host "   Archivo de historial no encontrado" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   Error al registrar en historial: $_" -ForegroundColor Red
}

# 5. Recomendar reiniciar el servidor
Write-Host "`n========= ELIMINACIÓN COMPLETADA =========" -ForegroundColor Green
Write-Host "La cita con ID $IdCita ha sido eliminada mediante fuerza bruta." -ForegroundColor Green
Write-Host "`nRECOMENDACIÓN: Reinicia el servidor para asegurar que los cambios surtan efecto." -ForegroundColor Yellow
Write-Host "Ejecuta: cd src/Server/API; dotnet run --project ServerAPI.csproj" -ForegroundColor Yellow 
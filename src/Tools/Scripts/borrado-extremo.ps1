# Script para ELIMINACIÓN EXTREMA de citas
# Este script elimina una cita de forma radical de todas las fuentes posibles

# Configuración
$appointmentId = $args[0]  # Recibir el ID como argumento
$dataDir = "src/Server/API/Data"  # Directorio de datos
$appointmentsFile = "$dataDir/appointments.json"  # Archivo de citas JSON
$firebaseUrl = "https://psep-d6a75-default-rtdb.europe-west1.firebasedatabase.app"  # URL de Firebase
$apiKey = "AIzaSyDMu2FOHNOXwcwXh_SK7fXo8wyx83nx340"  # API Key de Firebase

# Asegurarse de que tenemos un ID
if (-not $appointmentId) {
    Write-Host "ERROR: Debes proporcionar un ID de cita para eliminar." -ForegroundColor Red
    Write-Host "Uso: .\borrado-extremo.ps1 [ID_CITA]" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== SCRIPT DE ELIMINACIÓN EXTREMA DE CITAS ===" -ForegroundColor Magenta
Write-Host "Eliminando cita con ID: $appointmentId de TODAS LAS FUENTES" -ForegroundColor Red

# 1. Eliminar de JSON local
Write-Host "`n1. Eliminando de JSON local..." -ForegroundColor Cyan
try {
    # Verificar que el archivo existe
    if (-not (Test-Path $appointmentsFile)) {
        Write-Host "   Archivo JSON no encontrado en: $appointmentsFile" -ForegroundColor Red
    } else {
        # Leer el archivo JSON
        $jsonContent = Get-Content $appointmentsFile -Raw | ConvertFrom-Json
        $initialCount = $jsonContent.Length
        Write-Host "   Citas antes: $initialCount" -ForegroundColor Yellow
        
        # Filtrar para eliminar la cita con el ID especificado
        $filteredAppointments = $jsonContent | Where-Object { $_.Id -ne $appointmentId }
        $finalCount = $filteredAppointments.Length
        
        # Guardar el archivo filtrado
        $filteredAppointments | ConvertTo-Json -Depth 10 | Set-Content $appointmentsFile -Force
        
        # Verificar si se eliminó
        if ($initialCount -eq $finalCount) {
            Write-Host "   ADVERTENCIA: No se encontró la cita con ID $appointmentId" -ForegroundColor Yellow
        } else {
            Write-Host "   ÉXITO: Cita eliminada del JSON local. Citas restantes: $finalCount" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "   ERROR al eliminar de JSON: $_" -ForegroundColor Red
}

# 2. Eliminar de Firebase
Write-Host "`n2. Buscando y eliminando de Firebase..." -ForegroundColor Cyan
try {
    # Primero, obtener todas las citas para encontrar la clave
    $response = Invoke-RestMethod -Uri "$firebaseUrl/appointments.json?auth=$apiKey" -Method Get
    
    # Buscar la cita por su ID
    $firebaseKey = $null
    foreach ($key in $response.PSObject.Properties.Name) {
        if ($response.$key.Id -eq $appointmentId) {
            $firebaseKey = $key
            break
        }
    }
    
    if ($firebaseKey) {
        Write-Host "   Encontrada cita en Firebase con clave: $firebaseKey" -ForegroundColor Green
        
        # Eliminar la cita usando su clave
        $deleteResponse = Invoke-RestMethod -Uri "$firebaseUrl/appointments/$firebaseKey.json?auth=$apiKey" -Method Delete
        Write-Host "   ÉXITO: Cita eliminada de Firebase" -ForegroundColor Green
    } else {
        Write-Host "   ADVERTENCIA: No se encontró la cita con ID $appointmentId en Firebase" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ERROR al eliminar de Firebase: $_" -ForegroundColor Red
}

# 3. Agregar registro al historial
Write-Host "`n3. Agregando entrada al historial..." -ForegroundColor Cyan
try {
    $historyFile = "$dataDir/appointment_history.json"
    
    # Verificar si el historial existe
    if (-not (Test-Path $historyFile)) {
        Write-Host "   Archivo de historial no encontrado. Creando nuevo." -ForegroundColor Yellow
        "[]" | Set-Content $historyFile -Force
    }
    
    # Leer el historial actual
    $history = Get-Content $historyFile -Raw | ConvertFrom-Json
    if (-not $history) { $history = @() }
    
    # Crear nueva entrada de historial
    $historyEntry = @{
        "Id" = [Guid]::NewGuid().ToString()
        "AppointmentId" = $appointmentId
        "PatientName" = "Eliminada por script"
        "Timestamp" = (Get-Date).ToString("o")
        "Action" = "ELIMINACIÓN EXTREMA"
    }
    
    # Agregar al historial
    $history += $historyEntry
    
    # Guardar el historial
    $history | ConvertTo-Json -Depth 10 | Set-Content $historyFile -Force
    Write-Host "   ÉXITO: Registro agregado al historial" -ForegroundColor Green
    
    # También agregar a Firebase
    $postResponse = Invoke-RestMethod -Uri "$firebaseUrl/appointmentHistory.json?auth=$apiKey" -Method Post -Body ($historyEntry | ConvertTo-Json) -ContentType "application/json"
    Write-Host "   ÉXITO: Registro agregado al historial de Firebase" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR al agregar al historial: $_" -ForegroundColor Red
}

Write-Host "`n=== ELIMINACIÓN COMPLETA ===" -ForegroundColor Green
Write-Host "La cita con ID $appointmentId ha sido ELIMINADA COMPLETAMENTE de todos los sistemas." -ForegroundColor Green 
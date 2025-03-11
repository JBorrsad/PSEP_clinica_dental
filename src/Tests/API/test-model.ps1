# Script para probar el modelo de datos
$token = Get-Content -Path "auth_token.txt" -Raw

if (-not $token) {
    Write-Host "No se encontró el token. Ejecute primero test-login.ps1"
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$baseUrl = "http://localhost:5021/api"

# Función para obtener datos de un endpoint
function Get-ApiData {
    param (
        [string]$Endpoint,
        [string]$Description
    )
    
    Write-Host "`n===== $Description ====="
    try {
        $url = "$baseUrl/$Endpoint"
        Write-Host "URL: $url"
        
        $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
        return $response
    } catch {
        Write-Host "Error al obtener datos: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Respuesta: $responseBody" -ForegroundColor Red
            $reader.Close()
        }
        return $null
    }
}

# Función para analizar la estructura de un objeto
function Analyze-Structure {
    param (
        [object]$Data,
        [string]$Name,
        [int]$MaxItems = 3
    )
    
    Write-Host "`n===== Análisis de estructura: $Name ====="
    
    if ($null -eq $Data) {
        Write-Host "Los datos son nulos" -ForegroundColor Red
        return
    }
    
    if ($Data -is [array]) {
        $count = $Data.Count
        Write-Host "Tipo: Array con $count elementos"
        
        if ($count -gt 0) {
            $sample = if ($count -gt $MaxItems) { $Data[0..($MaxItems-1)] } else { $Data }
            
            foreach ($item in $sample) {
                Write-Host "`nElemento de muestra:"
                $item | Format-List
                
                Write-Host "Propiedades:"
                $item.PSObject.Properties | ForEach-Object {
                    $propName = $_.Name
                    $propValue = $_.Value
                    $propType = if ($null -eq $propValue) { "null" } else { $propValue.GetType().Name }
                    
                    Write-Host "  - $propName : $propType = $propValue"
                }
                
                break  # Solo mostrar el primer elemento
            }
        } else {
            Write-Host "El array está vacío" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Tipo: Objeto individual"
        Write-Host "Propiedades:"
        $Data.PSObject.Properties | ForEach-Object {
            $propName = $_.Name
            $propValue = $_.Value
            $propType = if ($null -eq $propValue) { "null" } else { $propValue.GetType().Name }
            
            Write-Host "  - $propName : $propType = $propValue"
        }
    }
}

# Obtener y analizar datos de citas
$appointments = Get-ApiData -Endpoint "Appointments" -Description "Todas las citas"
Analyze-Structure -Data $appointments -Name "Appointments"

# Obtener y analizar datos de citas pendientes
$pendingAppointments = Get-ApiData -Endpoint "Appointments/Pending" -Description "Citas pendientes"
Analyze-Structure -Data $pendingAppointments -Name "PendingAppointments"

# Obtener y analizar datos de historial
$history = Get-ApiData -Endpoint "Appointments/History" -Description "Historial de citas"
Analyze-Structure -Data $history -Name "History"

# Comparar estructuras
Write-Host "`n===== Comparación de estructuras ====="

if ($appointments -and $appointments.Count -gt 0 -and $pendingAppointments -and $pendingAppointments.Count -gt 0) {
    Write-Host "Comparando Appointments vs PendingAppointments:"
    
    $appointmentProps = $appointments[0].PSObject.Properties.Name
    $pendingProps = $pendingAppointments[0].PSObject.Properties.Name
    
    $missingInPending = $appointmentProps | Where-Object { $_ -notin $pendingProps }
    $extraInPending = $pendingProps | Where-Object { $_ -notin $appointmentProps }
    
    if ($missingInPending) {
        Write-Host "Propiedades en Appointments pero no en PendingAppointments:" -ForegroundColor Yellow
        $missingInPending | ForEach-Object { Write-Host "  - $_" }
    }
    
    if ($extraInPending) {
        Write-Host "Propiedades en PendingAppointments pero no en Appointments:" -ForegroundColor Yellow
        $extraInPending | ForEach-Object { Write-Host "  - $_" }
    }
    
    if (-not $missingInPending -and -not $extraInPending) {
        Write-Host "Las estructuras son idénticas" -ForegroundColor Green
    }
}

if ($appointments -and $appointments.Count -gt 0 -and $history -and $history.Count -gt 0) {
    Write-Host "`nComparando Appointments vs History:"
    
    $appointmentProps = $appointments[0].PSObject.Properties.Name
    $historyProps = $history[0].PSObject.Properties.Name
    
    $missingInHistory = $appointmentProps | Where-Object { $_ -notin $historyProps }
    $extraInHistory = $historyProps | Where-Object { $_ -notin $appointmentProps }
    
    if ($missingInHistory) {
        Write-Host "Propiedades en Appointments pero no en History:" -ForegroundColor Yellow
        $missingInHistory | ForEach-Object { Write-Host "  - $_" }
    }
    
    if ($extraInHistory) {
        Write-Host "Propiedades en History pero no en Appointments:" -ForegroundColor Yellow
        $extraInHistory | ForEach-Object { Write-Host "  - $_" }
    }
    
    if (-not $missingInHistory -and -not $extraInHistory) {
        Write-Host "Las estructuras son idénticas" -ForegroundColor Green
    }
} 
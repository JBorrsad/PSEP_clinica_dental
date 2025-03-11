# Script para inspeccionar la estructura de los datos del historial de citas
$baseUrl = "http://localhost:5021/api"

Write-Host "===== Inspeccionando estructura de datos del historial de citas ====="

# Obtener token de autenticación
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    Write-Host "Token obtenido correctamente" -ForegroundColor Green
    
    # Crear headers con el token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # Obtener historial de citas
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method GET -Headers $authHeaders
    
    # Mostrar información sobre la estructura
    Write-Host "`nTipo de datos de la respuesta: $($historyResponse.GetType().FullName)"
    Write-Host "Cantidad de elementos: $($historyResponse.Count)"
    
    if ($historyResponse.Count -gt 0) {
        Write-Host "`nPropiedades del primer elemento:"
        $firstItem = $historyResponse[0]
        $properties = $firstItem | Get-Member -MemberType Properties | Select-Object -ExpandProperty Name
        
        Write-Host "Propiedades disponibles: $($properties -join ', ')"
        
        Write-Host "`nValores del primer elemento:"
        foreach ($prop in $properties) {
            $value = $firstItem.$prop
            Write-Host "$prop = $value"
        }
        
        # Convertir a JSON para ver la estructura completa
        Write-Host "`nEstructura JSON del primer elemento:"
        $firstItem | ConvertTo-Json
    } else {
        Write-Host "No hay elementos en el historial" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} 
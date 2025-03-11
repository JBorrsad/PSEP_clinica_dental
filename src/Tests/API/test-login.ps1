# Script para probar el login y obtener un token
$loginUrl = "http://localhost:5021/api/Auth/login"
$credentials = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Write-Host "Intentando login con usuario: admin"
try {
    $response = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $credentials -ContentType "application/json"
    Write-Host "Login exitoso!"
    Write-Host "Token obtenido: $($response.token)"
    
    # Guardar el token para usarlo en otras pruebas
    $response.token | Out-File -FilePath "auth_token.txt"
    
    # Probar validación del token
    $validateUrl = "http://localhost:5021/api/Auth/validate"
    $validateBody = @{
        token = $response.token
    } | ConvertTo-Json
    
    Write-Host "`nValidando token..."
    $validateResponse = Invoke-RestMethod -Uri $validateUrl -Method Post -Body $validateBody -ContentType "application/json"
    Write-Host "Respuesta de validación: $($validateResponse | ConvertTo-Json)"
} catch {
    Write-Host "Error al hacer login: $_"
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "StatusDescription: $($_.Exception.Response.StatusDescription)"
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta: $responseBody"
        $reader.Close()
    }
} 
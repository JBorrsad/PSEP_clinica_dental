# Script para iniciar la aplicación de Clínica Dental
# Este script inicia el servidor API, abre el cliente web y el cliente de consola

$ErrorActionPreference = "Stop"

# Definir rutas de los proyectos
$serverPath = "src\Server\API"
$consolePath = "src\Clients\ConsoleClient"
$solutionPath = "src\ClinicaDental.sln"

# URLs de acceso
$apiUrl = "http://localhost:5021/swagger"
$webClientUrl = "http://localhost:5021/index.html"
$adminUrl = "http://localhost:5021/admin/index.html"

# Colores para los mensajes
function Write-ColorOutput($ForegroundColor) {
    # Guardar el color original
    $originalForegroundColor = $host.UI.RawUI.ForegroundColor
    
    # Establecer el nuevo color
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    
    # Escribir el resto de los argumentos
    if ($args) {
        Write-Output $args
    }
    
    # Restaurar el color original
    $host.UI.RawUI.ForegroundColor = $originalForegroundColor
}

# Verificar si los proyectos existen
if (-not (Test-Path $serverPath)) {
    Write-ColorOutput "Red" "Error: No se encuentra la carpeta del servidor en $serverPath"
    exit 1
}

if (-not (Test-Path $consolePath)) {
    Write-ColorOutput "Red" "Error: No se encuentra la carpeta del cliente de consola en $consolePath"
    exit 1
}

# Compilar la solución
Write-ColorOutput "Cyan" "Compilando la solución..."
try {
    dotnet build $solutionPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Red" "Error al compilar la solución"
        exit 1
    }
} catch {
    Write-ColorOutput "Red" "Error al compilar la solución: $_"
    exit 1
}

# Iniciar el servidor en una nueva ventana
Write-ColorOutput "Green" "Iniciando servidor API..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Iniciando servidor API...' -ForegroundColor Cyan; Set-Location '$($pwd.Path)\$serverPath'; dotnet run"

# Esperar a que el servidor inicie
Write-ColorOutput "Yellow" "Esperando 5 segundos para que el servidor inicie..."
Start-Sleep -Seconds 5

# Abrir el navegador con la aplicación web cliente (calendario)
Write-ColorOutput "Green" "Abriendo cliente web (calendario) en el navegador..."
Start-Process $webClientUrl

# Abrir el panel de administración en otra pestaña
Write-ColorOutput "Green" "Abriendo panel de administración en el navegador..."
Start-Process $adminUrl

# Iniciar el cliente de consola
Write-ColorOutput "Green" "Iniciando cliente de consola..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Iniciando cliente de consola...' -ForegroundColor Cyan; Set-Location '$($pwd.Path)\$consolePath'; dotnet run"

Write-ColorOutput "Green" "¡Aplicación iniciada!"
Write-ColorOutput "Cyan" "URLs disponibles:"
Write-ColorOutput "Cyan" "- API y Swagger: $apiUrl"
Write-ColorOutput "Cyan" "- Cliente Web (Calendario): $webClientUrl"
Write-ColorOutput "Cyan" "- Panel de Administración: $adminUrl"
Write-ColorOutput "Cyan" "- Credenciales de administrador: usuario 'admin', contraseña 'admin'"
Write-ColorOutput "Yellow" "Puede cerrar esta ventana." 
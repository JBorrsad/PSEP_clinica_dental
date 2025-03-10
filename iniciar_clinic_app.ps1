# Script para iniciar la aplicación de Clínica Dental
# Este script inicia tanto el servidor como el cliente de consola

$ErrorActionPreference = "Stop"

# Definir rutas de los proyectos
$serverPath = "src\Server\API"
$consolePath = "src\Clients\ConsoleClient"
$solutionPath = "src\ClinicaDental.sln"

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

# Iniciar el cliente de consola
Write-ColorOutput "Green" "Iniciando cliente de consola..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Iniciando cliente de consola...' -ForegroundColor Cyan; Set-Location '$($pwd.Path)\$consolePath'; dotnet run"

Write-ColorOutput "Green" "¡Aplicación iniciada! Puede cerrar esta ventana." 
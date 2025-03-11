# Script para iniciar la aplicación de Clínica Dental
# Este script inicia el servidor API, abre el cliente web y el cliente de consola

$ErrorActionPreference = "Stop"

# Definir rutas de los proyectos
$serverPath = "src\Server\API"
$consolePath = "src\Clients\ConsoleClient"
$solutionPath = "src\ClinicaDental.sln"

# URLs de acceso
$apiUrl = "http://localhost:5021/swagger"
$webClientUrl = "http://localhost:5021/index.html"  # Calendario para citas
$staffLoginUrl = "http://localhost:5021/admin/index.html" # URL corregida para el panel de administración

# Función para detectar Chrome
function Get-ChromePath {
    $chromePaths = @(
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    return $null
}

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

# Detener cualquier instancia anterior que pueda estar ejecutándose
Write-ColorOutput "Yellow" "Deteniendo instancias anteriores de la aplicación..."
try {
    # Detener cualquier proceso dotnet que pueda estar usando el puerto 5021
    Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match "API" -or $_.CommandLine -match "Server.API" } | Stop-Process -Force
    
    # Esperar un momento para asegurarnos de que los procesos se detengan
    Start-Sleep -Seconds 2
    
    Write-ColorOutput "Green" "Instancias anteriores detenidas correctamente"
} catch {
    Write-ColorOutput "Yellow" "Advertencia al detener instancias anteriores: $_"
}

# Verificar si los proyectos existen
if (-not (Test-Path $serverPath)) {
    Write-ColorOutput "Red" "Error: No se encuentra la carpeta del servidor en $serverPath"
    exit 1
}

if (-not (Test-Path $consolePath)) {
    Write-ColorOutput "Yellow" "Advertencia: No se encuentra la carpeta del cliente de consola en $consolePath"
    # No salimos para permitir que el resto del script funcione
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

# Iniciar el servidor en una nueva ventana pero minimizada
Write-ColorOutput "Green" "Iniciando servidor API..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Iniciando servidor API...' -ForegroundColor Cyan; Set-Location '$($pwd.Path)\$serverPath'; dotnet run" -WindowStyle Minimized

# Esperar a que el servidor inicie
Write-ColorOutput "Yellow" "Esperando 5 segundos para que el servidor inicie..."
Start-Sleep -Seconds 5

# Verificar si Chrome está instalado
$chromePath = Get-ChromePath
if ($null -eq $chromePath) {
    # Si Chrome no está disponible, usar el navegador predeterminado
    Write-ColorOutput "Yellow" "Chrome no encontrado, usando navegador predeterminado..."
    
    # Abrir el calendario en una ventana
    Write-ColorOutput "Green" "Abriendo calendario de citas en el navegador..."
    Start-Process $webClientUrl
    
    # Abrir el login del staff en otra ventana
    Write-ColorOutput "Green" "Abriendo página de login del staff en el navegador..."
    Start-Process $staffLoginUrl
} else {
    # Usar Chrome para abrir ambas páginas
    Write-ColorOutput "Green" "Abriendo páginas en Chrome..."
    
    # Abrir solo dos pestañas: calendario de citas y panel de administración
    Start-Process $chromePath -ArgumentList "--new-window $webClientUrl"
    
    # Esperar un segundo para que Chrome se inicie
    Start-Sleep -Seconds 1
    
    # Abrir login del staff en una nueva pestaña de la misma ventana
    Start-Process $chromePath -ArgumentList "--new-tab $staffLoginUrl"
}

Write-ColorOutput "Green" "¡Aplicación iniciada!"
Write-ColorOutput "Cyan" "URLs disponibles:"
Write-ColorOutput "Cyan" "- Calendario para citas: $webClientUrl"
Write-ColorOutput "Cyan" "- Login del staff: $staffLoginUrl"
Write-ColorOutput "Cyan" "- Credenciales de administrador: usuario 'admin', contraseña 'admin'"
Write-ColorOutput "Yellow" "Puede cerrar esta ventana." 
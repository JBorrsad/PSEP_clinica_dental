# Script para iniciar la aplicación de citas dentales (VERSIÓN MEJORADA)
# Este script detiene cualquier instancia anterior, limpia y reconstruye el proyecto

# Asegurar que se ejecuta con permisos elevados
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "Se recomienda ejecutar este script como administrador para garantizar que todos los procesos puedan ser detenidos."
    Write-Host "Presiona cualquier tecla para continuar de todos modos, o cierra esta ventana y ejecuta como administrador..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Write-Host "=== Iniciando aplicación de gestión de citas ===" -ForegroundColor Cyan

# Verificar que la ruta existe
$apiPath = "C:\Users\juan-\Desktop\PSEP proyecto\API"
if (-not (Test-Path $apiPath)) {
    Write-Host "ERROR: No se encuentra la ruta $apiPath" -ForegroundColor Red
    Write-Host "Por favor, actualiza la ruta en el script para que coincida con tu instalación" -ForegroundColor Red
    exit 1
}

# Navegar a la carpeta del proyecto
Set-Location -Path $apiPath
Write-Host "Ubicación: $pwd" -ForegroundColor Gray

# Paso 1: Detener cualquier proceso previo que pueda estar bloqueando archivos
Write-Host "Deteniendo procesos existentes..." -ForegroundColor Yellow
try {
    # Intentar detener API.exe
    Stop-Process -Name "API" -Force -ErrorAction SilentlyContinue
    Write-Host "  - Procesos API detenidos correctamente" -ForegroundColor Green
} catch {
    Write-Host "  - No se encontraron procesos API ejecutándose" -ForegroundColor Gray
}

# Buscar procesos que puedan estar bloqueando archivos
$blockers = @("vgc")
foreach ($blocker in $blockers) {
    try {
        Stop-Process -Name $blocker -Force -ErrorAction SilentlyContinue
        Write-Host "  - Proceso $blocker detenido" -ForegroundColor Green
    } catch {
        # No hacer nada si no se encuentra
    }
}

# Esperar un momento para que los procesos se liberen
Start-Sleep -Seconds 2

# Paso 2: Eliminar carpetas bin y obj para asegurar una compilación limpia
Write-Host "Limpiando carpetas temporales..." -ForegroundColor Yellow
$binPath = Join-Path -Path $pwd -ChildPath "bin"
$objPath = Join-Path -Path $pwd -ChildPath "obj"

if (Test-Path $binPath) {
    try {
        Remove-Item -Path $binPath -Recurse -Force -ErrorAction Stop
        Write-Host "  - Carpeta bin eliminada" -ForegroundColor Green
    } catch {
        Write-Host "  - No se pudo eliminar la carpeta bin: $_" -ForegroundColor Red
        Write-Host "    Intentando un método alternativo..." -ForegroundColor Yellow
        cmd /c "rd /s /q `"$binPath`""
    }
}

if (Test-Path $objPath) {
    try {
        Remove-Item -Path $objPath -Recurse -Force -ErrorAction Stop
        Write-Host "  - Carpeta obj eliminada" -ForegroundColor Green
    } catch {
        Write-Host "  - No se pudo eliminar la carpeta obj: $_" -ForegroundColor Red
        Write-Host "    Intentando un método alternativo..." -ForegroundColor Yellow
        cmd /c "rd /s /q `"$objPath`""
    }
}

# Paso 3: Limpiar el proyecto
Write-Host "Limpiando el proyecto..." -ForegroundColor Yellow
try {
    $cleanOutput = dotnet clean 2>&1
    Write-Host "  - Proyecto limpiado correctamente" -ForegroundColor Green
} catch {
    Write-Host "  - Error al limpiar el proyecto: $_" -ForegroundColor Red
    Write-Host "    Continuando de todos modos..." -ForegroundColor Yellow
}

# Paso 4: Reconstruir el proyecto
Write-Host "Reconstruyendo el proyecto..." -ForegroundColor Yellow
try {
    $buildOutput = dotnet build 2>&1
    $buildSuccess = $?
    if (-not $buildSuccess) {
        Write-Host "ERROR: La compilación falló" -ForegroundColor Red
        Write-Host $buildOutput
        exit 1
    }
    Write-Host "  - Proyecto reconstruido correctamente" -ForegroundColor Green
} catch {
    Write-Host "ERROR: La compilación falló con excepción: $_" -ForegroundColor Red
    exit 1
}

# Paso 5: Iniciar la aplicación
Write-Host "Iniciando la aplicación..." -ForegroundColor Yellow
Write-Host "La aplicación se iniciará en http://localhost:5021" -ForegroundColor Cyan
Write-Host "  - Para clientes: http://localhost:5021/index.html" -ForegroundColor Cyan
Write-Host "  - Para trabajadores: http://localhost:5021/admin/index.html" -ForegroundColor Cyan
Write-Host "    Usuario: admin" -ForegroundColor Cyan
Write-Host "    Contraseña: admin123" -ForegroundColor Cyan
Write-Host "`nPresiona Ctrl+C para detener la aplicación`n" -ForegroundColor Magenta

# Intentar iniciar la aplicación
try {
    # Abrir el navegador automáticamente
    Start-Process "http://localhost:5021/admin/index.html"
    
    # Iniciar la aplicación
    dotnet run
} catch {
    Write-Host "ERROR al iniciar la aplicación: $_" -ForegroundColor Red
    Write-Host "Intentando ejecutar sin recompilar..." -ForegroundColor Yellow
    dotnet run --no-build
}

# Si llegamos aquí, es porque la aplicación terminó
Write-Host "La aplicación se ha detenido" -ForegroundColor Yellow 
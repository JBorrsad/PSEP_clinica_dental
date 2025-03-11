# Script para iniciar la aplicación de citas dentales
# Este script detiene cualquier instancia anterior, limpia y reconstruye el proyecto

Write-Host "=== Iniciando aplicación de gestión de citas ===" -ForegroundColor Cyan

# Navegar a la carpeta del proyecto
Set-Location -Path "C:\Users\juan-\Desktop\PSEP proyecto\API"
Write-Host "Ubicación: $pwd" -ForegroundColor Gray

# Paso 1: Detener cualquier proceso previo que pueda estar bloqueando archivos
Write-Host "Deteniendo procesos existentes..." -ForegroundColor Yellow
try {
    Stop-Process -Name "API" -Force -ErrorAction SilentlyContinue
    Write-Host "  - Procesos API detenidos correctamente" -ForegroundColor Green
} catch {
    Write-Host "  - No se encontraron procesos API ejecutándose" -ForegroundColor Gray
}

# Paso 2: Eliminar carpetas bin y obj para asegurar una compilación limpia
Write-Host "Limpiando carpetas temporales..." -ForegroundColor Yellow
if (Test-Path ".\bin") {
    Remove-Item -Path ".\bin" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  - Carpeta bin eliminada" -ForegroundColor Green
}
if (Test-Path ".\obj") {
    Remove-Item -Path ".\obj" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  - Carpeta obj eliminada" -ForegroundColor Green
}

# Paso 3: Limpiar el proyecto
Write-Host "Limpiando el proyecto..." -ForegroundColor Yellow
dotnet clean
Write-Host "  - Proyecto limpiado correctamente" -ForegroundColor Green

# Paso 4: Reconstruir el proyecto
Write-Host "Reconstruyendo el proyecto..." -ForegroundColor Yellow
dotnet build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: La compilación falló con código $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Por favor revisa los errores de compilación arriba" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "  - Proyecto reconstruido correctamente" -ForegroundColor Green

# Paso 5: Iniciar la aplicación
Write-Host "Iniciando la aplicación..." -ForegroundColor Yellow
Write-Host "La aplicación se iniciará en http://localhost:5021" -ForegroundColor Cyan
Write-Host "  - Para clientes: http://localhost:5021/index.html" -ForegroundColor Cyan
Write-Host "  - Para trabajadores: http://localhost:5021/admin/index.html" -ForegroundColor Cyan
Write-Host "    Usuario: admin" -ForegroundColor Cyan
Write-Host "    Contraseña: admin123" -ForegroundColor Cyan
Write-Host "`nPresiona Ctrl+C para detener la aplicación`n" -ForegroundColor Magenta

# Iniciar la aplicación
dotnet run

# Si llegamos aquí, es porque la aplicación terminó
Write-Host "La aplicación se ha detenido" -ForegroundColor Yellow 
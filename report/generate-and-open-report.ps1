# Script para generar y abrir el reporte de la API
Write-Host "===== GENERACIÓN Y VISUALIZACIÓN DEL REPORTE DE API =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "------------------------------------------------------"

# Definir la ubicación de los scripts
$generateScript = Join-Path -Path $PSScriptRoot -ChildPath "..\generate-api-report.ps1"
$openScript = Join-Path -Path $PSScriptRoot -ChildPath "..\open-report.ps1"

# Verificar que los scripts existen
if (-not (Test-Path $generateScript)) {
    Write-Host "Error: No se encuentra el script de generación de reporte en: $generateScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $openScript)) {
    Write-Host "Error: No se encuentra el script para abrir el reporte en: $openScript" -ForegroundColor Red
    exit 1
}

# Generar el reporte
Write-Host "`nGenerando el reporte de API..." -ForegroundColor Yellow
try {
    & $generateScript
    Write-Host "Reporte generado exitosamente." -ForegroundColor Green
} catch {
    Write-Host "Error al generar el reporte: $_" -ForegroundColor Red
    exit 1
}

# Preguntar si desea abrir el reporte
Write-Host "`n¿Desea abrir el reporte en el navegador? (S/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Write-Host "`nAbriendo el reporte en el navegador..." -ForegroundColor Yellow
    try {
        & $openScript
        Write-Host "Reporte abierto exitosamente." -ForegroundColor Green
    } catch {
        Write-Host "Error al abrir el reporte: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n===== PROCESO COMPLETADO =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 
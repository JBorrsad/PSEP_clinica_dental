# Script unificado para generar y abrir el informe de API
Write-Host "===== GENERADOR DE INFORME DE API =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "------------------------------------------------------"

# Función para verificar que se puede acceder al servidor (solo informativa)
function Test-ServerAvailability {
    param (
        [string]$baseUrl,
        [int]$timeoutSeconds = 5
    )
    
    try {
        Write-Host "Verificando si el servidor está disponible en $baseUrl..." -ForegroundColor Yellow
        $request = [System.Net.WebRequest]::Create($baseUrl)
        $request.Timeout = $timeoutSeconds * 1000
        $response = $request.GetResponse()
        $response.Close()
        Write-Host "Servidor disponible." -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "El servidor no está disponible. Procediendo de todas formas..." -ForegroundColor Yellow
        Write-Host "Nota: Para obtener datos actualizados, inicie el servidor con: .\iniciar_clinic_app.ps1" -ForegroundColor Yellow
        return $false
    }
}

# Verificar si los scripts necesarios existen
$generateApiReportScript = Join-Path -Path $PSScriptRoot -ChildPath "report\generate-api-report.ps1"
if (-not (Test-Path $generateApiReportScript)) {
    Write-Host "Error: No se encuentra el script para generar el reporte: $generateApiReportScript" -ForegroundColor Red
    exit 1
}

# Verificar que el servidor está disponible (solo informativo)
$baseUrl = "http://localhost:5021/api"
Test-ServerAvailability -baseUrl $baseUrl

# Generar el reporte
Write-Host "`nGenerando el informe de API..." -ForegroundColor Yellow
try {
    & $generateApiReportScript
    
    # Verificar que se generó el archivo
    $reportFile = "report/api-report.html"
    if (Test-Path $reportFile) {
        Write-Host "Informe generado correctamente en: $reportFile" -ForegroundColor Green
        
        # Abrir el informe automáticamente
        Write-Host "Abriendo el informe en el navegador..." -ForegroundColor Green
        
        # Obtener la ruta completa del archivo
        $reportPath = (Get-Item -Path $reportFile).FullName
        
        # Abrir el archivo en el navegador predeterminado
        Start-Process $reportPath
        Write-Host "Informe abierto en el navegador predeterminado." -ForegroundColor Green
    } else {
        Write-Host "Error: No se pudo encontrar el archivo de informe generado." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error al generar el informe: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n===== PROCESO COMPLETADO =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 
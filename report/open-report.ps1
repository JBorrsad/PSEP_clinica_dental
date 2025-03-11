# Script para abrir el informe en el navegador predeterminado
$reportFile = Join-Path -Path $PSScriptRoot -ChildPath "api-report.html"

# Verificar que el archivo existe
if (Test-Path -Path $reportFile) {
    Write-Host "Abriendo el informe en el navegador predeterminado..." -ForegroundColor Green
    
    # Obtener la ruta completa del archivo
    $reportPath = (Get-Item -Path $reportFile).FullName
    
    # Abrir el archivo en el navegador predeterminado
    Start-Process $reportPath
} else {
    Write-Host "El archivo de informe no existe. Ejecute primero el script 'generate-api-report.ps1' para generarlo." -ForegroundColor Red
} 
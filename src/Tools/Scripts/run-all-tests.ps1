# Script maestro para ejecutar todas las pruebas y generar el informe
Write-Host "===== EJECUTANDO TODAS LAS PRUEBAS DE LA API DE CLÍNICA DENTAL =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "------------------------------------------------------"

# Función para ejecutar un script y mostrar su resultado
function Invoke-TestScript {
    param (
        [string]$scriptName,
        [string]$description
    )
    
    Write-Host "`nEjecutando $scriptName..." -ForegroundColor Yellow
    Write-Host "Descripción: $description" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------"
    
    try {
        & ".\$scriptName"
        Write-Host "------------------------------------------------------"
        Write-Host "$scriptName completado correctamente." -ForegroundColor Green
        return $true
    } catch {
        Write-Host "------------------------------------------------------"
        Write-Host "Error al ejecutar $scriptName" -ForegroundColor Red
        return $false
    }
}

# 1. Ejecutar prueba básica
$basicTest = Invoke-TestScript -scriptName "test-api-basic.ps1" -description "Prueba básica de la API"

# 2. Ejecutar prueba de citas pendientes
$pendingTest = Invoke-TestScript -scriptName "test-pending.ps1" -description "Prueba de citas pendientes"

# 3. Ejecutar prueba de historial de citas
$historyTest = Invoke-TestScript -scriptName "test-history.ps1" -description "Prueba de historial de citas"

# 4. Ejecutar prueba de detalles de cita
$detailsTest = Invoke-TestScript -scriptName "test-appointment-details.ps1" -description "Prueba de detalles de cita"

# 5. Generar el informe
$reportGenerated = Invoke-TestScript -scriptName "generate-api-report.ps1" -description "Generación de informe de la API"

# Mostrar resumen
Write-Host "`n===== RESUMEN DE PRUEBAS =====" -ForegroundColor Cyan
Write-Host "Prueba básica: $(if ($basicTest) { 'ÉXITO' } else { 'ERROR' })" -ForegroundColor $(if ($basicTest) { 'Green' } else { 'Red' })
Write-Host "Prueba de citas pendientes: $(if ($pendingTest) { 'ÉXITO' } else { 'ERROR' })" -ForegroundColor $(if ($pendingTest) { 'Green' } else { 'Red' })
Write-Host "Prueba de historial de citas: $(if ($historyTest) { 'ÉXITO' } else { 'ERROR' })" -ForegroundColor $(if ($historyTest) { 'Green' } else { 'Red' })
Write-Host "Prueba de detalles de cita: $(if ($detailsTest) { 'ÉXITO' } else { 'ERROR' })" -ForegroundColor $(if ($detailsTest) { 'Green' } else { 'Red' })
Write-Host "Generación de informe: $(if ($reportGenerated) { 'ÉXITO' } else { 'ERROR' })" -ForegroundColor $(if ($reportGenerated) { 'Green' } else { 'Red' })

# Abrir el informe si se generó correctamente
if ($reportGenerated) {
    Write-Host "`n¿Desea abrir el informe en el navegador? (S/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "S" -or $response -eq "s") {
        & ".\open-report.ps1"
    }
}

Write-Host "`n===== FIN DE LAS PRUEBAS =====" -ForegroundColor Cyan
Write-Host "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 
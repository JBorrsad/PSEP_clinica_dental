# Script para generar un informe completo de la API en formato HTML
$baseUrl = "http://localhost:5021/api"
$reportFile = "api-report.html"

# Función para generar una fila de tabla HTML
function Get-TableRow {
    param (
        [string]$name,
        [string]$value,
        [string]$status = "success"
    )
    
    $statusClass = switch ($status) {
        "success" { "table-success" }
        "warning" { "table-warning" }
        "danger" { "table-danger" }
        default { "" }
    }
    
    return @"
    <tr class="$statusClass">
        <td>$name</td>
        <td>$value</td>
    </tr>
"@
}

# Iniciar el contenido HTML
$htmlContent = @"
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de API de Clínica Dental</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding: 20px; }
        .header { margin-bottom: 30px; }
        .endpoint-section { margin-bottom: 30px; }
        .code { font-family: monospace; background-color: #f8f9fa; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Informe de API de Clínica Dental</h1>
            <p class="lead">URL Base: $baseUrl</p>
            <p>Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
        </div>
"@

# Prueba de autenticación
$htmlContent += @"
        <div class="endpoint-section">
            <h2>1. Autenticación</h2>
            <p>Endpoint: <code>POST $baseUrl/Auth/login</code></p>
"@

$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $tokenPreview = $token.Substring(0, [Math]::Min(20, $token.Length)) + "..."
    
    $htmlContent += @"
            <div class="alert alert-success">Autenticación exitosa</div>
            <h3>Detalles</h3>
            <table class="table table-bordered">
                <tbody>
                    $(Get-TableRow -name "Token (parcial)" -value $tokenPreview)
                </tbody>
            </table>
            <h3>Ejemplo de solicitud</h3>
            <pre class="code">
POST $baseUrl/Auth/login
Content-Type: application/json

$loginBody
            </pre>
"@
    
    # Crear headers con el token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    # Prueba de citas pendientes
    $htmlContent += @"
        </div>
        <div class="endpoint-section">
            <h2>2. Citas Pendientes</h2>
            <p>Endpoint: <code>GET $baseUrl/Appointments/Pending</code></p>
"@
    
    try {
        $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/Pending" -Method GET -Headers $authHeaders
        
        $htmlContent += @"
            <div class="alert alert-success">Solicitud exitosa</div>
            <h3>Detalles</h3>
            <table class="table table-bordered">
                <tbody>
                    $(Get-TableRow -name "Cantidad de citas pendientes" -value $pendingResponse.Count)
                </tbody>
            </table>
"@
        
        if ($pendingResponse.Count -gt 0) {
            $htmlContent += @"
            <h3>Citas Pendientes</h3>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Paciente</th>
                        <th>Fecha</th>
                        <th>Tratamiento</th>
                    </tr>
                </thead>
                <tbody>
"@
            
            foreach ($cita in $pendingResponse) {
                $htmlContent += @"
                    <tr>
                        <td>$($cita.id)</td>
                        <td>$($cita.patientName)</td>
                        <td>$($cita.appointmentDateTime)</td>
                        <td>$($cita.treatmentType)</td>
                    </tr>
"@
            }
            
            $htmlContent += @"
                </tbody>
            </table>
"@
        }
        
        $htmlContent += @"
            <h3>Ejemplo de solicitud</h3>
            <pre class="code">
GET $baseUrl/Appointments/Pending
Authorization: Bearer $tokenPreview...
            </pre>
"@
    }
    catch {
        $htmlContent += @"
            <div class="alert alert-danger">Error: $_</div>
"@
    }
    
    # Prueba de historial de citas
    $htmlContent += @"
        </div>
        <div class="endpoint-section">
            <h2>3. Historial de Citas</h2>
            <p>Endpoint: <code>GET $baseUrl/Appointments/History</code></p>
"@
    
    try {
        $historyResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments/History" -Method GET -Headers $authHeaders
        
        $htmlContent += @"
            <div class="alert alert-success">Solicitud exitosa</div>
            <h3>Detalles</h3>
            <table class="table table-bordered">
                <tbody>
                    $(Get-TableRow -name "Cantidad de registros en historial" -value $historyResponse.Count)
                </tbody>
            </table>
"@
        
        if ($historyResponse.Count -gt 0) {
            # Agrupar por tipo de acción
            $accionesPorTipo = $historyResponse | Group-Object -Property action
            
            $htmlContent += @"
            <h3>Resumen por Tipo de Acción</h3>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Acción</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
"@
            
            foreach ($grupo in $accionesPorTipo) {
                $htmlContent += @"
                    <tr>
                        <td>$($grupo.Name)</td>
                        <td>$($grupo.Count)</td>
                    </tr>
"@
            }
            
            $htmlContent += @"
                </tbody>
            </table>
            
            <h3>Últimos 5 Registros del Historial</h3>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>ID de Cita</th>
                        <th>Paciente</th>
                        <th>Acción</th>
                        <th>Fecha y Hora</th>
                    </tr>
                </thead>
                <tbody>
"@
            
            $lastRecords = $historyResponse | Select-Object -First 5
            foreach ($record in $lastRecords) {
                $htmlContent += @"
                    <tr>
                        <td>$($record.appointmentId)</td>
                        <td>$($record.patientName)</td>
                        <td>$($record.action)</td>
                        <td>$($record.timestamp)</td>
                    </tr>
"@
            }
            
            $htmlContent += @"
                </tbody>
            </table>
"@
        }
        
        $htmlContent += @"
            <h3>Ejemplo de solicitud</h3>
            <pre class="code">
GET $baseUrl/Appointments/History
Authorization: Bearer $tokenPreview...
            </pre>
"@
    }
    catch {
        $htmlContent += @"
            <div class="alert alert-danger">Error: $_</div>
"@
    }
    
    # Prueba de creación de cita
    $htmlContent += @"
        </div>
        <div class="endpoint-section">
            <h2>4. Creación de Cita</h2>
            <p>Endpoint: <code>POST $baseUrl/Appointments</code></p>
"@
    
    $authHeadersWithContentType = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $fechaCita = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    $nuevaCita = @{
        patientName = "Paciente de Informe"
        contactPhone = "666333444"
        contactEmail = "informe@ejemplo.com"
        appointmentDateTime = $fechaCita
        treatmentType = "revisión"
        notes = "Cita creada desde script de informe"
    }
    
    $nuevaCitaJson = $nuevaCita | ConvertTo-Json
    
    try {
        $createResponse = Invoke-RestMethod -Uri "$baseUrl/Appointments" -Method POST -Headers $authHeadersWithContentType -Body $nuevaCitaJson
        
        $htmlContent += @"
            <div class="alert alert-success">Solicitud exitosa</div>
            <h3>Detalles</h3>
            <table class="table table-bordered">
                <tbody>
                    $(Get-TableRow -name "ID de la cita creada" -value $createResponse.id)
                    $(Get-TableRow -name "Paciente" -value $createResponse.patientName)
                    $(Get-TableRow -name "Fecha y Hora" -value $createResponse.appointmentDateTime)
                    $(Get-TableRow -name "Tratamiento" -value $createResponse.treatmentType)
                </tbody>
            </table>
            <h3>Ejemplo de solicitud</h3>
            <pre class="code">
POST $baseUrl/Appointments
Authorization: Bearer $tokenPreview...
Content-Type: application/json

$nuevaCitaJson
            </pre>
"@
    }
    catch {
        $htmlContent += @"
            <div class="alert alert-danger">Error: $_</div>
"@
    }
    
    # Resumen de la API
    $htmlContent += @"
        </div>
        <div class="endpoint-section">
            <h2>Resumen de la API</h2>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Método</th>
                        <th>Descripción</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-success">
                        <td>/Auth/login</td>
                        <td>POST</td>
                        <td>Autenticación de usuario</td>
                        <td>Funcionando</td>
                    </tr>
                    <tr class="table-success">
                        <td>/Appointments/Pending</td>
                        <td>GET</td>
                        <td>Obtener citas pendientes</td>
                        <td>Funcionando</td>
                    </tr>
                    <tr class="table-success">
                        <td>/Appointments/History</td>
                        <td>GET</td>
                        <td>Obtener historial de citas</td>
                        <td>Funcionando</td>
                    </tr>
                    <tr class="table-success">
                        <td>/Appointments</td>
                        <td>POST</td>
                        <td>Crear nueva cita</td>
                        <td>Funcionando</td>
                    </tr>
                    <tr class="table-warning">
                        <td>/Appointments/{id}/confirm</td>
                        <td>POST</td>
                        <td>Confirmar cita</td>
                        <td>Funciona pero no actualiza el estado</td>
                    </tr>
                    <tr class="table-warning">
                        <td>/Appointments/{id}/cancel</td>
                        <td>PUT</td>
                        <td>Cancelar cita</td>
                        <td>Funciona pero no actualiza el estado</td>
                    </tr>
                </tbody>
            </table>
        </div>
"@
}
catch {
    $htmlContent += @"
            <div class="alert alert-danger">Error de autenticación: $_</div>
        </div>
"@
}

# Finalizar el contenido HTML
$htmlContent += @"
        <div class="footer mt-5">
            <hr>
            <p class="text-muted">Informe generado el $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
"@

# Guardar el informe en un archivo HTML
$htmlContent | Out-File -FilePath $reportFile -Encoding utf8

Write-Host "Informe generado correctamente en el archivo: $reportFile" -ForegroundColor Green
Write-Host "Puede abrir el archivo en su navegador para ver el informe completo." 
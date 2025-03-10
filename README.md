# 🦷 Clínica Dental - Sistema de Gestión de Citas

<p align="center">
  <img src="https://img.shields.io/badge/Estado-En%20Desarrollo-brightgreen" alt="Estado del Proyecto">
  <img src="https://img.shields.io/badge/Versión-1.0-blue" alt="Versión">
  <img src="https://img.shields.io/badge/Licencia-MIT-green" alt="Licencia">
</p>

![Arquitectura del Sistema](https://imgur.com/placeholder.png)
*Diagrama de la arquitectura del sistema (por favor, reemplaza este placeholder con tu diagrama real)*

---

## 📋 Índice

1. [Inicio Rápido](#inicio-rápido)
2. [Introducción](#introducción)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Funcionalidades Principales](#funcionalidades-principales)
   - [Comunicaciones por Sockets](#comunicaciones-por-sockets-ra3)
   - [API REST](#api-rest-ra4)
   - [Seguridad](#seguridad-ra5)
6. [Clientes Implementados](#clientes)
7. [Panel de Administración](#panel-de-administración)
8. [Persistencia e Integración con Firebase](#persistencia-e-integración-con-firebase)
9. [Ejecución del Proyecto](#ejecución-del-proyecto)
10. [Demo en Video](#demo-en-video)
11. [Conclusiones](#conclusiones)
12. [Deudas Técnicas](#deudas-técnicas)

---

## Inicio Rápido

Para iniciar rápidamente todo el sistema, he creado un script PowerShell que inicializa todos los componentes con un solo comando:

```powershell
.\iniciar_clinic_app.ps1
```

Este script realiza las siguientes operaciones:
1. Compila la solución completa
2. Inicia el servidor API en una ventana separada
3. Abre automáticamente el calendario para pacientes en el navegador (http://localhost:5021/index.html)
4. Abre el panel de administración en otra pestaña (http://localhost:5021/admin/index.html)
5. Inicia el monitor de operaciones CRUD en una ventana de consola separada

Para acceder al panel de administración, usa las siguientes credenciales:
- **Usuario**: admin
- **Contraseña**: admin

Este script facilita enormemente el proceso de desarrollo y pruebas, permitiendo ver todos los componentes en funcionamiento simultáneamente.

Aquí hay un fragmento relevante del script:

```powershell
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
```

## Introducción

Este proyecto implementa un sistema completo para la gestión de citas en una clínica dental, cumpliendo con los siguientes resultados de aprendizaje:

- **RA3**: Programación de comunicaciones en red utilizando sockets
- **RA4**: Desarrollo de servicios en red mediante API REST
- **RA5**: Protección de aplicaciones y datos mediante técnicas de seguridad

He desarrollado esta aplicación como parte de mi aprendizaje en el módulo de Programación de Servicios y Procesos. El objetivo ha sido crear un sistema real y funcional que aplique los conceptos teóricos vistos en clase.

## Arquitectura del Sistema

El sistema sigue una arquitectura cliente-servidor con varios componentes que se comunican entre sí:

![Diagrama de Arquitectura](https://imgur.com/placeholder.png)
*Imagen ilustrativa de la arquitectura (reemplazar con diagrama real)*

- **Clientes**: Tanto web como consola, que permiten a pacientes y personal gestionar citas
- **Servidor API**: Procesa las peticiones y gestiona la lógica de negocio
- **Servidor de Notificaciones**: Envía actualizaciones en tiempo real mediante sockets
- **Almacenamiento**: Local en JSON y replicación en Firebase
- **Seguridad**: Cifrado asimétrico y registro de operaciones

## Estructura del Proyecto

El proyecto ha sido completamente estructurado siguiendo principios de arquitectura limpia y separación de responsabilidades:

```
PSEP-Proyecto/
├── src/
│   ├── Server/                            # Servidor (API, Sockets, Seguridad)
│   │   ├── API/                           # API REST (RA4)
│   │   │   ├── Controllers/               # Controladores REST
│   │   │   ├── Middleware/                # Middleware de autenticación y logging
│   │   │   └── Program.cs                 # Configuración de la API
│   │   ├── Socket/                        # Servidores de Socket (RA3)
│   │   │   └── NotificationService.cs     # Servicio de notificaciones en tiempo real
│   │   ├── Security/                      # Seguridad (RA5)
│   │   │   ├── Encryption/                # Cifrado asimétrico
│   │   │   ├── Authentication/            # Autenticación JWT
│   │   │   └── Logging/                   # Registro unidireccional
│   │   ├── Data/                          # Capa de datos
│   │   │   ├── Json/                      # Almacenamiento en JSON
│   │   │   └── Firebase/                  # Replicación en Firebase
│   │   └── Models/                        # Modelos de dominio
│   ├── Clients/                           # Clientes
│   │   ├── ConsoleClient/                 # Cliente de consola (antes asyncClient)
│   │   └── WebClient/                     # Cliente web (antes en API/wwwroot)
│   └── Common/                            # Código compartido
└── docs/                                  # Documentación
```

Esta estructura me ha permitido mantener el código organizado y facilitar la implementación de nuevas funcionalidades.

## Funcionalidades Principales

### Comunicaciones por Sockets (RA3)

En esta parte del proyecto, he implementado:

- **Servidor TCP** para notificaciones en tiempo real (puerto 11000)
- **WebSockets** para notificaciones en el navegador
- **Conexiones asíncronas** de múltiples clientes
- **Bloqueo de recursos compartidos** usando ConcurrentDictionary
- **Cifrado asimétrico** en las comunicaciones

Lo más complicado de esta parte fue entender cómo manejar múltiples conexiones simultáneas y cómo implementar correctamente el cifrado RSA. Tuve que investigar bastante sobre cómo intercambiar claves públicas entre cliente y servidor.

```csharp
// Intercambio de claves públicas entre cliente y servidor
private async Task HandleClientConnectionAsync(string clientId, TcpClient client)
{
    try {
        // Configurar stream para comunicación
        var netStream = client.GetStream();
        var reader = new StreamReader(netStream);
        var writer = new StreamWriter(netStream) { AutoFlush = true };
        
        // Enviar la clave pública del servidor
        var serverPublicKey = _encryptionService.GetPublicKey();
        await writer.WriteLineAsync(serverPublicKey);
        
        // Recibir la clave pública del cliente
        var clientPublicKey = await reader.ReadLineAsync();
        if (!string.IsNullOrEmpty(clientPublicKey))
        {
            _clientPublicKeys.TryAdd(clientId, clientPublicKey);
            
            // Cifrar mensajes usando la clave pública del cliente
            var encryptedMessage = _encryptionService.Encrypt(
                JsonSerializer.Serialize(welcomeNotification), clientPublicKey);
            
            await writer.WriteLineAsync(encryptedMessage);
        }
    }
    catch (Exception ex) {
        Console.Error.WriteLine($"Error con cliente {clientId}: {ex.Message}");
    }
}
```

El sistema de notificaciones permite informar en tiempo real a todos los clientes conectados cuando ocurre algún cambio en las citas, como una nueva reserva, una actualización o una cancelación. Además, cada cliente recibe sólo las notificaciones cifradas con su propia clave pública, garantizando así la confidencialidad de la información.

### API REST (RA4)

He desarrollado una API REST completa para gestionar todas las operaciones relacionadas con las citas. Esta API sigue los principios RESTful y está documentada mediante Swagger.

#### Endpoints Principales

| Método | Endpoint | Función | Autenticación |
|--------|----------|---------|--------------|
| GET | `/api/Appointments` | Obtener todas las citas | No |
| GET | `/api/Appointments/{id}` | Obtener una cita específica | No |
| POST | `/api/Appointments` | Crear una nueva cita | No |
| PUT | `/api/Appointments/{id}` | Actualizar una cita existente | No |
| DELETE | `/api/Appointments/{id}` | Eliminar una cita | No |
| GET | `/api/Appointments/Available/{date}` | Obtener horas disponibles para una fecha | No |
| POST | `/api/Auth/login` | Iniciar sesión (obtener token JWT) | No |
| POST | `/api/Auth/validate` | Validar un token JWT | No |
| GET | `/api/Staff/appointments/all` | Obtener todas las citas (staff) | Sí (JWT) |
| GET | `/api/Staff/appointments/date/{date}` | Obtener citas por fecha (staff) | Sí (JWT) |
| GET | `/api/Staff/pending` | Obtener citas pendientes (staff) | Sí (JWT) |
| PUT | `/api/Staff/appointments/{id}/status` | Actualizar estado de cita (staff) | Sí (JWT) |
| DELETE | `/api/Staff/appointments/{id}` | Rechazar/eliminar cita (staff) | Sí (JWT) |
| GET | `/api/Staff/history` | Obtener historial de solicitudes (staff) | Sí (JWT) |

A continuación muestro ejemplos del código para algunos de los endpoints más importantes:

#### Obtener Citas por Fecha (Staff)
```csharp
[HttpGet("appointments/date/{date}")]
public IActionResult GetAppointmentsByDate(string date)
{
    if (!DateTime.TryParse(date, out DateTime parsedDate))
    {
        return BadRequest(new { message = "Formato de fecha inválido. Use yyyy-MM-dd" });
    }

    var appointments = _jsonRepository.GetAllAppointments();
    var appointmentsForDate = appointments.Where(a => 
        a.AppointmentDateTime.Date == parsedDate.Date
    ).ToList();
    
    return Ok(appointmentsForDate);
}
```

#### Actualizar Estado de Cita (Confirmar/Reprogramar)
```csharp
[HttpPut("appointments/{id}/status")]
public async Task<IActionResult> UpdateAppointmentStatus(long id, [FromBody] AppointmentStatusModel model)
{
    var appointment = _jsonRepository.GetAppointment(id);
    
    if (appointment == null)
    {
        return NotFound(new { message = "Cita no encontrada" });
    }
    
    appointment.IsConfirmed = model.IsConfirmed;
    
    if (!string.IsNullOrEmpty(model.Notes))
    {
        appointment.Notes = model.Notes;
    }
    
    if (model.AppointmentDateTime.HasValue)
    {
        appointment.AppointmentDateTime = model.AppointmentDateTime.Value;
    }
    
    if (!string.IsNullOrEmpty(model.TreatmentType))
    {
        appointment.Treatment = model.TreatmentType;
    }
    
    // Actualizar en JSON local y Firebase
    _jsonRepository.UpdateAppointment(appointment);
    await _firebaseRepository.UpdateAppointmentAsync(appointment);
    
    // Registrar acción en el historial
    AppointmentHistoryItem historyItem = new AppointmentHistoryItem
    {
        AppointmentId = appointment.Id,
        PatientName = appointment.PatientName,
        Action = model.IsConfirmed ? "Aceptada" : "Reprogramada",
        Timestamp = DateTime.Now
    };
    
    _jsonRepository.AddAppointmentHistoryItem(historyItem);
    await _firebaseRepository.AddAppointmentHistoryItemAsync(historyItem);
    
    return Ok(appointment);
}
```

### Seguridad (RA5)

Para proteger la aplicación y los datos, implementé varios mecanismos de seguridad:

#### Cifrado Asimétrico RSA

Todas las comunicaciones entre el cliente de consola y el servidor de notificaciones se cifran mediante RSA:

```csharp
// Cifrado de mensaje con clave pública del cliente
public string Encrypt(string plainText, string clientPublicKeyXml)
{
    try
    {
        byte[] clientPublicKeyBytes = Convert.FromBase64String(clientPublicKeyXml);
        
        using (var clientRsa = RSA.Create())
        {
            clientRsa.ImportRSAPublicKey(clientPublicKeyBytes, out _);
            
            byte[] dataToEncrypt = Encoding.UTF8.GetBytes(plainText);
            byte[] encryptedData = clientRsa.Encrypt(dataToEncrypt, RSAEncryptionPadding.OaepSHA256);
            
            return Convert.ToBase64String(encryptedData);
        }
    }
    catch (Exception ex)
    {
        throw new CryptographicException($"Error al cifrar datos: {ex.Message}", ex);
    }
}
```

#### Autenticación JWT

El panel de administración utiliza tokens JWT para la autenticación:

```csharp
[HttpPost("login")]
public IActionResult Login([FromBody] LoginModel model)
{
    // Verificar credenciales
    if (model.Username == "admin" && model.Password == "admin")
    {
        var token = _jwtAuthService.GenerateToken("2", "Staff", "admin");
        
        return Ok(new { 
            token = token,
            username = "Administrador",
            role = "staff"
        });
    }
    
    return Unauthorized(new { message = "Usuario o contraseña incorrectos" });
}
```

#### Registro Unidireccional (WORM)

Cada operación queda registrada en un log que no puede ser alterado, garantizando así la trazabilidad de todas las acciones:

```csharp
public void AddAppointmentHistoryItem(AppointmentHistoryItem historyItem)
{
    // Obtener el historial actual
    var history = GetAppointmentHistory();
    
    // Agregar el nuevo elemento
    history.Add(historyItem);
    
    // Escribir el historial actualizado al archivo
    string historyFilePath = Path.Combine(_dataDirectory, "appointment_history.json");
    string historyJson = JsonSerializer.Serialize(history, new JsonSerializerOptions
    {
        WriteIndented = true
    });
    File.WriteAllText(historyFilePath, historyJson);
}
```

El registro unidireccional fue particularmente interesante de implementar. Cada operación queda registrada en un log que no puede ser alterado, garantizando así la trazabilidad de todas las acciones. Además, este historial se replica en Firebase para mayor seguridad.

## Clientes

### Cliente Web

He desarrollado una interfaz web moderna con:

- **Página de reserva de citas** para pacientes
- **Panel de administración** para el personal de la clínica con:
  - **Calendario visual** que muestra citas pendientes (amarillo) y confirmadas (verde)
  - **Panel lateral de solicitudes pendientes** para gestionar nuevas citas
  - **Gestión interactiva de citas** permitiendo aceptar, rechazar o reprogramar solicitudes
  - **Historial de solicitudes** que muestra todas las acciones realizadas sobre las citas
- **Notificaciones en tiempo real** vía WebSockets
- **Diseño responsive** para acceso desde cualquier dispositivo
- **Selección visual mejorada** de fechas y horas para una mejor experiencia de usuario

### Monitor de Operaciones (Cliente de Consola)

Para facilitar la supervisión del sistema, he creado un monitor de operaciones en consola que:

- Muestra en tiempo real todas las **operaciones CRUD** que ocurren en el sistema
- Proporciona información detallada sobre cada operación (creación, actualización, eliminación)
- Se conecta mediante **sockets TCP** para recibir notificaciones instantáneas
- Implementa **cifrado asimétrico** para asegurar las comunicaciones
- Sirve como herramienta de auditoría para administradores del sistema

El monitor muestra las operaciones con códigos de color para facilitar la visualización:

```csharp
private void HandleNotification(AppointmentNotification notification)
{
    // Timestamp actual
    string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    
    // Color según tipo de operación
    ConsoleColor color;
    string operationName;
    
    switch(notification.Action.ToLower())
    {
        case "created":
            color = ConsoleColor.Green;
            operationName = "CREACIÓN";
            // Mostrar detalles de la nueva cita
            break;
        
        case "updated":
            color = ConsoleColor.Yellow;
            operationName = "ACTUALIZACIÓN";
            // Mostrar detalles de la cita actualizada
            break;
        
        case "deleted":
            color = ConsoleColor.Red;
            operationName = "ELIMINACIÓN";
            // Mostrar detalles de la cita eliminada
            break;
    }
    
    // Mostrar con formato visual
    Console.ForegroundColor = color;
    Console.WriteLine($"[{timestamp}] OPERACIÓN: {operationName}");
}
```

## Panel de Administración

El panel de administración es una herramienta completa para la gestión de citas que incluye:

### Calendario Interactivo con Indicadores Visuales

El calendario muestra visualmente:
- **Círculos verdes** para días con citas confirmadas
- **Círculos amarillos** para días con citas pendientes
- **Indicadores numéricos** que muestran la cantidad de citas en cada día

```javascript
// Mostrar indicadores de citas
if (confirmedCount > 0 || pendingCount > 0) {
    html += '<div class="appointment-indicators">';
    
    if (confirmedCount > 0) {
        html += `<span class="indicator confirmed" title="${confirmedCount} citas confirmadas">${confirmedCount}</span>`;
    }
    
    if (pendingCount > 0) {
        html += `<span class="indicator pending" title="${pendingCount} citas pendientes">${pendingCount}</span>`;
    }
    
    html += '</div>';
}
```

### Panel Lateral de Solicitudes Pendientes

Lista todas las nuevas solicitudes de citas que necesitan atención:

```javascript
function displayPendingRequests(appointments) {
    const container = document.getElementById('pendingRequests');
    container.innerHTML = '';

    // Filtrar citas pendientes (no confirmadas)
    const pendingAppointments = appointments.filter(appointment => !appointment.isConfirmed);

    if (pendingAppointments.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay solicitudes pendientes</p>';
        return;
    }

    pendingAppointments.forEach(appointment => {
        const card = document.createElement('div');
        card.className = 'request-card';
        // Mostrar detalles de la cita pendiente
        card.onclick = () => openAppointmentModal(appointment);
        container.appendChild(card);
    });
}
```

### Sistema de Gestión de Citas

Permite tres acciones principales:

1. **Aceptar**: Confirma la cita y la marca en verde en el calendario
2. **Reprogramar**: Permite modificar fecha, hora, tratamiento y notas
3. **Rechazar**: Elimina la solicitud del sistema

```javascript
async function updateAppointment(action) {
    if (!currentAppointment) return;

    try {
        let endpoint;
        let method;
        
        // Configurar acción según el tipo
        if (action === 'reject') {
            endpoint = `${API_URL}/Staff/appointments/${currentAppointment.id}`;
            method = 'DELETE';
        } else {
            endpoint = `${API_URL}/Staff/appointments/${currentAppointment.id}/status`;
            method = 'PUT';
        }
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: method === 'PUT' ? JSON.stringify(updatedData) : null
        });

        if (response.ok) {
            // Actualizar interfaz y mostrar notificación
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### Historial de Solicitudes

El historial registra todas las acciones realizadas sobre las citas y permite auditar todas las decisiones:

```javascript
function displayRequestHistory() {
    const container = document.getElementById('requestHistory');
    
    // Ordenar por fecha, más recientes primero
    requestHistory.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    requestHistory.forEach(item => {
        const historyItem = document.createElement('div');
        let statusClass = '';
        
        // Asignar clase CSS según el tipo de acción
        switch (item.action.toLowerCase()) {
            case 'accepted': statusClass = 'accepted'; break;
            case 'rejected': statusClass = 'rejected'; break;
            case 'rescheduled': statusClass = 'rescheduled'; break;
        }
        
        historyItem.className = `history-item ${statusClass}`;
        
        // Mostrar detalles de la acción
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span>${item.patientName}</span>
                <span class="history-item-date">${date.toLocaleDateString()}</span>
            </div>
            <div class="history-item-status">
                <span>Pendiente</span>
                <span class="status-arrow">→</span>
                <span>${item.action}</span>
            </div>
        `;
        
        container.appendChild(historyItem);
    });
}
```

## Persistencia e Integración con Firebase

### Almacenamiento Local en JSON

La aplicación utiliza archivos JSON para el almacenamiento principal de datos, lo que facilita la depuración y el desarrollo:

```csharp
public List<Appointment> GetAllAppointments()
{
    return LoadAppointments();
}

private List<Appointment> LoadAppointments()
{
    // Verificar si el archivo existe
    if (!File.Exists(_appointmentsFile))
    {
        // Si no existe, devolver una lista vacía
        return new List<Appointment>();
    }

    // Leer el contenido del archivo
    string json = File.ReadAllText(_appointmentsFile);
    
    // Deserializar el contenido a una lista de citas
    return JsonSerializer.Deserialize<List<Appointment>>(json) ?? new List<Appointment>();
}
```

### Replicación en Firebase

Para garantizar la disponibilidad y redundancia de los datos, implementé una replicación automática en Firebase:

```csharp
public async Task<bool> UpdateAppointmentAsync(Server.Models.Appointment appointment)
{
    try
    {
        string appointmentJson = JsonSerializer.Serialize(appointment);
        var content = new StringContent(appointmentJson, Encoding.UTF8, "application/json");
        
        // Actualizar en Firebase usando la clave específica
        var response = await _httpClient.PutAsync(
            $"{_firebaseUrl}/appointments/{appointment.FirebaseKey}.json?auth={_apiKey}", 
            content);
        
        return response.IsSuccessStatusCode;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error al actualizar cita en Firebase: {ex.Message}");
        return false;
    }
}
```

### Sincronización de Historial

Una característica importante es la sincronización del historial de cambios entre el almacenamiento local y Firebase:

```csharp
public async Task<IActionResult> GetAppointmentHistory()
{
    // Obtener historial local
    var historyLocal = _jsonRepository.GetAppointmentHistory();
    
    // Obtener historial de Firebase
    var historyFirebase = await _firebaseRepository.GetAppointmentHistoryAsync();
    
    // Combinar ambos historiales (eliminar duplicados por ID y timestamp)
    var combinedHistory = historyLocal.ToList();
    
    foreach (var fbItem in historyFirebase)
    {
        bool isDuplicate = combinedHistory.Any(localItem =>
            localItem.AppointmentId == fbItem.AppointmentId &&
            Math.Abs((localItem.Timestamp - fbItem.Timestamp).TotalSeconds) < 5
        );
        
        if (!isDuplicate)
        {
            combinedHistory.Add(fbItem);
        }
    }
    
    // Ordenar por timestamp descendente (más recientes primero)
    var sortedHistory = combinedHistory.OrderByDescending(item => item.Timestamp).ToList();
    
    return Ok(sortedHistory);
}
```

Esta sincronización garantiza que, incluso si hay problemas de conexión, los datos eventualmente se sincronizarán cuando la conexión se restablezca.

## Ejecución del Proyecto

Para ejecutar todos los componentes del sistema fácilmente, utilice el script incluido:

```bash
.\iniciar_clinic_app.ps1
```

Este script iniciará todos los componentes necesarios:
- **Servidor API**: Gestiona todas las peticiones y la lógica de negocio
- **Cliente Web**: Accesible en http://localhost:5021/index.html
- **Panel de Administración**: Accesible en http://localhost:5021/admin/index.html (usuario: admin, contraseña: admin)
- **Monitor de Operaciones**: Muestra las operaciones CRUD en tiempo real

Para ejecutar los componentes por separado:

### Servidor
```bash
cd src/Server/API
dotnet run
```

### Monitor de Operaciones
```bash
cd src/Clients/ConsoleClient
dotnet run
```

## Demo en Video

[Ver Demo en YouTube](https://youtube.com/link_a_tu_video)

En esta demo muestro:
- Creación, consulta, modificación y eliminación de citas
- Funcionamiento del sistema con dos clientes simultáneos
- Notificaciones en tiempo real
- Verificación de la replicación en Firebase
- Demostración de la seguridad implementada

## Conclusiones

Este proyecto ha sido un gran desafío que me ha permitido aplicar los conocimientos adquiridos en el módulo. He aprendido mucho sobre:

- **Arquitectura de aplicaciones distribuidas**: La separación en capas y componentes ha sido fundamental
- **Comunicación asíncrona**: Manejar múltiples clientes simultáneamente requiere un enfoque diferente
- **Seguridad en aplicaciones**: El cifrado y la auditoría son esenciales para proteger datos sensibles
- **Integración con servicios en la nube**: Firebase ofrece grandes posibilidades para aplicaciones modernas

Al desarrollar este proyecto, me di cuenta de la importancia de planificar bien la arquitectura antes de comenzar a programar. También comprendí que hay un equilibrio entre seguridad, usabilidad y rendimiento que siempre hay que tener en cuenta.

## Deudas Técnicas

Aunque estoy satisfecho con el resultado, hay aspectos que podrían mejorarse en futuras versiones:

1. **Escalabilidad**: El servidor actual podría tener limitaciones con muchos clientes
2. **Pruebas automatizadas**: Faltan tests unitarios y de integración
3. **Gestión de errores**: Podría ser más robusta en algunos componentes
4. **UI/UX**: La interfaz de usuario podría mejorar con más feedback visual
5. **Offline mode**: Sería útil que el cliente web funcionara sin conexión

Estas "deudas técnicas" son oportunidades de mejora que tengo identificadas para futuras iteraciones del proyecto.

---

## Requisitos Implementados

- [x] Comunicaciones cliente-servidor por sockets
- [x] Bloqueo de recursos compartidos
- [x] API REST con todas las operaciones CRUD
- [x] Persistencia en JSON
- [x] Replicación en Firebase
- [x] Cifrado asimétrico en comunicaciones
- [x] Registro unidireccional de operaciones 
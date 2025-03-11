# 🔌 Endpoints de la API REST

Este documento detalla todos los endpoints disponibles en la API REST de la Clínica Dental.

## Índice

1. [Endpoints Públicos](#endpoints-públicos)
   - [Gestión de Citas](#gestión-de-citas)
   - [Autenticación](#autenticación)
2. [Endpoints Privados](#endpoints-privados)
   - [Panel de Administración](#panel-de-administración)
   - [Historial y Estadísticas](#historial-y-estadísticas)
3. [Códigos de Estado](#códigos-de-estado)
4. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Endpoints Públicos

Estos endpoints son accesibles sin autenticación y permiten a los pacientes gestionar sus citas.

### Gestión de Citas

#### Obtener todas las citas

```
GET /api/Appointments
```

Devuelve un listado de todas las citas programadas.

**Respuesta (200 OK)**
```json
[
  {
    "id": 1649267841,
    "patientName": "María García",
    "patientEmail": "maria@example.com",
    "patientPhone": "600123456",
    "appointmentDateTime": "2023-10-25T09:30:00",
    "treatment": "Limpieza dental",
    "isConfirmed": true,
    "notes": "Primera visita"
  },
  // ...más citas
]
```

#### Obtener cita específica

```
GET /api/Appointments/{id}
```

Devuelve la información de una cita específica.

**Respuesta (200 OK)**
```json
{
  "id": 1649267841,
  "patientName": "María García",
  "patientEmail": "maria@example.com",
  "patientPhone": "600123456",
  "appointmentDateTime": "2023-10-25T09:30:00",
  "treatment": "Limpieza dental",
  "isConfirmed": true,
  "notes": "Primera visita"
}
```

#### Crear nueva cita

```
POST /api/Appointments
```

Crea una nueva cita en el sistema.

**Cuerpo de la solicitud**
```json
{
  "patientName": "Carlos López",
  "patientEmail": "carlos@example.com",
  "patientPhone": "600654321",
  "appointmentDateTime": "2023-10-26T11:00:00",
  "treatment": "Revisión",
  "notes": "Dolor en muela izquierda"
}
```

**Respuesta (201 Created)**
```json
{
  "id": 1649267842,
  "patientName": "Carlos López",
  "patientEmail": "carlos@example.com",
  "patientPhone": "600654321",
  "appointmentDateTime": "2023-10-26T11:00:00",
  "treatment": "Revisión",
  "isConfirmed": false,
  "notes": "Dolor en muela izquierda"
}
```

#### Actualizar cita existente

```
PUT /api/Appointments/{id}
```

Actualiza una cita existente.

**Cuerpo de la solicitud**
```json
{
  "id": 1649267842,
  "patientName": "Carlos López",
  "patientEmail": "carlos@example.com",
  "patientPhone": "600654321",
  "appointmentDateTime": "2023-10-27T11:00:00",
  "treatment": "Revisión",
  "isConfirmed": false,
  "notes": "Dolor en muela izquierda. Cambiada a día 27."
}
```

**Respuesta (200 OK)**
```json
{
  "id": 1649267842,
  "patientName": "Carlos López",
  "patientEmail": "carlos@example.com",
  "patientPhone": "600654321",
  "appointmentDateTime": "2023-10-27T11:00:00",
  "treatment": "Revisión",
  "isConfirmed": false,
  "notes": "Dolor en muela izquierda. Cambiada a día 27."
}
```

#### Eliminar cita

```
DELETE /api/Appointments/{id}
```

Elimina una cita existente.

**Respuesta (204 No Content)**

#### Obtener horas disponibles

```
GET /api/Appointments/Available/{date}
```

Devuelve las horas disponibles para una fecha específica.

**Respuesta (200 OK)**
```json
[
  "2023-10-27T09:00:00",
  "2023-10-27T09:30:00",
  "2023-10-27T10:00:00",
  "2023-10-27T10:30:00",
  // ...más horas
]
```

#### Obtener citas para una fecha

```
GET /api/Appointments/ForDate/{date}
```

Devuelve las citas programadas para una fecha específica.

**Respuesta (200 OK)**
```json
[
  {
    "id": 1649267843,
    "patientName": "Ana Martínez",
    "appointmentDateTime": "2023-10-27T11:30:00",
    "treatment": "Empaste",
    "isConfirmed": true
  },
  // ...más citas
]
```

### Autenticación

#### Iniciar sesión

```
POST /api/Auth/login
```

Autentica un usuario y devuelve un token JWT.

**Cuerpo de la solicitud**
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Respuesta (200 OK)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "Administrador",
  "role": "staff"
}
```

#### Validar token

```
POST /api/Auth/validate
```

Valida un token JWT existente.

**Cuerpo de la solicitud**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta (200 OK)**
```json
{
  "valid": true,
  "username": "Administrador",
  "role": "staff"
}
```

## Endpoints Privados

Estos endpoints requieren autenticación mediante un token JWT en el encabezado `Authorization`.

### Panel de Administración

#### Obtener todas las citas (staff)

```
GET /api/Staff/appointments/all
```

Devuelve todas las citas para el personal de la clínica.

**Respuesta (200 OK)**
```json
[
  {
    "id": 1649267841,
    "patientName": "María García",
    "patientEmail": "maria@example.com",
    "patientPhone": "600123456",
    "appointmentDateTime": "2023-10-25T09:30:00",
    "treatment": "Limpieza dental",
    "isConfirmed": true,
    "notes": "Primera visita",
    "created": "2023-10-20T15:30:00",
    "modified": "2023-10-20T16:45:00"
  },
  // ...más citas con información detallada
]
```

#### Obtener citas por fecha (staff)

```
GET /api/Staff/appointments/date/{date}
```

Devuelve las citas para una fecha específica (para personal).

**Respuesta (200 OK)**
```json
[
  {
    "id": 1649267844,
    "patientName": "Pedro Sánchez",
    "patientEmail": "pedro@example.com",
    "patientPhone": "600789456",
    "appointmentDateTime": "2023-10-28T10:00:00",
    "treatment": "Extracción",
    "isConfirmed": true,
    "notes": "Muela del juicio",
    "created": "2023-10-21T09:15:00",
    "modified": "2023-10-21T14:30:00"
  },
  // ...más citas
]
```

#### Obtener citas pendientes

```
GET /api/Staff/pending
```

Devuelve todas las citas pendientes de confirmación.

**Respuesta (200 OK)**
```json
[
  {
    "id": 1649267845,
    "patientName": "Laura Fernández",
    "patientEmail": "laura@example.com",
    "patientPhone": "600321654",
    "appointmentDateTime": "2023-10-29T12:00:00",
    "treatment": "Ortodoncia",
    "isConfirmed": false,
    "notes": "Consulta inicial",
    "created": "2023-10-22T10:45:00"
  },
  // ...más citas pendientes
]
```

#### Actualizar estado de cita

```
PUT /api/Staff/appointments/{id}/status
```

Actualiza el estado de una cita (confirmar/reprogramar).

**Cuerpo de la solicitud**
```json
{
  "isConfirmed": true,
  "notes": "Confirmada por teléfono",
  "appointmentDateTime": "2023-10-29T12:00:00",
  "treatmentType": "Ortodoncia"
}
```

**Respuesta (200 OK)**
```json
{
  "id": 1649267845,
  "patientName": "Laura Fernández",
  "patientEmail": "laura@example.com",
  "patientPhone": "600321654",
  "appointmentDateTime": "2023-10-29T12:00:00",
  "treatment": "Ortodoncia",
  "isConfirmed": true,
  "notes": "Consulta inicial. Confirmada por teléfono",
  "created": "2023-10-22T10:45:00",
  "modified": "2023-10-22T11:30:00"
}
```

#### Rechazar/eliminar cita (staff)

```
DELETE /api/Staff/appointments/{id}
```

Rechaza una cita pendiente (para personal).

**Respuesta (204 No Content)**

### Historial y Estadísticas

#### Obtener historial de citas

```
GET /api/Staff/history
```

Devuelve el historial completo de acciones sobre citas.

**Respuesta (200 OK)**
```json
[
  {
    "id": "8f7e6d5c-4b3a-2d1e-0f9g-8h7i6j5k4l3m",
    "appointmentId": 1649267841,
    "patientName": "María García",
    "action": "Aceptada",
    "timestamp": "2023-10-20T16:45:00"
  },
  {
    "id": "2a3b4c5d-6e7f-8g9h-0i1j-2k3l4m5n6o7p",
    "appointmentId": 1649267842,
    "patientName": "Carlos López",
    "action": "Reprogramada",
    "timestamp": "2023-10-21T09:30:00"
  },
  // ...más entradas del historial
]
```

## Códigos de Estado

La API utiliza los siguientes códigos de estado HTTP:

- **200 OK**: La solicitud se completó correctamente
- **201 Created**: Se creó un nuevo recurso
- **204 No Content**: La solicitud se completó pero no hay contenido para devolver
- **400 Bad Request**: La solicitud contiene datos inválidos
- **401 Unauthorized**: No se proporcionó autenticación o es inválida
- **403 Forbidden**: El usuario no tiene permisos para acceder al recurso
- **404 Not Found**: El recurso solicitado no existe
- **500 Internal Server Error**: Error del servidor

## Ejemplos de Uso

### Crear una nueva cita (PowerShell)

```powershell
$body = @{
    patientName = "Juan Pérez"
    patientEmail = "juan@example.com"
    patientPhone = "600123987"
    appointmentDateTime = "2023-11-05T10:00:00"
    treatment = "Revisión"
    notes = "Primera visita"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5021/api/Appointments" -Method Post -Body $body -ContentType "application/json"
```

### Confirmar una cita (PowerShell con autenticación)

```powershell
# Primero, obtener token
$authBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

$authResponse = Invoke-RestMethod -Uri "http://localhost:5021/api/Auth/login" -Method Post -Body $authBody -ContentType "application/json"
$token = $authResponse.token

# Ahora confirmar la cita
$confirmBody = @{
    isConfirmed = $true
    notes = "Confirmada por teléfono"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5021/api/Staff/appointments/1649267845/status" -Method Put -Body $confirmBody -ContentType "application/json" -Headers @{
    Authorization = "Bearer $token"
}
```

### Obtener horas disponibles (JavaScript)

```javascript
async function getAvailableSlots(date) {
    try {
        const formattedDate = date.toISOString().split('T')[0];
        const response = await fetch(`http://localhost:5021/api/Appointments/Available/${formattedDate}`);
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const availableSlots = await response.json();
        return availableSlots;
    } catch (error) {
        console.error('Error fetching available slots:', error);
        return [];
    }
}
``` 
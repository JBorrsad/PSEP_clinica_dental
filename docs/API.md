# Documentación de la API REST

La API REST de la Clínica Dental proporciona acceso a los servicios de gestión de citas. A continuación se describen los endpoints disponibles y cómo utilizarlos.

## Base URL

```
http://localhost:5021/api
```

## Endpoints

### Appointments

#### GET /Appointments

Devuelve todas las citas registradas.

**Respuesta**

```json
[
  {
    "id": 1,
    "patientName": "Juan Pérez",
    "contactPhone": "612345678",
    "email": "juan@example.com",
    "appointmentDateTime": "2023-07-15T10:00:00",
    "durationMinutes": 30,
    "treatmentType": "Limpieza dental",
    "notes": "Primera visita",
    "isConfirmed": true
  },
  {
    "id": 2,
    "patientName": "María Gómez",
    "contactPhone": "698765432",
    "email": "maria@example.com",
    "appointmentDateTime": "2023-07-15T11:00:00",
    "durationMinutes": 45,
    "treatmentType": "Revisión",
    "notes": "",
    "isConfirmed": false
  }
]
```

#### GET /Appointments/{id}

Devuelve los detalles de una cita específica.

**Parámetros**

- `id` - ID de la cita (long)

**Respuesta**

```json
{
  "id": 1,
  "patientName": "Juan Pérez",
  "contactPhone": "612345678",
  "email": "juan@example.com",
  "appointmentDateTime": "2023-07-15T10:00:00",
  "durationMinutes": 30,
  "treatmentType": "Limpieza dental",
  "notes": "Primera visita",
  "isConfirmed": true
}
```

#### GET /Appointments/Available/{date}

Devuelve los horarios disponibles para una fecha específica.

**Parámetros**

- `date` - Fecha en formato yyyy-MM-dd (DateTime)

**Respuesta**

```json
[
  "2023-07-15T09:00:00",
  "2023-07-15T09:30:00",
  "2023-07-15T10:30:00",
  "2023-07-15T11:30:00",
  "2023-07-15T12:00:00"
]
```

#### GET /Appointments/Patient/{name}

Devuelve todas las citas de un paciente específico.

**Parámetros**

- `name` - Nombre del paciente (string)

**Respuesta**

```json
[
  {
    "id": 1,
    "patientName": "Juan Pérez",
    "contactPhone": "612345678",
    "email": "juan@example.com",
    "appointmentDateTime": "2023-07-15T10:00:00",
    "durationMinutes": 30,
    "treatmentType": "Limpieza dental",
    "notes": "Primera visita",
    "isConfirmed": true
  },
  {
    "id": 3,
    "patientName": "Juan Pérez",
    "contactPhone": "612345678",
    "email": "juan@example.com",
    "appointmentDateTime": "2023-07-22T10:00:00",
    "durationMinutes": 30,
    "treatmentType": "Revisión",
    "notes": "Seguimiento",
    "isConfirmed": false
  }
]
```

#### POST /Appointments

Crea una nueva cita.

**Cuerpo de la petición**

```json
{
  "patientName": "Laura Martínez",
  "contactPhone": "654321987",
  "email": "laura@example.com",
  "appointmentDateTime": "2023-07-18T16:00:00",
  "durationMinutes": 30,
  "treatmentType": "Empaste",
  "notes": "Dolor en muela inferior derecha",
  "isConfirmed": true
}
```

**Respuesta**

```json
{
  "id": 5,
  "patientName": "Laura Martínez",
  "contactPhone": "654321987",
  "email": "laura@example.com",
  "appointmentDateTime": "2023-07-18T16:00:00",
  "durationMinutes": 30,
  "treatmentType": "Empaste",
  "notes": "Dolor en muela inferior derecha",
  "isConfirmed": true
}
```

#### PUT /Appointments/{id}

Actualiza una cita existente.

**Parámetros**

- `id` - ID de la cita (long)

**Cuerpo de la petición**

```json
{
  "id": 5,
  "patientName": "Laura Martínez",
  "contactPhone": "654321987",
  "email": "laura@example.com",
  "appointmentDateTime": "2023-07-18T17:00:00",
  "durationMinutes": 45,
  "treatmentType": "Empaste",
  "notes": "Dolor en muela inferior derecha. Cambio de hora.",
  "isConfirmed": true
}
```

**Respuesta**

- `204 No Content` - La cita se actualizó correctamente

#### DELETE /Appointments/{id}

Elimina una cita existente.

**Parámetros**

- `id` - ID de la cita (long)

**Respuesta**

- `204 No Content` - La cita se eliminó correctamente

## Notificaciones en tiempo real

La API envía notificaciones en tiempo real cuando se crean, actualizan o eliminan citas.

### WebSockets

Las notificaciones WebSocket están disponibles en:

```
ws://localhost:5021/ws
```

### TCP Sockets

Las notificaciones TCP están disponibles en:

```
127.0.0.1:11000
```

### Formato de las notificaciones

```json
{
  "type": "notification",
  "action": "created|updated|deleted",
  "data": {
    // Datos de la cita o ID en caso de eliminación
  }
}
```

## Interfaz Web

La interfaz web de la aplicación está disponible en:

### Cliente para Pacientes
```
http://localhost:5021/index.html
```

### Panel de Administración
```
http://localhost:5021/admin/index.html
```

## Seguridad

La API utiliza cifrado asimétrico para las comunicaciones por socket y registro unidireccional para las operaciones CRUD, garantizando la integridad y confidencialidad de los datos. 
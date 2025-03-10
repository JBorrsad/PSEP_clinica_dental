# Estructura del Proyecto

Este documento describe la estructura del proyecto de la Clínica Dental, detallando los componentes principales, sus responsabilidades y cómo se organizan.

## Visión General

El proyecto está organizado siguiendo los principios de arquitectura limpia y separación de responsabilidades. La estructura principal es:

```
PSEP-Proyecto/
├── src/
│   ├── Server/
│   ├── Clients/
│   └── Common/
├── docs/
└── iniciar_clinic_app.ps1
```

## Componentes Principales

### 1. Server

El componente `Server` contiene toda la lógica del backend, organizada en subcarpetas según su responsabilidad:

```
Server/
├── API/
│   ├── Controllers/
│   ├── Middleware/
│   └── Program.cs
├── Socket/
│   └── NotificationService.cs
├── Security/
│   ├── Encryption/
│   ├── Authentication/
│   └── Logging/
├── Data/
│   ├── Json/
│   └── Firebase/
└── Models/
```

#### API

La carpeta API contiene los controladores REST y la configuración del servidor web:

- **Controllers**: Controladores para los endpoints REST
- **Middleware**: Middleware para la autenticación y logging
- **Program.cs**: Punto de entrada y configuración del servidor

#### Socket

Contiene los servicios para la comunicación en tiempo real:

- **NotificationService.cs**: Implementa el servicio de notificaciones en tiempo real a través de TCP y WebSockets

#### Security

Componentes relacionados con la seguridad del sistema:

- **Encryption**: Servicios de cifrado asimétrico para las comunicaciones
- **Authentication**: Servicios de autenticación mediante JWT
- **Logging**: Sistema de registro unidireccional para las operaciones CRUD

#### Data

Contiene la implementación de acceso a datos:

- **Json**: Repositorio para almacenamiento en archivos JSON
- **Firebase**: Repositorio para replicación en Firebase

#### Models

Modelos de dominio específicos del servidor.

### 2. Clients

El componente `Clients` contiene los diferentes clientes que interactúan con el servidor:

```
Clients/
├── ConsoleClient/
│   ├── Communication/
│   ├── Security/
│   ├── UI/
│   └── Program.cs
└── WebClient/
    ├── admin/
    ├── js/
    └── index.html
```

#### ConsoleClient

Cliente de consola con interfaz de texto:

- **Communication**: Clases para la comunicación con el servidor API y sockets
- **Security**: Implementación de cifrado para las comunicaciones
- **UI**: Componentes de interfaz de usuario

#### WebClient

Cliente web con interfaz gráfica:

- **admin**: Interfaz para el personal de la clínica
- **js**: Scripts JavaScript para la interfaz
- **index.html**: Página principal para los pacientes

### 3. Common

Contiene código compartido entre el servidor y los clientes:

```
Common/
└── Models/
    ├── Appointment.cs
    └── AppointmentNotification.cs
```

- **Models**: Modelos de datos compartidos (DTOs) con validaciones

## Archivos de Configuración

- **src/Clients/ConsoleClient/appsettings.json**: Configuración del cliente de consola
- **src/Server/API/appsettings.json**: Configuración del servidor API

## Scripts

- **iniciar_clinic_app.ps1**: Script para iniciar tanto el servidor como el cliente de consola

## Patrones Implementados

- **Repositorio**: Para abstraer el acceso a datos
- **MVC**: En los controladores API
- **Observer**: Para las notificaciones en tiempo real
- **Singleton**: Para servicios compartidos (loggers, etc.)
- **Factory**: Para la creación de objetos complejos

## Flujo de Datos

1. Los clientes (ConsoleClient o WebClient) realizan peticiones a la API REST
2. La API procesa las peticiones, utilizando los repositorios para acceder a los datos
3. Cuando un cambio ocurre, el servicio de notificaciones envía actualizaciones en tiempo real
4. El sistema de seguridad cifra las comunicaciones y registra las operaciones

## URLs de Acceso

La aplicación se sirve completamente desde el servidor API:

- **API REST**: http://localhost:5021/api
- **Swagger**: http://localhost:5021/swagger
- **Cliente Web (Pacientes)**: http://localhost:5021/index.html
- **Panel de Administración**: http://localhost:5021/admin/index.html
- **WebSockets**: ws://localhost:5021/ws
- **TCP Sockets**: 127.0.0.1:11000

## Consideraciones de Seguridad

- Todas las comunicaciones por socket están cifradas mediante RSA
- Las operaciones CRUD se registran en un log unidireccional con cadena de hashes
- La autenticación para el panel de administración utiliza JWT 
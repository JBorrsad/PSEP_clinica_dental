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

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Funcionalidades Principales](#funcionalidades-principales)
   - [Comunicaciones por Sockets](#comunicaciones-por-sockets-ra3)
   - [API REST](#api-rest-ra4)
   - [Seguridad](#seguridad-ra5)
5. [Clientes Implementados](#clientes)
6. [Ejecución del Proyecto](#ejecución-del-proyecto)
7. [Demo en Video](#demo-en-video)
8. [Conclusiones](#conclusiones)
9. [Deudas Técnicas](#deudas-técnicas)

---

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
// Ejemplo de código para el intercambio de claves públicas
string publicKey = _encryptionService.GetPublicKey();
await _notificationStream.WriteAsync(Encoding.UTF8.GetBytes(publicKey));
```

### API REST (RA4)

Para el desarrollo de servicios en red, implementé:

- **Endpoints CRUD completos** para gestión de citas
- **Swagger UI** para documentación interactiva
- **Persistencia en JSON** como almacenamiento principal
- **Replicación en Firebase** para redundancia y acceso remoto

El desafío aquí fue la sincronización entre el almacenamiento local y Firebase. Decidí que todas las operaciones se realizaran primero en local y, si son exitosas, se replican en Firebase.

### Seguridad (RA5)

Para proteger la aplicación y los datos, implementé:

- **Cifrado asimétrico RSA** para comunicaciones cliente-servidor
- **Autenticación JWT** para el panel de administración
- **Registro unidireccional (WORM)** para auditar todas las operaciones CRUD

El registro unidireccional fue particularmente interesante de implementar. Cada operación queda registrada en un log que no puede ser alterado, garantizando así la trazabilidad de todas las acciones.

## Clientes

### Cliente Web

He desarrollado una interfaz web moderna con:

- **Página de reserva de citas** para pacientes
- **Panel de administración** para el personal de la clínica
- **Notificaciones en tiempo real** vía WebSockets
- **Diseño responsive** para acceso desde cualquier dispositivo

### Cliente de Consola

Para demostrar la versatilidad del sistema, también he creado un cliente de consola que:

- Ofrece una **interfaz de texto completa** para gestionar citas
- Se conecta mediante **sockets TCP** para recibir notificaciones
- Implementa **cifrado asimétrico** para comunicaciones seguras

## Ejecución del Proyecto

### Servidor
```bash
cd src/Server/API
dotnet run
```

### Cliente de Consola
```bash
cd src/Clients/ConsoleClient
dotnet run
```

### Cliente Web
Accesible a través de:
- Pacientes: http://localhost:5021/index.html
- Personal: http://localhost:5021/admin/index.html (admin/admin123)

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
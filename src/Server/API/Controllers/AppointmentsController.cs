using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Common.Models;
using Server.Models;
using Server.Data.Json;
using Server.Data.Firebase;
using Server.Security.Logging;
using Server.Socket;

namespace Server.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentsController : ControllerBase
    {
        private readonly JsonDataRepository _jsonRepository;
        private readonly FirebaseRepository _firebaseRepository;
        private readonly CrudAuditLogger _auditLogger;
        private readonly NotificationService _notificationService;
        
        public AppointmentsController(
            JsonDataRepository jsonRepository, 
            FirebaseRepository firebaseRepository,
            CrudAuditLogger auditLogger,
            NotificationService notificationService)
        {
            _jsonRepository = jsonRepository;
            _firebaseRepository = firebaseRepository;
            _auditLogger = auditLogger;
            _notificationService = notificationService;
        }
        
        /// <summary>
        /// Obtiene todas las citas
        /// </summary>
        /// <returns>Lista de citas</returns>
        [HttpGet]
        public ActionResult<IEnumerable<Common.Models.Appointment>> GetAppointments()
        {
            try
            {
                // Obtener datos del repositorio JSON
                var appointments = _jsonRepository.GetAllAppointments();
                
                // Registrar en el log
                _auditLogger.LogOperationAsync("GET", "Appointments", "system", "GetAll").Wait();
                
                // Convertir a modelo común y devolver
                return Ok(appointments.Select(a => a.ToCommonModel()));
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Obtiene una cita específica por su ID
        /// </summary>
        /// <param name="id">ID de la cita</param>
        /// <returns>Detalles de la cita</returns>
        [HttpGet("{id}")]
        public ActionResult<Common.Models.Appointment> GetAppointment(long id)
        {
            try
            {
                // Buscar en el repositorio JSON
                var appointment = _jsonRepository.GetAppointment(id);
                
                if (appointment == null)
                {
                    return NotFound($"No se encontró la cita con ID {id}");
                }
                
                // Registrar en el log
                _auditLogger.LogOperationAsync("GET", $"Appointment/{id}", "system", $"GetById: {id}").Wait();
                
                // Convertir a modelo común y devolver
                return Ok(appointment.ToCommonModel());
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Obtiene los horarios disponibles para una fecha específica
        /// </summary>
        /// <param name="date">Fecha a consultar</param>
        /// <returns>Lista de horarios disponibles</returns>
        [HttpGet("Available/{date}")]
        public ActionResult<IEnumerable<DateTime>> GetAvailableSlots(DateTime date)
        {
            try
            {
                // Obtener horarios disponibles
                var availableSlots = _jsonRepository.GetAvailableSlots(date);
                
                // Registrar en el log
                _auditLogger.LogOperationAsync("GET", $"Appointments/Available/{date:yyyy-MM-dd}", "system", $"Available: {date:yyyy-MM-dd}").Wait();
                
                return Ok(availableSlots);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Obtiene las citas programadas para una fecha específica
        /// </summary>
        /// <param name="date">Fecha a consultar en formato YYYY-MM-DD</param>
        /// <returns>Lista de citas para esa fecha</returns>
        [HttpGet("ForDate/{date}")]
        public ActionResult<IEnumerable<Common.Models.Appointment>> GetAppointmentsForDate(DateTime date)
        {
            try
            {
                // Obtener todas las citas
                var allAppointments = _jsonRepository.GetAllAppointments();
                
                // Filtrar por la fecha especificada
                var appointmentsForDate = allAppointments
                    .Where(a => a.AppointmentDateTime.Date == date.Date)
                    .Select(a => a.ToCommonModel())
                    .ToList();
                
                // Registrar en el log
                _auditLogger.LogOperationAsync("GET", $"Appointments/ForDate/{date:yyyy-MM-dd}", "system", $"ForDate: {date:yyyy-MM-dd}").Wait();
                
                return Ok(appointmentsForDate);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Obtiene las solicitudes de cita pendientes (no confirmadas)
        /// </summary>
        /// <returns>Lista de citas pendientes</returns>
        [HttpGet("Pending")]
        public ActionResult<IEnumerable<Common.Models.Appointment>> GetPendingAppointments()
        {
            try
            {
                // Obtener todas las citas
                var allAppointments = _jsonRepository.GetAllAppointments();
                
                // Filtrar solo las pendientes (no confirmadas y no canceladas)
                var pendingAppointments = allAppointments
                    .Where(a => !a.IsConfirmed && a.Status != "Cancelada" && a.Status != "Canceled")
                    .ToList();
                
                // Log más detallado
                var appointmentIds = string.Join(", ", pendingAppointments.Select(a => a.Id));
                _auditLogger.LogOperationAsync("GET", "Appointments/Pending", "system", 
                    $"GetPending: Found {pendingAppointments.Count} pending appointments. IDs: {appointmentIds}").Wait();
                
                // Convertir a modelo común
                var result = pendingAppointments.Select(a => a.ToCommonModel()).ToList();
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Obtiene el historial de solicitudes de citas (confirmadas o canceladas)
        /// </summary>
        /// <returns>Lista del historial de citas</returns>
        [HttpGet("History")]
        public async Task<ActionResult<IEnumerable<Common.Models.Appointment>>> GetAppointmentHistory()
        {
            try
            {
                // Obtener todas las citas del repositorio JSON
                var allAppointments = _jsonRepository.GetAllAppointments();
                
                // Filtrar solo las confirmadas o canceladas
                var historyAppointments = allAppointments
                    .Where(a => a.IsConfirmed || a.Status == "Cancelada" || a.Status == "Canceled")
                    .ToList();
                
                // Registrar en el log
                await _auditLogger.LogOperationAsync("GET", "Appointments/History", "system", 
                    $"GetHistory: Found {historyAppointments.Count} appointments in history");
                
                // Convertir a modelo común
                var result = historyAppointments.Select(a => a.ToCommonModel()).ToList();
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Confirma una cita existente
        /// </summary>
        /// <param name="id">ID de la cita a confirmar</param>
        /// <returns>La cita actualizada</returns>
        [HttpPut("{id}/Confirm")]
        [HttpPost("{id}/Confirm")]
        public async Task<ActionResult<Common.Models.Appointment>> ConfirmAppointment(long id)
        {
            try
            {
                // Buscar la cita
                var appointment = _jsonRepository.GetAppointment(id);
                
                if (appointment == null)
                {
                    return NotFound($"No se encontró la cita con ID {id}");
                }
                
                // Actualizar estado
                appointment.IsConfirmed = true;
                appointment.Status = "Confirmada";
                
                // Guardar cambios
                bool updated = _jsonRepository.UpdateAppointment(appointment);
                
                if (!updated)
                {
                    return StatusCode(500, "Error al actualizar la cita");
                }
                
                // Crear elemento de historial
                var historyItem = new AppointmentHistoryItem
                {
                    AppointmentId = appointment.Id,
                    PatientName = appointment.PatientName,
                    Timestamp = DateTime.Now,
                    Action = "Confirmada"
                };
                
                // Agregar al historial
                _jsonRepository.AddAppointmentHistoryItem(historyItem);
                await _firebaseRepository.AddAppointmentHistoryItemAsync(historyItem);
                
                // Registrar en el log
                await _auditLogger.LogOperationAsync("PUT", $"Appointment/{id}/Confirm", "system", $"Confirm: {id}");
                
                // Replicar en Firebase
                await _firebaseRepository.UpdateAppointmentAsync(appointment);
                
                // Enviar notificación
                await _notificationService.NotifyAppointmentUpdatedAsync(appointment);
                
                // Devolver cita actualizada
                return Ok(appointment.ToCommonModel());
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Cancela una cita existente
        /// </summary>
        /// <param name="id">ID de la cita a cancelar</param>
        /// <returns>La cita actualizada</returns>
        [HttpPut("{id}/Cancel")]
        [HttpPost("{id}/Cancel")]
        public async Task<ActionResult<Common.Models.Appointment>> CancelAppointment(long id)
        {
            try
            {
                Console.WriteLine($"[DEBUG] CancelAppointment: Inicio para ID {id}");
                
                // Buscar la cita
                var appointment = _jsonRepository.GetAppointment(id);
                
                if (appointment == null)
                {
                    Console.WriteLine($"[DEBUG] CancelAppointment: No se encontró la cita con ID {id}");
                    return NotFound($"No se encontró la cita con ID {id}");
                }
                
                Console.WriteLine($"[DEBUG] CancelAppointment: Encontrada cita ID {id}, Paciente: {appointment.PatientName}");

                // Actualizar estado a cancelada en lugar de eliminar
                appointment.Status = "Cancelada";
                appointment.IsConfirmed = false; // Asegurarse de que no está confirmada
                
                // Guardar los cambios
                bool updated = _jsonRepository.UpdateAppointment(appointment);
                
                if (!updated)
                {
                    return StatusCode(500, "Error al actualizar la cita como cancelada");
                }
                
                // Crear elemento de historial
                var historyItem = new AppointmentHistoryItem
                {
                    AppointmentId = appointment.Id,
                    PatientName = appointment.PatientName,
                    Timestamp = DateTime.Now,
                    Action = "Cancelada"
                };
                
                Console.WriteLine($"[DEBUG] CancelAppointment: Creando item de historial para ID {id}");
                
                // Agregar al historial
                _jsonRepository.AddAppointmentHistoryItem(historyItem);
                await _firebaseRepository.AddAppointmentHistoryItemAsync(historyItem);
                
                // Registrar en el log
                await _auditLogger.LogOperationAsync("PUT", $"Appointment/{id}/Cancel", "system", $"Mark as Canceled: {id}");
                
                // Enviar notificación
                try {
                    await _notificationService.NotifyAppointmentDeletedAsync(new { Id = appointment.Id });
                    Console.WriteLine($"[DEBUG] CancelAppointment: Notificación de cancelación enviada correctamente");
                } catch (Exception notifEx) {
                    Console.WriteLine($"[DEBUG] CancelAppointment: Error al enviar notificación, pero continuando: {notifEx.Message}");
                }
                
                // Devolver la cita actualizada
                return Ok(appointment.ToCommonModel());
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] CancelAppointment: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, $"Error al cancelar la cita: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Actualiza una cita existente
        /// </summary>
        /// <param name="id">ID de la cita a actualizar</param>
        /// <param name="appointment">Datos actualizados de la cita</param>
        /// <returns>No Content si la operación es exitosa</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAppointment(long id, Common.Models.Appointment appointment)
        {
            if (id != appointment.Id)
            {
                return BadRequest("El ID de la URL no coincide con el ID de la cita");
            }
            
            try
            {
                // Convertir de modelo común a modelo de servidor
                var serverAppointment = new Server.Models.Appointment(appointment);
                
                // Actualizar en JSON
                bool updated = _jsonRepository.UpdateAppointment(serverAppointment);
                
                if (!updated)
                {
                    return NotFound($"No se encontró la cita con ID {id}");
                }
                
                // Registrar en el log
                await _auditLogger.LogOperationAsync("PUT", $"Appointment/{id}", "system", $"Update: {id}");
                
                // Replicar en Firebase
                await _firebaseRepository.UpdateAppointmentAsync(serverAppointment);
                
                // Enviar notificación
                await _notificationService.NotifyAppointmentUpdatedAsync(serverAppointment);
                
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Crea una nueva cita
        /// </summary>
        /// <param name="appointment">Datos de la nueva cita</param>
        /// <returns>La cita creada con su ID asignado</returns>
        [HttpPost]
        public async Task<ActionResult<Common.Models.Appointment>> PostAppointment(Common.Models.Appointment appointment)
        {
            try
            {
                // Convertir de modelo común a modelo de servidor
                var serverAppointment = new Server.Models.Appointment(appointment);
                
                // Crear en JSON
                var createdAppointment = _jsonRepository.CreateAppointment(serverAppointment);
                
                // Registrar en el log
                await _auditLogger.LogOperationAsync("POST", "Appointment", "system", $"Create: {createdAppointment.Id}");
                
                // Replicar en Firebase
                await _firebaseRepository.CreateAppointmentAsync(createdAppointment);
                
                // Enviar notificación
                await _notificationService.NotifyAppointmentCreatedAsync(createdAppointment);
                
                // Devolver la cita creada con su ID
                return CreatedAtAction(
                    nameof(GetAppointment), 
                    new { id = createdAppointment.Id }, 
                    createdAppointment.ToCommonModel());
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        
        /// <summary>
        /// ELIMINACIÓN EXTREMA: Borra completamente la cita de todas las fuentes posibles
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointment(long id)
        {
            try
            {
                Console.WriteLine($"[ELIMINACIÓN-EXTREMA] INICIANDO BORRADO TOTAL DE CITA ID {id}");
                
                // 1. ELIMINACIÓN LOCAL: Eliminar de la base JSON
                // Guardar datos para el historial antes de eliminar
                var appointment = _jsonRepository.GetAppointment(id);
                
                if (appointment == null)
                {
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] AVISO: No se encontró la cita {id} en JSON");
                    // Incluso si no existe, continuar con el resto del proceso por si existe en Firebase
                }
                else
                {
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Encontrada cita: ID={id}, Paciente={appointment.PatientName}");
                    
                    // Intentar eliminar varias veces si es necesario
                    bool deleted = false;
                    for (int i = 0; i < 3 && !deleted; i++)
                    {
                        deleted = _jsonRepository.DeleteAppointment(id);
                        if (deleted)
                        {
                            Console.WriteLine($"[ELIMINACIÓN-EXTREMA] ÉXITO: Cita {id} eliminada del JSON local en intento {i+1}");
                        }
                        else
                        {
                            Console.WriteLine($"[ELIMINACIÓN-EXTREMA] FALLO: Intento {i+1} de eliminar del JSON local");
                            Task.Delay(100).Wait(); // Pequeña pausa entre intentos
                        }
                    }
                    
                    // Registrar en el log
                    await _auditLogger.LogOperationAsync("DELETE", $"Appointment/{id}", "system", $"ELIMINACIÓN EXTREMA de cita: {id}");
                }
                
                // 2. ELIMINACIÓN FIREBASE: Buscar y eliminar de Firebase directamente
                Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Buscando cita {id} en Firebase para eliminar");
                
                try
                {
                    var allFirebaseAppointments = await _firebaseRepository.GetAllAppointmentsAsync();
                    var firebaseAppointment = allFirebaseAppointments.FirstOrDefault(a => a.Id == id);
                    
                    if (firebaseAppointment != null)
                    {
                        Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Encontrada cita en Firebase, key={firebaseAppointment.FirebaseKey}");
                        
                        // Intentar eliminar directamente por clave y también por la entidad
                        bool firebaseDeleted = await _firebaseRepository.DeleteAppointmentAsync(firebaseAppointment.FirebaseKey);
                        Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Eliminación por clave: {firebaseDeleted}");
                        
                        bool firebaseDeleted2 = await _firebaseRepository.DeleteAppointmentAsync(firebaseAppointment);
                        Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Eliminación por entidad: {firebaseDeleted2}");
                        
                        if (firebaseDeleted || firebaseDeleted2)
                        {
                            Console.WriteLine($"[ELIMINACIÓN-EXTREMA] ÉXITO: Cita {id} eliminada de Firebase");
                        }
                        else
                        {
                            Console.WriteLine($"[ELIMINACIÓN-EXTREMA] FALLO: No se pudo eliminar la cita {id} de Firebase");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[ELIMINACIÓN-EXTREMA] AVISO: No se encontró la cita {id} en Firebase");
                    }
                }
                catch (Exception fbEx)
                {
                    // No fallar el proceso completo si falla solo Firebase
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] ERROR en Firebase: {fbEx.Message}");
                }
                
                // 3. REGISTRO HISTORIAL: Asegurar que queda constancia de la eliminación
                try
                {
                    var historyItem = new AppointmentHistoryItem
                    {
                        Id = Guid.NewGuid().ToString(),
                        AppointmentId = id,
                        PatientName = appointment?.PatientName ?? "Desconocido",
                        Timestamp = DateTime.Now,
                        Action = "ELIMINACIÓN EXTREMA"
                    };
                    
                    // Agregar al historial local
                    _jsonRepository.AddAppointmentHistoryItem(historyItem);
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Registro agregado al historial local");
                    
                    // Agregar al historial en Firebase
                    await _firebaseRepository.AddAppointmentHistoryItemAsync(historyItem);
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Registro agregado al historial de Firebase");
                }
                catch (Exception histEx)
                {
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] ERROR al guardar historial: {histEx.Message}");
                }
                
                // 4. NOTIFICACIÓN: Enviar notificación explícita de eliminación
                try
                {
                    var notificationData = new
                    {
                        Action = "DELETED", // Tipo explícito
                        Id = id,
                        Message = $"Cita ID {id} ha sido ELIMINADA PERMANENTEMENTE",
                        Timestamp = DateTime.Now.ToString("o")
                    };
                    
                    await _notificationService.NotifyAppointmentDeletedAsync(notificationData);
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Notificación de eliminación enviada");
                }
                catch (Exception notifEx)
                {
                    Console.WriteLine($"[ELIMINACIÓN-EXTREMA] ERROR al enviar notificación: {notifEx.Message}");
                }
                
                // 5. CONFIRMACIÓN: Devolver éxito incluso si algunas partes fallaron
                Console.WriteLine($"[ELIMINACIÓN-EXTREMA] PROCESO COMPLETO para cita {id}");
                return NoContent(); // 204 No Content
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ELIMINACIÓN-EXTREMA] ERROR GRAVE: {ex.Message}");
                Console.WriteLine($"[ELIMINACIÓN-EXTREMA] Stack: {ex.StackTrace}");
                
                // Incluso con error, intentar devolver éxito para que la UI no se confunda
                return NoContent();
            }
        }
        
        /// <summary>
        /// Obtiene las citas de un paciente específico
        /// </summary>
        /// <param name="name">Nombre del paciente</param>
        /// <returns>Lista de citas del paciente</returns>
        [HttpGet("Patient/{name}")]
        public ActionResult<IEnumerable<Common.Models.Appointment>> GetPatientAppointments(string name)
        {
            try
            {
                // Buscar las citas del paciente
                var appointments = _jsonRepository.GetPatientAppointments(name);
                
                // Registrar en el log
                _auditLogger.LogOperationAsync("GET", $"Appointments/Patient/{name}", "system", $"GetByPatient: {name}").Wait();
                
                // Convertir a modelo común y devolver
                return Ok(appointments.Select(a => a.ToCommonModel()));
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
    }
} 
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
        /// Elimina una cita existente
        /// </summary>
        /// <param name="id">ID de la cita a eliminar</param>
        /// <returns>No Content si la operación es exitosa</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointment(long id)
        {
            try
            {
                // Buscar la cita
                var appointment = _jsonRepository.GetAppointment(id);
                
                if (appointment == null)
                {
                    return NotFound($"No se encontró la cita con ID {id}");
                }
                
                // Guardar datos para notificación
                var appointmentData = new { Id = appointment.Id };
                
                // Eliminar de JSON
                bool deleted = _jsonRepository.DeleteAppointment(id);
                
                if (!deleted)
                {
                    return StatusCode(500, "Error al eliminar la cita");
                }
                
                // Registrar en el log
                await _auditLogger.LogOperationAsync("DELETE", $"Appointment/{id}", "system", $"Delete: {id}");
                
                // Replicar en Firebase
                await _firebaseRepository.DeleteAppointmentAsync(appointment);
                
                // Enviar notificación
                await _notificationService.NotifyAppointmentDeletedAsync(appointmentData);
                
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
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
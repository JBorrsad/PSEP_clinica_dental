using Microsoft.AspNetCore.Mvc;
using Server.Security.Authentication;
using Common.Models;
using Server.Data.Json;
using Server.Data.Firebase;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;
using Server.Models;
using Microsoft.AspNetCore.Authorization;

namespace Server.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StaffController : ControllerBase
    {
        private readonly JwtAuthService _jwtAuthService;
        private readonly JsonDataRepository _jsonRepository;
        private readonly FirebaseRepository _firebaseRepository;

        public StaffController(JwtAuthService jwtAuthService, JsonDataRepository jsonRepository, FirebaseRepository firebaseRepository)
        {
            _jwtAuthService = jwtAuthService;
            _jsonRepository = jsonRepository;
            _firebaseRepository = firebaseRepository;
        }

        /// <summary>
        /// Inicia sesión para el personal de la clínica
        /// </summary>
        /// <param name="model">Credenciales de inicio de sesión</param>
        /// <returns>Token JWT si las credenciales son válidas</returns>
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginModel model)
        {
            // Credenciales hardcoded para este ejemplo
            // En un entorno real, esto vendría de una base de datos
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

        /// <summary>
        /// Obtiene todas las citas
        /// </summary>
        /// <returns>Lista de todas las citas</returns>
        [HttpGet("appointments/all")]
        public IActionResult GetAllAppointments()
        {
            var appointments = _jsonRepository.GetAllAppointments();
            return Ok(appointments);
        }

        /// <summary>
        /// Obtiene todas las citas para una fecha específica
        /// </summary>
        /// <param name="date">Fecha en formato yyyy-MM-dd</param>
        /// <returns>Lista de citas para la fecha indicada</returns>
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

        /// <summary>
        /// Obtiene todas las citas pendientes
        /// </summary>
        /// <returns>Lista de citas pendientes</returns>
        [HttpGet("pending")]
        public IActionResult GetPendingAppointments()
        {
            var appointments = _jsonRepository.GetAllAppointments();
            var pendingAppointments = appointments.Where(a => !a.IsConfirmed).ToList();
            
            return Ok(pendingAppointments);
        }

        /// <summary>
        /// Actualiza el estado de una cita
        /// </summary>
        /// <param name="id">ID de la cita</param>
        /// <param name="model">Modelo con el nuevo estado</param>
        /// <returns>Cita actualizada</returns>
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
            
            // Actualizar la cita
            _jsonRepository.UpdateAppointment(appointment);
            await _firebaseRepository.UpdateAppointmentAsync(appointment);
            
            // Agregar al historial
            var historyItem = new Server.Models.AppointmentHistoryItem
            {
                AppointmentId = appointment.Id,
                PatientName = appointment.PatientName,
                Action = model.IsConfirmed ? "Aceptada" : "Reprogramada",
                Timestamp = DateTime.Now
            };
            
            // Agregar al historial JSON local
            _jsonRepository.AddAppointmentHistoryItem(historyItem);
            
            // Replicar en Firebase
            await _firebaseRepository.AddAppointmentHistoryItemAsync(historyItem);
            
            return Ok(appointment);
        }

        /// <summary>
        /// Elimina una cita (rechaza una solicitud)
        /// </summary>
        /// <param name="id">ID de la cita</param>
        /// <returns>Resultado de la operación</returns>
        [HttpDelete("appointments/{id}")]
        public async Task<IActionResult> DeleteAppointment(long id)
        {
            var appointment = _jsonRepository.GetAppointment(id);
            
            if (appointment == null)
            {
                return NotFound(new { message = "Cita no encontrada" });
            }
            
            // Eliminar la cita
            _jsonRepository.DeleteAppointment(id);
            await _firebaseRepository.DeleteAppointmentAsync(appointment.FirebaseKey);
            
            // Agregar al historial
            var historyItem = new Server.Models.AppointmentHistoryItem
            {
                AppointmentId = appointment.Id,
                PatientName = appointment.PatientName,
                Action = "Rechazada",
                Timestamp = DateTime.Now
            };
            
            // Agregar al historial JSON local
            _jsonRepository.AddAppointmentHistoryItem(historyItem);
            
            // Replicar en Firebase
            await _firebaseRepository.AddAppointmentHistoryItemAsync(historyItem);
            
            return Ok(new { message = "Cita eliminada correctamente" });
        }

        /// <summary>
        /// Obtiene el historial de solicitudes
        /// </summary>
        /// <returns>Lista del historial de solicitudes</returns>
        [HttpGet("history")]
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
                    Math.Abs((localItem.Timestamp - fbItem.Timestamp).TotalSeconds) < 5 // Considerar casi mismo timestamp
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
    }

    public class AppointmentStatusModel
    {
        public bool IsConfirmed { get; set; }
        public string? Notes { get; set; }
        public DateTime? AppointmentDateTime { get; set; }
        public string? TreatmentType { get; set; }
    }
} 
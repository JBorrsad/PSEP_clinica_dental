using Microsoft.AspNetCore.Mvc;
using Server.Security.Authentication;
using Common.Models;
using Server.Data.Json;
using Server.Data.Firebase;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

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
            if (model.Username == "staff" && model.Password == "staff123")
            {
                var token = _jwtAuthService.GenerateToken("2", "Staff", "staff");
                
                return Ok(new { 
                    token = token,
                    username = "Staff",
                    role = "staff"
                });
            }
            
            return Unauthorized(new { message = "Usuario o contraseña incorrectos" });
        }

        /// <summary>
        /// Obtiene todas las citas pendientes
        /// </summary>
        /// <returns>Lista de citas pendientes</returns>
        [HttpGet("pending")]
        public IActionResult GetPendingAppointments()
        {
            var appointments = _jsonRepository.GetAllAppointments();
            var pendingAppointments = new List<Server.Models.Appointment>();
            
            foreach (var appointment in appointments)
            {
                if (!appointment.IsConfirmed)
                {
                    pendingAppointments.Add(appointment);
                }
            }
            
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
            appointment.Notes = model.Notes ?? appointment.Notes;
            
            if (model.AppointmentDateTime.HasValue)
            {
                appointment.AppointmentDateTime = model.AppointmentDateTime.Value;
            }
            
            _jsonRepository.UpdateAppointment(appointment);
            await _firebaseRepository.UpdateAppointmentAsync(appointment);
            
            return Ok(appointment);
        }
    }

    public class AppointmentStatusModel
    {
        public bool IsConfirmed { get; set; }
        public string? Notes { get; set; }
        public DateTime? AppointmentDateTime { get; set; }
    }
} 
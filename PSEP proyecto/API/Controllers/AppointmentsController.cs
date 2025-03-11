using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Models;
using API.Services;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentsController : ControllerBase
    {
        private readonly JsonDataRepository _repository;

        public AppointmentsController(JsonDataRepository repository)
        {
            _repository = repository;
        }

        // GET: api/Appointments
        [HttpGet]
        public ActionResult<IEnumerable<Appointment>> GetAppointments()
        {
            return _repository.GetAllAppointments();
        }

        // GET: api/Appointments/5
        [HttpGet("{id}")]
        public ActionResult<Appointment> GetAppointment(long id)
        {
            var appointment = _repository.GetAppointment(id);

            if (appointment == null)
            {
                return NotFound();
            }

            return appointment;
        }

        // GET: api/Appointments/Available/{date}
        [HttpGet("Available/{date}")]
        public ActionResult<IEnumerable<DateTime>> GetAvailableSlots(DateTime date)
        {
            return _repository.GetAvailableSlots(date);
        }

        // PUT: api/Appointments/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAppointment(long id, Appointment appointment)
        {
            if (id != appointment.Id)
            {
                return BadRequest();
            }

            bool success = _repository.UpdateAppointment(appointment);
            
            if (!success)
            {
                return NotFound();
            }
            
            // Notify all connected clients about the update
            await AppointmentNotificationService.NotifyAppointmentUpdatedAsync(appointment);

            return NoContent();
        }

        // POST: api/Appointments
        [HttpPost]
        public async Task<ActionResult<Appointment>> PostAppointment(Appointment appointment)
        {
            // Verificar si el horario ya está ocupado
            var availableSlots = _repository.GetAvailableSlots(appointment.AppointmentDateTime.Date);
            bool isSlotAvailable = availableSlots.Any(slot => 
                Math.Abs((slot - appointment.AppointmentDateTime).TotalMinutes) < 1);

            if (!isSlotAvailable)
            {
                return BadRequest("El horario seleccionado ya está reservado.");
            }

            var createdAppointment = _repository.CreateAppointment(appointment);
            
            // Notify all connected clients about the new appointment
            await AppointmentNotificationService.NotifyAppointmentCreatedAsync(createdAppointment);

            return CreatedAtAction("GetAppointment", new { id = createdAppointment.Id }, createdAppointment);
        }

        // DELETE: api/Appointments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointment(long id)
        {
            bool success = _repository.DeleteAppointment(id);
            
            if (!success)
            {
                return NotFound();
            }
            
            // Notify all connected clients about the deletion
            await AppointmentNotificationService.NotifyAppointmentDeletedAsync(new { Id = id });

            return NoContent();
        }

        // GET: api/Appointments/Patient/{name}
        [HttpGet("Patient/{name}")]
        public ActionResult<IEnumerable<Appointment>> GetPatientAppointments(string name)
        {
            return _repository.GetPatientAppointments(name);
        }
    }
} 
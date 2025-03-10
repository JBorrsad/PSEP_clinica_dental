using System;
using System.Text.Json.Serialization;

namespace Common.Models
{
    /// <summary>
    /// Representa una cita dental que puede ser compartida entre cliente y servidor
    /// </summary>
    public class Appointment
    {
        /// <summary>
        /// Identificador único de la cita
        /// </summary>
        public long Id { get; set; }
        
        /// <summary>
        /// Nombre del paciente
        /// </summary>
        public string PatientName { get; set; }
        
        /// <summary>
        /// Teléfono de contacto del paciente
        /// </summary>
        public string ContactPhone { get; set; }
        
        /// <summary>
        /// Correo electrónico del paciente
        /// </summary>
        public string Email { get; set; }
        
        /// <summary>
        /// Fecha y hora de la cita
        /// </summary>
        public DateTime AppointmentDateTime { get; set; }
        
        /// <summary>
        /// Duración de la cita en minutos
        /// </summary>
        public int DurationMinutes { get; set; } = 30;
        
        /// <summary>
        /// Tratamiento a realizar
        /// </summary>
        public string Treatment { get; set; }
        
        /// <summary>
        /// Tipo específico de tratamiento dental
        /// </summary>
        public string TreatmentType { get; set; }
        
        /// <summary>
        /// Indica si la cita ha sido confirmada
        /// </summary>
        public bool IsConfirmed { get; set; } = false;
        
        /// <summary>
        /// Notas adicionales sobre la cita
        /// </summary>
        public string Notes { get; set; }
        
        /// <summary>
        /// Estado de la cita (Programada, Completada, Cancelada)
        /// </summary>
        public string Status { get; set; } = "Programada";
        
        /// <summary>
        /// Clave específica utilizada en Firebase (solo para uso interno)
        /// </summary>
        [JsonIgnore]
        public string FirebaseKey { get; set; }
        
        /// <summary>
        /// Constructor por defecto
        /// </summary>
        public Appointment()
        {
            PatientName = string.Empty;
            ContactPhone = string.Empty;
            Email = string.Empty;
            Treatment = string.Empty;
            TreatmentType = string.Empty;
            Notes = string.Empty;
            Status = "Programada";
            FirebaseKey = string.Empty;
        }
        
        /// <summary>
        /// Constructor con parámetros esenciales
        /// </summary>
        /// <param name="patientName">Nombre del paciente</param>
        /// <param name="appointmentDateTime">Fecha y hora de la cita</param>
        /// <param name="treatment">Tratamiento a realizar</param>
        public Appointment(string patientName, DateTime appointmentDateTime, string treatment)
        {
            PatientName = patientName;
            ContactPhone = string.Empty;
            Email = string.Empty;
            AppointmentDateTime = appointmentDateTime;
            Treatment = treatment;
            TreatmentType = string.Empty;
            Notes = string.Empty;
            Status = "Programada";
            FirebaseKey = string.Empty;
        }
        
        /// <summary>
        /// Crea una copia profunda de la cita
        /// </summary>
        /// <returns>Una nueva instancia con los mismos valores</returns>
        public Appointment Clone()
        {
            return new Appointment
            {
                Id = this.Id,
                PatientName = this.PatientName,
                ContactPhone = this.ContactPhone,
                Email = this.Email,
                AppointmentDateTime = this.AppointmentDateTime,
                DurationMinutes = this.DurationMinutes,
                Treatment = this.Treatment,
                TreatmentType = this.TreatmentType,
                IsConfirmed = this.IsConfirmed,
                Notes = this.Notes,
                Status = this.Status,
                FirebaseKey = this.FirebaseKey
            };
        }
        
        /// <summary>
        /// Convierte la cita a una representación de cadena
        /// </summary>
        /// <returns>Representación de cadena de la cita</returns>
        public override string ToString()
        {
            return $"Cita #{Id}: {PatientName} - {AppointmentDateTime:dd/MM/yyyy HH:mm} - {Treatment}";
        }
    }
} 
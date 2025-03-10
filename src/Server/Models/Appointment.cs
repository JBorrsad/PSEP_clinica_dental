using System;
using System.Text.Json.Serialization;
using Common.Models;

namespace Server.Models
{
    /// <summary>
    /// Modelo de servidor para citas, extiende el modelo común
    /// </summary>
    public class Appointment : Common.Models.Appointment
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
        /// Fecha y hora de la cita
        /// </summary>
        public DateTime AppointmentDateTime { get; set; }
        
        /// <summary>
        /// Duración de la cita en minutos
        /// </summary>
        public int DurationMinutes { get; set; }
        
        /// <summary>
        /// Tratamiento a realizar
        /// </summary>
        public string Treatment { get; set; }
        
        /// <summary>
        /// Notas adicionales sobre la cita
        /// </summary>
        public string Notes { get; set; }
        
        /// <summary>
        /// Estado de la cita (Programada, Completada, Cancelada)
        /// </summary>
        public string Status { get; set; }
        
        /// <summary>
        /// Clave específica utilizada en Firebase
        /// </summary>
        [JsonIgnore]
        public string FirebaseKey { get; set; }
        
        /// <summary>
        /// Constructor por defecto
        /// </summary>
        public Appointment() : base()
        {
            PatientName = string.Empty;
            Treatment = string.Empty;
            Notes = string.Empty;
            Status = "Programada";
            FirebaseKey = string.Empty;
        }
        
        /// <summary>
        /// Constructor que inicializa a partir de un modelo común
        /// </summary>
        /// <param name="commonAppointment">Modelo común de cita</param>
        public Appointment(Common.Models.Appointment commonAppointment)
        {
            Id = commonAppointment.Id;
            PatientName = commonAppointment.PatientName;
            ContactPhone = commonAppointment.ContactPhone;
            Email = commonAppointment.Email;
            AppointmentDateTime = commonAppointment.AppointmentDateTime;
            DurationMinutes = commonAppointment.DurationMinutes;
            Treatment = commonAppointment.Treatment;
            TreatmentType = commonAppointment.TreatmentType;
            IsConfirmed = commonAppointment.IsConfirmed;
            Notes = commonAppointment.Notes;
            Status = commonAppointment.Status;
        }
        
        /// <summary>
        /// Convierte al modelo común
        /// </summary>
        /// <returns>Una instancia del modelo común</returns>
        public Common.Models.Appointment ToCommonModel()
        {
            return new Common.Models.Appointment
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
                Status = this.Status
            };
        }
    }
} 
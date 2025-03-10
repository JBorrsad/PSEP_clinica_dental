using Common.Models;
using System.Text.Json.Serialization;

namespace Clients.ConsoleClient.Models
{
    /// <summary>
    /// Representa una cita del cliente con campos adicionales para la UI
    /// </summary>
    public class ClientAppointment : Appointment
    {
        /// <summary>
        /// Número de teléfono de contacto del paciente
        /// </summary>
        [JsonPropertyName("contactPhone")]
        public new string ContactPhone { get; set; } = "";

        /// <summary>
        /// Correo electrónico del paciente
        /// </summary>
        [JsonPropertyName("email")]
        public new string Email { get; set; } = "";

        /// <summary>
        /// Tipo de tratamiento a realizar
        /// </summary>
        [JsonPropertyName("treatmentType")]
        public new string TreatmentType { get; set; } = "";

        /// <summary>
        /// Indica si la cita ha sido confirmada
        /// </summary>
        [JsonPropertyName("isConfirmed")]
        public new bool IsConfirmed { get; set; } = false;

        /// <summary>
        /// Constructor por defecto
        /// </summary>
        public ClientAppointment() : base() { }

        /// <summary>
        /// Constructor a partir de un modelo Appointment básico
        /// </summary>
        public ClientAppointment(Appointment appointment) : base()
        {
            if (appointment != null)
            {
                Id = appointment.Id;
                PatientName = appointment.PatientName;
                AppointmentDateTime = appointment.AppointmentDateTime;
                Notes = appointment.Notes;
                
                // Copiar propiedades base si existen en Common.Models.Appointment
                if (appointment.GetType().GetProperty("ContactPhone") != null)
                    ContactPhone = (string?)appointment.GetType().GetProperty("ContactPhone")?.GetValue(appointment) ?? "";

                if (appointment.GetType().GetProperty("Email") != null)
                    Email = (string?)appointment.GetType().GetProperty("Email")?.GetValue(appointment) ?? "";
                
                if (appointment.GetType().GetProperty("TreatmentType") != null)
                    TreatmentType = (string?)appointment.GetType().GetProperty("TreatmentType")?.GetValue(appointment) ?? "";
                
                if (appointment.GetType().GetProperty("IsConfirmed") != null)
                    IsConfirmed = (bool)(appointment.GetType().GetProperty("IsConfirmed")?.GetValue(appointment) ?? false);
            }
        }
    }
} 
using System;
using System.Text.Json.Serialization;

namespace Common.Models.DTOs
{
    public class Appointment
    {
        public long Id { get; set; }
        public string? PatientName { get; set; }
        public string? ContactPhone { get; set; }
        public string? Email { get; set; }
        public DateTime AppointmentDateTime { get; set; }
        public int DurationMinutes { get; set; } = 30;
        public string? TreatmentType { get; set; }
        public string? Notes { get; set; }
        public bool IsConfirmed { get; set; }

        [JsonIgnore]
        public bool IsCompleted => DateTime.Now > AppointmentDateTime.AddMinutes(DurationMinutes);

        [JsonIgnore]
        public string StatusText => IsCompleted ? "Completada" : (IsConfirmed ? "Confirmada" : "Pendiente");
    }
} 
using System;

namespace Server.Models
{
    /// <summary>
    /// Clase para representar un elemento del historial de citas
    /// </summary>
    public class AppointmentHistoryItem
    {
        public string Id { get; set; }
        public long AppointmentId { get; set; }
        public string PatientName { get; set; }
        public string Action { get; set; }
        public DateTime Timestamp { get; set; }
    }
} 
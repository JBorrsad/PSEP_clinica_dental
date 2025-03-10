using System.Text.Json;

namespace Common.Models.DTOs
{
    public class AppointmentNotification
    {
        public string Type { get; set; } = "";
        public string Action { get; set; } = "";
        public JsonElement Data { get; set; }
    }
} 
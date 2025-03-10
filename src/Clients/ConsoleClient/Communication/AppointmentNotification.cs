using System.Text.Json;
using System.Text.Json.Serialization;

namespace Clients.ConsoleClient.Communication
{
    /// <summary>
    /// Representa una notificación de cita recibida del servidor
    /// </summary>
    public class AppointmentNotification
    {
        /// <summary>
        /// Tipo de mensaje (siempre "notification" para notificaciones)
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; } = "notification";

        /// <summary>
        /// Acción realizada sobre la cita (created, updated, deleted)
        /// </summary>
        [JsonPropertyName("action")]
        public string Action { get; set; } = "";

        /// <summary>
        /// Datos de la cita en formato JSON
        /// </summary>
        [JsonPropertyName("data")]
        public JsonElement Data { get; set; }
    }
} 
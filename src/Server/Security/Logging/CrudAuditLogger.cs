using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace Server.Security.Logging
{
    /// <summary>
    /// Registra operaciones CRUD en un archivo de log en formato JSON Lines (JSONL)
    /// </summary>
    public class CrudAuditLogger
    {
        private readonly string _logFilePath;

        /// <summary>
        /// Constructor para el logger de auditoría
        /// </summary>
        /// <param name="logDirectory">Directorio donde se guardarán los logs</param>
        public CrudAuditLogger(string logDirectory)
        {
            // Asegurar que el directorio existe
            if (!Directory.Exists(logDirectory))
            {
                Directory.CreateDirectory(logDirectory);
            }

            // Establecer la ruta del archivo de log
            _logFilePath = Path.Combine(logDirectory, "audit_log.jsonl");
        }

        /// <summary>
        /// Registra una operación en el archivo de log
        /// </summary>
        /// <param name="operation">Tipo de operación (GET, POST, PUT, DELETE)</param>
        /// <param name="resource">Recurso sobre el que se realiza la operación</param>
        /// <param name="user">Usuario que realiza la operación</param>
        /// <param name="details">Detalles adicionales de la operación</param>
        /// <returns>Task que completa cuando la operación ha sido registrada</returns>
        public async Task LogOperationAsync(string operation, string resource, string user, string details)
        {
            var logEntry = new AuditLogEntry
            {
                Timestamp = DateTime.Now,
                Operation = operation,
                Resource = resource,
                User = user,
                Details = details,
                IpAddress = "127.0.0.1" // Simplificado para el ejemplo
            };

            try
            {
                // Serializar la entrada en una sola línea (sin indentación)
                string json = JsonSerializer.Serialize(logEntry);

                // Agregar al archivo como una línea de JSON
                await File.AppendAllTextAsync(_logFilePath, json + Environment.NewLine);
            }
            catch (Exception ex)
            {
                // En un escenario real, querrías manejar esta excepción de manera apropiada
                // Por ejemplo, enviar a un sistema de monitoreo o un log secundario
                Console.Error.WriteLine($"Error al registrar operación: {ex.Message}");
            }
        }

        /// <summary>
        /// Representa una entrada en el log de auditoría
        /// </summary>
        private class AuditLogEntry
        {
            /// <summary>Momento en que ocurrió la operación</summary>
            public DateTime Timestamp { get; set; }
            
            /// <summary>Tipo de operación realizada</summary>
            public string Operation { get; set; }
            
            /// <summary>Recurso sobre el que se realizó la operación</summary>
            public string Resource { get; set; }
            
            /// <summary>Usuario que realizó la operación</summary>
            public string User { get; set; }
            
            /// <summary>Detalles adicionales de la operación</summary>
            public string Details { get; set; }
            
            /// <summary>Dirección IP desde donde se realizó la operación</summary>
            public string IpAddress { get; set; }
        }
    }
} 
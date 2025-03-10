using System;
using System.Text.Json.Serialization;

namespace Common.Models
{
    /// <summary>
    /// Representa una notificación sobre una cita dental
    /// </summary>
    public class AppointmentNotification
    {
        /// <summary>
        /// Tipo de operación que generó la notificación
        /// </summary>
        public string Action { get; set; }
        
        /// <summary>
        /// Hora en que se generó la notificación
        /// </summary>
        public DateTime Timestamp { get; set; }
        
        /// <summary>
        /// Datos de la cita relacionada con la notificación
        /// </summary>
        public object Data { get; set; }
        
        /// <summary>
        /// Constructor por defecto
        /// </summary>
        public AppointmentNotification()
        {
            Action = string.Empty;
            Timestamp = DateTime.Now;
            Data = new { };
        }
        
        /// <summary>
        /// Constructor con parámetros
        /// </summary>
        /// <param name="action">Acción que generó la notificación (CREATED, UPDATED, DELETED)</param>
        /// <param name="data">Datos relacionados con la notificación</param>
        public AppointmentNotification(string action, object data)
        {
            Action = action;
            Timestamp = DateTime.Now;
            Data = data;
        }
        
        /// <summary>
        /// Crea una notificación para una cita creada
        /// </summary>
        /// <param name="appointment">Cita que se ha creado</param>
        /// <returns>Una notificación con datos de la cita</returns>
        public static AppointmentNotification Created(Appointment appointment)
        {
            return new AppointmentNotification("CREATED", appointment);
        }
        
        /// <summary>
        /// Crea una notificación para una cita actualizada
        /// </summary>
        /// <param name="appointment">Cita que se ha actualizado</param>
        /// <returns>Una notificación con datos de la cita</returns>
        public static AppointmentNotification Updated(Appointment appointment)
        {
            return new AppointmentNotification("UPDATED", appointment);
        }
        
        /// <summary>
        /// Crea una notificación para una cita eliminada
        /// </summary>
        /// <param name="appointmentId">Datos identificativos de la cita eliminada</param>
        /// <returns>Una notificación con el ID de la cita</returns>
        public static AppointmentNotification Deleted(object appointmentId)
        {
            return new AppointmentNotification("DELETED", appointmentId);
        }
    }
} 
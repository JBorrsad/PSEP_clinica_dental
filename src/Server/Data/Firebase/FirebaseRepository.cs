using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Server.Models;

namespace Server.Data.Firebase
{
    /// <summary>
    /// Proporciona métodos para sincronizar datos con Firebase Realtime Database
    /// Cumple con el RA4 - Servicios en red para replicar datos en Firebase
    /// </summary>
    public class FirebaseRepository
    {
        private readonly string _firebaseUrl;
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;

        /// <summary>
        /// Constructor del repositorio Firebase
        /// </summary>
        /// <param name="firebaseUrl">URL base de Firebase</param>
        /// <param name="apiKey">Clave API de Firebase</param>
        public FirebaseRepository(string firebaseUrl, string apiKey)
        {
            _firebaseUrl = firebaseUrl.TrimEnd('/');
            _apiKey = apiKey;
            _httpClient = new HttpClient();
        }

        #region Appointment Methods

        /// <summary>
        /// Obtiene todas las citas desde Firebase
        /// </summary>
        /// <returns>Lista de citas</returns>
        public async Task<List<Server.Models.Appointment>> GetAllAppointmentsAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_firebaseUrl}/appointments.json?auth={_apiKey}");
                response.EnsureSuccessStatusCode();
                
                var firebaseResponse = await response.Content.ReadFromJsonAsync<Dictionary<string, Server.Models.Appointment>>();
                
                if (firebaseResponse == null || !firebaseResponse.Any())
                {
                    return new List<Server.Models.Appointment>();
                }
                
                return firebaseResponse.Select(kvp =>
                {
                    var appointment = kvp.Value;
                    appointment.FirebaseKey = kvp.Key;
                    return appointment;
                }).ToList();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error al obtener citas de Firebase: {ex.Message}");
                return new List<Server.Models.Appointment>();
            }
        }

        /// <summary>
        /// Obtiene una cita específica por su ID
        /// </summary>
        /// <param name="id">ID de la cita</param>
        /// <returns>La cita encontrada o null</returns>
        public async Task<Server.Models.Appointment> GetAppointmentAsync(long id)
        {
            var appointments = await GetAllAppointmentsAsync();
            return appointments.FirstOrDefault(a => a.Id == id);
        }

        /// <summary>
        /// Crea una nueva cita en Firebase
        /// </summary>
        /// <param name="appointment">Datos de la cita</param>
        /// <returns>La cita creada con su ID asignado</returns>
        public async Task<Server.Models.Appointment> CreateAppointmentAsync(Server.Models.Appointment appointment)
        {
            var json = JsonSerializer.Serialize(appointment);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync($"{_firebaseUrl}/appointments.json?auth={_apiKey}", content);
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<FirebaseResponse>();
            if (result != null)
            {
                appointment.FirebaseKey = result.Name;
            }
            
            return appointment;
        }

        /// <summary>
        /// Actualiza una cita existente en Firebase
        /// </summary>
        /// <param name="appointment">Datos actualizados de la cita</param>
        /// <returns>True si se actualizó correctamente, False en caso contrario</returns>
        public async Task<bool> UpdateAppointmentAsync(Server.Models.Appointment appointment)
        {
            // Si no tenemos la clave de Firebase, buscar la cita por su ID
            if (string.IsNullOrEmpty(appointment.FirebaseKey))
            {
                var existingAppointment = await GetAppointmentAsync(appointment.Id);
                if (existingAppointment == null)
                {
                    return false;
                }
                
                appointment.FirebaseKey = existingAppointment.FirebaseKey;
            }
            
            var json = JsonSerializer.Serialize(appointment);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PutAsync(
                $"{_firebaseUrl}/appointments/{appointment.FirebaseKey}.json?auth={_apiKey}", 
                content);
            
            return response.IsSuccessStatusCode;
        }

        /// <summary>
        /// Elimina una cita de Firebase
        /// </summary>
        /// <param name="appointment">Cita a eliminar</param>
        /// <returns>True si se eliminó correctamente, False en caso contrario</returns>
        public async Task<bool> DeleteAppointmentAsync(Server.Models.Appointment appointment)
        {
            // Si no tenemos la clave de Firebase, buscar la cita por su ID
            if (string.IsNullOrEmpty(appointment.FirebaseKey))
            {
                var existingAppointment = await GetAppointmentAsync(appointment.Id);
                if (existingAppointment == null)
                {
                    return false;
                }
                
                appointment.FirebaseKey = existingAppointment.FirebaseKey;
            }
            
            var response = await _httpClient.DeleteAsync(
                $"{_firebaseUrl}/appointments/{appointment.FirebaseKey}.json?auth={_apiKey}");
            
            return response.IsSuccessStatusCode;
        }

        #endregion
    }

    /// <summary>
    /// Extensión del modelo Appointment para incluir la clave de Firebase
    /// </summary>
    public partial class Appointment
    {
        [System.Text.Json.Serialization.JsonIgnore] // No serializar a Firebase
        public string FirebaseKey { get; set; }
    }

    /// <summary>
    /// Clase auxiliar para deserializar la respuesta de Firebase
    /// </summary>
    internal class FirebaseResponse
    {
        /// <summary>
        /// Nombre/clave generada por Firebase
        /// </summary>
        public string Name { get; set; } = string.Empty;
    }
} 
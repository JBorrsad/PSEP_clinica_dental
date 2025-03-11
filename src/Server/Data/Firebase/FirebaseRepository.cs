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
            try 
            {
                Console.WriteLine($"[FIREBASE] Intentando eliminar cita con ID {appointment.Id}");
                
                // Si no tenemos la clave de Firebase, buscar la cita por su ID
                if (string.IsNullOrEmpty(appointment.FirebaseKey))
                {
                    Console.WriteLine($"[FIREBASE] No se tiene clave Firebase para la cita {appointment.Id}, buscando...");
                    
                    // Obtener todas las citas para encontrar la que coincide con nuestro ID
                    var allAppointments = await GetAllAppointmentsAsync();
                    Console.WriteLine($"[FIREBASE] Se encontraron {allAppointments.Count} citas en Firebase");
                    
                    var existingAppointment = allAppointments.FirstOrDefault(a => a.Id == appointment.Id);
                    if (existingAppointment == null)
                    {
                        Console.WriteLine($"[FIREBASE] No se encontró la cita {appointment.Id} en Firebase");
                        return false;
                    }
                    
                    appointment.FirebaseKey = existingAppointment.FirebaseKey;
                    Console.WriteLine($"[FIREBASE] Se encontró la cita {appointment.Id} con clave Firebase: {appointment.FirebaseKey}");
                }
                
                Console.WriteLine($"[FIREBASE] Eliminando cita ID {appointment.Id} con clave Firebase: {appointment.FirebaseKey}");
                
                // Intentar eliminar directamente con la clave
                var url = $"{_firebaseUrl}/appointments/{appointment.FirebaseKey}.json?auth={_apiKey}";
                Console.WriteLine($"[FIREBASE] URL de eliminación: {url}");
                
                var response = await _httpClient.DeleteAsync(url);
                
                Console.WriteLine($"[FIREBASE] Respuesta de Firebase: Status={response.StatusCode}, Contenido={await response.Content.ReadAsStringAsync()}");
                
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[FIREBASE] Cita ID {appointment.Id} eliminada exitosamente de Firebase");
                    return true;
                }
                else
                {
                    Console.WriteLine($"[FIREBASE] Error al eliminar cita ID {appointment.Id}: {response.StatusCode}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FIREBASE] Error en DeleteAppointmentAsync: {ex.Message}");
                Console.WriteLine($"[FIREBASE] StackTrace: {ex.StackTrace}");
                return false;
            }
        }

        /// <summary>
        /// Elimina una cita de Firebase usando su clave
        /// </summary>
        /// <param name="firebaseKey">Clave de Firebase de la cita</param>
        /// <returns>True si se eliminó correctamente, False en caso contrario</returns>
        public async Task<bool> DeleteAppointmentAsync(string firebaseKey)
        {
            if (string.IsNullOrEmpty(firebaseKey))
            {
                return false;
            }
            
            var response = await _httpClient.DeleteAsync(
                $"{_firebaseUrl}/appointments/{firebaseKey}.json?auth={_apiKey}");
            
            return response.IsSuccessStatusCode;
        }

        /// <summary>
        /// Agrega un elemento al historial de citas en Firebase
        /// </summary>
        /// <param name="historyItem">Elemento del historial a agregar</param>
        /// <returns>Tarea asíncrona</returns>
        public async Task AddAppointmentHistoryItemAsync(AppointmentHistoryItem historyItem)
        {
            try
            {
                string historyJson = JsonSerializer.Serialize(historyItem);
                var historyData = JsonDocument.Parse(historyJson).RootElement;
                
                // Convertir el objeto a diccionario para Firebase
                Dictionary<string, object> historyDict = new Dictionary<string, object>();
                foreach (var property in historyData.EnumerateObject())
                {
                    historyDict[property.Name] = property.Value.ToString();
                }
                
                // Añadir marca de tiempo para ordenación en Firebase
                historyDict["timestamp"] = historyItem.Timestamp.ToString("o");
                
                await _httpClient
                    .PostAsync($"{_firebaseUrl}/appointmentHistory.json?auth={_apiKey}", new StringContent(JsonSerializer.Serialize(historyDict), Encoding.UTF8, "application/json"));
                
                Console.WriteLine($"Historial de cita agregado a Firebase: {historyItem.PatientName}, Acción: {historyItem.Action}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al agregar historial a Firebase: {ex.Message}");
            }
        }

        /// <summary>
        /// Obtiene todo el historial de citas desde Firebase
        /// </summary>
        /// <returns>Lista de elementos del historial</returns>
        public async Task<List<AppointmentHistoryItem>> GetAppointmentHistoryAsync()
        {
            try
            {
                var historySnapshot = await _httpClient
                    .GetAsync($"{_firebaseUrl}/appointmentHistory.json?auth={_apiKey}");
                historySnapshot.EnsureSuccessStatusCode();
                
                var historyJson = await historySnapshot.Content.ReadAsStringAsync();
                var historyData = JsonDocument.Parse(historyJson).RootElement;
                
                var historyList = new List<AppointmentHistoryItem>();
                
                foreach (var item in historyData.EnumerateObject())
                {
                    var data = item.Value;
                    
                    var historyItem = new AppointmentHistoryItem
                    {
                        AppointmentId = data.TryGetProperty("AppointmentId", out var idElement) ? 
                                        long.Parse(idElement.ToString()) : 0,
                        PatientName = data.TryGetProperty("PatientName", out var nameElement) ? 
                                        nameElement.ToString() : "",
                        Action = data.TryGetProperty("Action", out var actionElement) ? 
                                 actionElement.ToString() : "",
                        Timestamp = data.TryGetProperty("timestamp", out var timeElement) ? 
                                   DateTime.Parse(timeElement.ToString()) : 
                                   DateTime.Now
                    };
                    
                    historyList.Add(historyItem);
                }
                
                return historyList;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener historial desde Firebase: {ex.Message}");
                return new List<AppointmentHistoryItem>();
            }
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
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Common.Models;
using Clients.ConsoleClient.Models;
using Clients.ConsoleClient.Security;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace Clients.ConsoleClient.Communication
{
    public class ApiClient
    {
        // Configuration
        private readonly IConfiguration _configuration;
        private readonly string _apiBaseUrl;
        private readonly string _notificationServer;
        private readonly int _notificationPort;
        
        // HTTP client
        private readonly HttpClient _httpClient = new HttpClient();
        
        // Socket notification settings
        private TcpClient? _notificationClient;
        private NetworkStream? _notificationStream;
        
        // Flag to indicate if we're connected to the notification server
        private bool _notificationConnected = false;
        
        // Encryption service
        private readonly EncryptionService _encryptionService;

        public ApiClient()
        {
            // Load configuration
            _configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .Build();
                
            // Get settings from configuration
            _apiBaseUrl = _configuration["ApiSettings:BaseUrl"] ?? "http://localhost:5021/api/Appointments";
            _notificationServer = _configuration["NotificationSettings:Server"] ?? "127.0.0.1";
            _notificationPort = int.Parse(_configuration["NotificationSettings:Port"] ?? "11000");
            
            // Initialize encryption service
            _encryptionService = new EncryptionService();
        }

        public async Task StartClientAsync()
        {
            try
            {
                // Connect to the notification server
                await ConnectToNotificationServerAsync();
                
                // Start listening for notifications
                if (_notificationConnected)
                {
                    _ = Task.Run(() => ListenForNotificationsAsync());
                }

                // Display the main menu
                var menu = new UI.Menu(this);
                await menu.DisplayMainMenuAsync();
            }
            finally
            {
                // Clean up resources
                _notificationClient?.Close();
                _notificationStream?.Dispose();
            }
        }

        private async Task ConnectToNotificationServerAsync()
        {
            try
            {
                Console.WriteLine("Conectando al servidor de notificaciones...");
                
                _notificationClient = new TcpClient();
                await _notificationClient.ConnectAsync(_notificationServer, _notificationPort);
                _notificationStream = _notificationClient.GetStream();
                
                // Primero recibir la clave pública del servidor
                var streamReader = new StreamReader(_notificationStream);
                string serverPublicKey = await streamReader.ReadLineAsync();
                
                // Luego enviar nuestra clave pública al servidor
                var streamWriter = new StreamWriter(_notificationStream) { AutoFlush = true };
                string publicKey = _encryptionService.GetPublicKey();
                await streamWriter.WriteLineAsync(publicKey);
                
                Console.WriteLine("Conectado al servidor de notificaciones");
                _notificationConnected = true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al conectar al servidor de notificaciones: {ex.Message}");
                Console.WriteLine("Las notificaciones en tiempo real no estarán disponibles");
                _notificationConnected = false;
            }
        }

        private async Task ListenForNotificationsAsync()
        {
            try
            {
                var streamReader = new StreamReader(_notificationStream);
                
                while (_notificationConnected && _notificationStream != null)
                {
                    string encryptedMessage = await streamReader.ReadLineAsync();
                    if (string.IsNullOrEmpty(encryptedMessage))
                    {
                        Console.WriteLine("La conexión con el servidor de notificaciones se ha cerrado");
                        _notificationConnected = false;
                        break;
                    }
                    
                    string jsonMessage = _encryptionService.Decrypt(encryptedMessage);
                    
                    try
                    {
                        if (!string.IsNullOrEmpty(jsonMessage))
                        {
                            AppointmentNotification? notification = JsonSerializer.Deserialize<AppointmentNotification>(jsonMessage);
                            if (notification != null)
                            {
                                HandleNotification(notification);
                            }
                        }
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"Error al procesar la notificación: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en la conexión de notificaciones: {ex.Message}");
                _notificationConnected = false;
            }
        }

        private void HandleNotification(AppointmentNotification notification)
        {
            if (notification.Type != "notification") return;
            
            Console.WriteLine();
            
            // Obtener timestamp actual
            string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            
            // Determinar el color y texto según la operación
            ConsoleColor color;
            string operationName;
            string detailsText = "";
            
            switch (notification.Action.ToLower())
            {
                case "created":
                    color = ConsoleColor.Green;
                    operationName = "CREACIÓN";
                    var newAppointment = JsonSerializer.Deserialize<Appointment>(notification.Data.GetRawText());
                    detailsText = $"Paciente: {newAppointment?.PatientName}\n" +
                                $"Fecha y hora: {newAppointment?.AppointmentDateTime:dd/MM/yyyy HH:mm}\n" +
                                $"Tratamiento: {newAppointment?.Treatment}\n" +
                                $"Duración: {newAppointment?.DurationMinutes} minutos";
                    break;
                
                case "updated":
                    color = ConsoleColor.Yellow;
                    operationName = "ACTUALIZACIÓN";
                    var updatedAppointment = JsonSerializer.Deserialize<Appointment>(notification.Data.GetRawText());
                    detailsText = $"Paciente: {updatedAppointment?.PatientName}\n" +
                                $"Fecha y hora: {updatedAppointment?.AppointmentDateTime:dd/MM/yyyy HH:mm}\n" +
                                $"Tratamiento: {updatedAppointment?.Treatment}\n" +
                                $"Estado: {updatedAppointment?.Status}";
                    break;
                
                case "deleted":
                    color = ConsoleColor.Red;
                    operationName = "ELIMINACIÓN";
                    try
                    {
                        // Intentar extraer el ID si está disponible
                        var deletedData = JsonDocument.Parse(notification.Data.GetRawText());
                        if (deletedData.RootElement.TryGetProperty("Id", out var idElement))
                        {
                            detailsText = $"ID de cita: {idElement}";
                        }
                        else
                        {
                            detailsText = $"Datos: {notification.Data}";
                        }
                    }
                    catch
                    {
                        detailsText = $"Datos: {notification.Data}";
                    }
                    break;
                
                default:
                    color = ConsoleColor.Blue;
                    operationName = $"ACCIÓN: {notification.Action}";
                    detailsText = $"Datos: {notification.Data}";
                    break;
            }
            
            // Mostrar el evento en formato de registro de monitor
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write($"[{timestamp}] ");
            
            Console.ForegroundColor = color;
            Console.WriteLine($"OPERACIÓN: {operationName}");
            
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine(detailsText);
            
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("─────────────────────────────────────────────────────");
            Console.ResetColor();
        }

        public async Task ViewAllAppointmentsAsync()
        {
            Console.Clear();
            Console.WriteLine("Obteniendo citas...");
            
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(_apiBaseUrl);
                response.EnsureSuccessStatusCode();
                
                var appointments = await response.Content.ReadFromJsonAsync<List<Appointment>>();
                
                Console.Clear();
                Console.WriteLine("=============== TODAS LAS CITAS ===============");
                
                if (appointments != null && appointments.Count > 0)
                {
                    foreach (var apt in appointments)
                    {
                        Console.WriteLine($"ID: {apt.Id} | Paciente: {apt.PatientName} | Fecha: {apt.AppointmentDateTime}");
                    }
                }
                else
                {
                    Console.WriteLine("No hay citas programadas");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener las citas: {ex.Message}");
            }
        }

        public async Task ViewAvailableSlotsAsync()
        {
            Console.Clear();
            Console.WriteLine("============ HORARIOS DISPONIBLES ============");
            Console.Write("Introduzca la fecha (DD/MM/YYYY): ");
            string? dateInput = Console.ReadLine();
            
            if (!DateTime.TryParse(dateInput, out DateTime date))
            {
                Console.WriteLine("Formato de fecha inválido");
                return;
            }
            
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync($"{_apiBaseUrl}/Available/{date:yyyy-MM-dd}");
                response.EnsureSuccessStatusCode();
                
                var availableSlots = await response.Content.ReadFromJsonAsync<List<DateTime>>();
                
                Console.Clear();
                Console.WriteLine($"======== HORARIOS DISPONIBLES: {date:dd/MM/yyyy} ========");
                
                if (availableSlots != null && availableSlots.Count > 0)
                {
                    int i = 1;
                    foreach (var slot in availableSlots)
                    {
                        Console.WriteLine($"{i++}. {slot:HH:mm}");
                    }
                }
                else
                {
                    Console.WriteLine("No hay horarios disponibles para esta fecha");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener los horarios disponibles: {ex.Message}");
            }
        }

        public async Task BookAppointmentAsync()
        {
            Console.Clear();
            Console.WriteLine("============ RESERVAR CITA ============");
            
            // Crear una nueva instancia del modelo de cita del cliente
            var appointment = new ClientAppointment();
            
            // Obtener los datos del paciente
            Console.Write("Nombre del paciente: ");
            appointment.PatientName = Console.ReadLine() ?? "";
            
            Console.Write("Teléfono de contacto: ");
            appointment.ContactPhone = Console.ReadLine() ?? "";
            
            Console.Write("Email: ");
            appointment.Email = Console.ReadLine() ?? "";
            
            // Obtener la fecha
            bool validDate = false;
            DateTime dateTime = DateTime.Now;
            
            while (!validDate)
            {
                Console.Write("Fecha de la cita (DD/MM/YYYY): ");
                string? dateInput = Console.ReadLine();
                
                if (DateTime.TryParse(dateInput, out DateTime date))
                {
                    // Mostrar horarios disponibles
                    try
                    {
                        HttpResponseMessage response = await _httpClient.GetAsync($"{_apiBaseUrl}/Available/{date:yyyy-MM-dd}");
                        response.EnsureSuccessStatusCode();
                        
                        var availableSlots = await response.Content.ReadFromJsonAsync<List<DateTime>>();
                        
                        if (availableSlots != null && availableSlots.Count > 0)
                        {
                            Console.WriteLine("\nHorarios disponibles:");
                            for (int i = 0; i < availableSlots.Count; i++)
                            {
                                Console.WriteLine($"{i + 1}. {availableSlots[i]:HH:mm}");
                            }
                            
                            // Seleccionar un horario
                            bool validSlot = false;
                            while (!validSlot)
                            {
                                Console.Write("Seleccione un horario (número): ");
                                string? slotInput = Console.ReadLine();
                                
                                if (int.TryParse(slotInput, out int slotIndex) && slotIndex > 0 && slotIndex <= availableSlots.Count)
                                {
                                    dateTime = availableSlots[slotIndex - 1];
                                    validDate = true;
                                    validSlot = true;
                                }
                                else
                                {
                                    Console.WriteLine("Selección no válida. Intente de nuevo.");
                                }
                            }
                        }
                        else
                        {
                            Console.WriteLine("No hay horarios disponibles para esta fecha. Seleccione otra fecha.");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error al obtener los horarios disponibles: {ex.Message}");
                    }
                }
                else
                {
                    Console.WriteLine("Formato de fecha inválido. Intente de nuevo.");
                }
            }
            
            appointment.AppointmentDateTime = dateTime;
            
            // Obtener el tipo de tratamiento
            Console.Write("Tipo de tratamiento: ");
            appointment.TreatmentType = Console.ReadLine() ?? "";
            
            // Obtener notas adicionales
            Console.Write("Notas adicionales (opcional): ");
            appointment.Notes = Console.ReadLine() ?? "";
            
            // Enviar la solicitud al servidor
            try
            {
                HttpResponseMessage response = await _httpClient.PostAsJsonAsync(_apiBaseUrl, appointment);
                response.EnsureSuccessStatusCode();
                
                var createdAppointment = await response.Content.ReadFromJsonAsync<Appointment>();
                
                Console.Clear();
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("¡Cita reservada con éxito!");
                Console.ResetColor();
                Console.WriteLine($"ID de la cita: {createdAppointment?.Id}");
                Console.WriteLine($"Paciente: {createdAppointment?.PatientName}");
                Console.WriteLine($"Fecha y hora: {createdAppointment?.AppointmentDateTime}");
                Console.WriteLine($"Tipo de tratamiento: {appointment.TreatmentType}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error al reservar la cita: {ex.Message}");
                Console.ResetColor();
            }
        }

        public async Task ViewAppointmentDetailsAsync()
        {
            Console.Clear();
            Console.WriteLine("========== DETALLES DE LA CITA ==========");
            Console.Write("Introduzca el ID de la cita: ");
            string? idInput = Console.ReadLine();
            
            if (!Guid.TryParse(idInput, out Guid id))
            {
                Console.WriteLine("ID no válido");
                return;
            }
            
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync($"{_apiBaseUrl}/{id}");
                response.EnsureSuccessStatusCode();
                
                // Deserializar a Appointment y luego convertir a ClientAppointment
                var baseAppointment = await response.Content.ReadFromJsonAsync<Appointment>();
                var appointment = new ClientAppointment(baseAppointment);
                
                // En un sistema real, aquí consultaríamos los detalles adicionales
                // Para simplificar, asignamos valores de ejemplo para los campos adicionales
                appointment.ContactPhone = "(Información no disponible)";
                appointment.Email = "(Información no disponible)";
                appointment.TreatmentType = "(Información no disponible)";
                appointment.IsConfirmed = true;
                
                Console.Clear();
                Console.WriteLine($"=========== CITA ID: {appointment.Id} ===========");
                Console.WriteLine($"Paciente: {appointment.PatientName}");
                Console.WriteLine($"Fecha y hora: {appointment.AppointmentDateTime}");
                Console.WriteLine($"Teléfono: {appointment.ContactPhone}");
                Console.WriteLine($"Email: {appointment.Email}");
                Console.WriteLine($"Tipo de tratamiento: {appointment.TreatmentType}");
                Console.WriteLine($"Estado: {(appointment.IsConfirmed ? "Confirmada" : "Pendiente de confirmación")}");
                Console.WriteLine($"Notas: {appointment.Notes ?? "Sin notas"}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener los detalles de la cita: {ex.Message}");
            }
        }

        public async Task CancelAppointmentAsync()
        {
            Console.Clear();
            Console.WriteLine("============ CANCELAR CITA ============");
            Console.Write("Introduzca el ID de la cita a cancelar: ");
            string? idInput = Console.ReadLine();
            
            if (!Guid.TryParse(idInput, out Guid id))
            {
                Console.WriteLine("ID no válido");
                return;
            }
            
            try
            {
                // Primero verificamos que la cita existe
                HttpResponseMessage getResponse = await _httpClient.GetAsync($"{_apiBaseUrl}/{id}");
                getResponse.EnsureSuccessStatusCode();
                
                var appointment = await getResponse.Content.ReadFromJsonAsync<Appointment>();
                
                if (appointment != null)
                {
                    Console.WriteLine($"Cita encontrada: {appointment.PatientName} - {appointment.AppointmentDateTime:dd/MM/yyyy HH:mm}");
                    Console.Write("¿Está seguro de que desea cancelar esta cita? (S/N): ");
                    string? confirmInput = Console.ReadLine();
                    
                    if (confirmInput?.ToUpper() == "S")
                    {
                        HttpResponseMessage deleteResponse = await _httpClient.DeleteAsync($"{_apiBaseUrl}/{id}");
                        deleteResponse.EnsureSuccessStatusCode();
                        
                        Console.Clear();
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("Cita cancelada con éxito");
                        Console.ResetColor();
                    }
                    else
                    {
                        Console.WriteLine("Operación cancelada");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al cancelar la cita: {ex.Message}");
            }
        }
    }
} 
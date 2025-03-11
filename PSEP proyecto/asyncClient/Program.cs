using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class Appointment
{
    public long Id { get; set; }
    public string? PatientName { get; set; }
    public string? ContactPhone { get; set; }
    public DateTime AppointmentDateTime { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public string? TreatmentType { get; set; }
    public string? Notes { get; set; }
    public bool IsConfirmed { get; set; }
}

public class AppointmentNotification
{
    public string Type { get; set; } = "";
    public string Action { get; set; } = "";
    public JsonElement Data { get; set; }
}

public class ApiClient
{
    // REST API settings
    private const string API_BASE_URL = "http://localhost:5021/api/Appointments";
    private readonly HttpClient _httpClient = new HttpClient();
    
    // Socket notification settings
    private const string NOTIFICATION_SERVER = "127.0.0.1";
    private const int NOTIFICATION_PORT = 11000;
    private TcpClient _notificationClient;
    private NetworkStream _notificationStream;
    
    // Flag to indicate if we're connected to the notification server
    private bool _notificationConnected = false;

    public async Task StartClientAsync()
    {
        try
        {
            // Connect to the notification server
            await ConnectToNotificationServerAsync();
            
            // Display menu and handle user input
            await DisplayMenuAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Client] Exception: {ex}");
        }
        finally
        {
            // Close the notification client
            _notificationClient?.Close();
        }
    }
    
    private async Task ConnectToNotificationServerAsync()
    {
        try
        {
            _notificationClient = new TcpClient();
            await _notificationClient.ConnectAsync(NOTIFICATION_SERVER, NOTIFICATION_PORT);
            _notificationStream = _notificationClient.GetStream();
            _notificationConnected = true;
            
            Console.WriteLine($"[Client] Connected to notification server at {NOTIFICATION_SERVER}:{NOTIFICATION_PORT}");
            
            // Start listening for notifications in a separate task
            _ = Task.Run(ListenForNotificationsAsync);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Client] Failed to connect to notification server: {ex.Message}");
            Console.WriteLine("[Client] Continuing without real-time notifications.");
        }
    }
    
    private async Task ListenForNotificationsAsync()
    {
        try
        {
            byte[] buffer = new byte[4096];
            StringBuilder sb = new StringBuilder();
            
            while (_notificationConnected)
            {
                int bytesRead = await _notificationStream.ReadAsync(buffer, 0, buffer.Length);
                if (bytesRead <= 0) break;
                
                sb.Append(Encoding.UTF8.GetString(buffer, 0, bytesRead));
                
                // Process complete messages (line by line)
                string content = sb.ToString();
                int newLineIndex;
                while ((newLineIndex = content.IndexOf('\n')) >= 0)
                {
                    string message = content.Substring(0, newLineIndex).Trim();
                    sb.Remove(0, newLineIndex + 1);
                    content = sb.ToString();
                    
                    if (!string.IsNullOrEmpty(message))
                    {
                        try
                        {
                            var notification = JsonSerializer.Deserialize<AppointmentNotification>(message);
                            HandleNotification(notification);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[Client] Error parsing notification: {ex.Message}");
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Client] Notification listener error: {ex.Message}");
            _notificationConnected = false;
        }
    }
    
    private void HandleNotification(AppointmentNotification notification)
    {
        if (notification == null) return;
        
        Console.WriteLine("\n[NOTIFICATION] ----------------------------------------");
        Console.WriteLine($"Action: {notification.Action}");
        
        if (notification.Action == "created")
        {
            Console.WriteLine("A new appointment has been created!");
            try
            {
                var appointment = JsonSerializer.Deserialize<Appointment>(notification.Data.GetRawText());
                Console.WriteLine($"Patient: {appointment?.PatientName}");
                Console.WriteLine($"Time: {appointment?.AppointmentDateTime.ToString("g")}");
            }
            catch
            {
                Console.WriteLine("Could not parse appointment details.");
            }
        }
        else if (notification.Action == "updated")
        {
            Console.WriteLine("An appointment has been updated!");
            try
            {
                var appointment = JsonSerializer.Deserialize<Appointment>(notification.Data.GetRawText());
                Console.WriteLine($"Patient: {appointment?.PatientName}");
                Console.WriteLine($"Time: {appointment?.AppointmentDateTime.ToString("g")}");
            }
            catch
            {
                Console.WriteLine("Could not parse appointment details.");
            }
        }
        else if (notification.Action == "deleted")
        {
            Console.WriteLine("An appointment has been deleted!");
            try
            {
                var data = JsonDocument.Parse(notification.Data.GetRawText());
                if (data.RootElement.TryGetProperty("Id", out var idElement))
                {
                    Console.WriteLine($"Appointment ID: {idElement}");
                }
            }
            catch
            {
                Console.WriteLine("Could not parse deletion details.");
            }
        }
        
        Console.WriteLine("--------------------------------------------------------");
        Console.Write("\nEnter option: ");
    }
    
    private async Task DisplayMenuAsync()
    {
        bool exit = false;
        
        while (!exit)
        {
            Console.WriteLine("\n===== Dental Clinic Client =====");
            Console.WriteLine("1. View all appointments");
            Console.WriteLine("2. View available time slots");
            Console.WriteLine("3. Book an appointment");
            Console.WriteLine("4. View appointment details");
            Console.WriteLine("5. Cancel an appointment");
            Console.WriteLine("6. Exit");
            Console.Write("\nEnter option: ");
            
            string option = Console.ReadLine() ?? "";
            
            switch (option)
            {
                case "1":
                    await ViewAllAppointmentsAsync();
                    break;
                case "2":
                    await ViewAvailableSlotsAsync();
                    break;
                case "3":
                    await BookAppointmentAsync();
                    break;
                case "4":
                    await ViewAppointmentDetailsAsync();
                    break;
                case "5":
                    await CancelAppointmentAsync();
                    break;
                case "6":
                    exit = true;
                    break;
                default:
                    Console.WriteLine("Invalid option, please try again.");
                    break;
            }
        }
    }
    
    private async Task ViewAllAppointmentsAsync()
    {
        try
        {
            Console.WriteLine("\nFetching all appointments...");
            var appointments = await _httpClient.GetFromJsonAsync<List<Appointment>>(API_BASE_URL);
            
            if (appointments == null || appointments.Count == 0)
            {
                Console.WriteLine("No appointments found.");
                return;
            }
            
            Console.WriteLine("\n--- All Appointments ---");
            foreach (var appointment in appointments.OrderBy(a => a.AppointmentDateTime))
            {
                Console.WriteLine($"ID: {appointment.Id} | {appointment.PatientName} | {appointment.AppointmentDateTime:g} | {appointment.TreatmentType}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching appointments: {ex.Message}");
        }
    }
    
    private async Task ViewAvailableSlotsAsync()
    {
        try
        {
            Console.Write("Enter date (YYYY-MM-DD): ");
            string dateInput = Console.ReadLine() ?? DateTime.Today.ToString("yyyy-MM-dd");
            
            if (!DateTime.TryParse(dateInput, out DateTime date))
            {
                Console.WriteLine("Invalid date format. Using today's date.");
                date = DateTime.Today;
            }
            
            string url = $"{API_BASE_URL}/Available/{date:yyyy-MM-dd}";
            var availableSlots = await _httpClient.GetFromJsonAsync<List<DateTime>>(url);
            
            if (availableSlots == null || availableSlots.Count == 0)
            {
                Console.WriteLine("No available slots for the selected date.");
                return;
            }
            
            Console.WriteLine($"\n--- Available Slots for {date:yyyy-MM-dd} ---");
            int i = 1;
            foreach (var slot in availableSlots)
            {
                Console.WriteLine($"{i++}. {slot:HH:mm}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching available slots: {ex.Message}");
        }
    }
    
    private async Task BookAppointmentAsync()
    {
        try
        {
            var appointment = new Appointment();
            
            Console.Write("Patient name: ");
            appointment.PatientName = Console.ReadLine();
            
            Console.Write("Contact phone: ");
            appointment.ContactPhone = Console.ReadLine();
            
            Console.Write("Date (YYYY-MM-DD): ");
            string dateInput = Console.ReadLine() ?? "";
            
            Console.Write("Time (HH:MM): ");
            string timeInput = Console.ReadLine() ?? "";
            
            string dateTimeString = $"{dateInput} {timeInput}";
            if (!DateTime.TryParse(dateTimeString, out DateTime appointmentDateTime))
            {
                Console.WriteLine("Invalid date/time format.");
                return;
            }
            
            appointment.AppointmentDateTime = appointmentDateTime;
            
            Console.Write("Treatment type: ");
            appointment.TreatmentType = Console.ReadLine();
            
            Console.Write("Notes: ");
            appointment.Notes = Console.ReadLine();
            
            Console.Write("Duration (minutes, default 30): ");
            string durationInput = Console.ReadLine() ?? "";
            if (!string.IsNullOrEmpty(durationInput) && int.TryParse(durationInput, out int duration))
            {
                appointment.DurationMinutes = duration;
            }
            
            appointment.IsConfirmed = true;
            
            var response = await _httpClient.PostAsJsonAsync(API_BASE_URL, appointment);
            
            if (response.IsSuccessStatusCode)
            {
                var createdAppointment = await response.Content.ReadFromJsonAsync<Appointment>();
                Console.WriteLine($"\nAppointment booked successfully! ID: {createdAppointment?.Id}");
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Failed to book appointment: {error}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error booking appointment: {ex.Message}");
        }
    }
    
    private async Task ViewAppointmentDetailsAsync()
    {
        try
        {
            Console.Write("Enter appointment ID: ");
            if (!long.TryParse(Console.ReadLine(), out long id))
            {
                Console.WriteLine("Invalid ID format.");
                return;
            }
            
            var appointment = await _httpClient.GetFromJsonAsync<Appointment>($"{API_BASE_URL}/{id}");
            
            if (appointment == null)
            {
                Console.WriteLine("Appointment not found.");
                return;
            }
            
            Console.WriteLine("\n--- Appointment Details ---");
            Console.WriteLine($"ID: {appointment.Id}");
            Console.WriteLine($"Patient: {appointment.PatientName}");
            Console.WriteLine($"Phone: {appointment.ContactPhone}");
            Console.WriteLine($"Date/Time: {appointment.AppointmentDateTime:g}");
            Console.WriteLine($"Duration: {appointment.DurationMinutes} minutes");
            Console.WriteLine($"Treatment: {appointment.TreatmentType}");
            Console.WriteLine($"Notes: {appointment.Notes}");
            Console.WriteLine($"Confirmed: {(appointment.IsConfirmed ? "Yes" : "No")}");
        }
        catch (HttpRequestException ex) when (ex.Message.Contains("404"))
        {
            Console.WriteLine("Appointment not found.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching appointment details: {ex.Message}");
        }
    }
    
    private async Task CancelAppointmentAsync()
    {
        try
        {
            Console.Write("Enter appointment ID to cancel: ");
            if (!long.TryParse(Console.ReadLine(), out long id))
            {
                Console.WriteLine("Invalid ID format.");
                return;
            }
            
            var response = await _httpClient.DeleteAsync($"{API_BASE_URL}/{id}");
            
            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine("Appointment cancelled successfully!");
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                Console.WriteLine("Appointment not found.");
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Failed to cancel appointment: {error}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error cancelling appointment: {ex.Message}");
        }
    }
}

class Program
{
    public static async Task Main(string[] args)
    {
        var client = new ApiClient();
        await client.StartClientAsync();
    }
}

using System.Text.Json;
using API.Models;

namespace API.Services
{
    public class JsonDataRepository
    {
        private readonly string _dataDirectory;
        private readonly string _appointmentsFile;
        private List<Appointment> _appointments;
        private static readonly object _lockObject = new object();

        public JsonDataRepository(IWebHostEnvironment environment)
        {
            // Configurar la ruta de almacenamiento
            _dataDirectory = Path.Combine(environment.ContentRootPath, "Data");
            _appointmentsFile = Path.Combine(_dataDirectory, "appointments.json");
            
            // Asegurar que el directorio existe
            if (!Directory.Exists(_dataDirectory))
            {
                Directory.CreateDirectory(_dataDirectory);
            }

            // Cargar datos iniciales
            _appointments = LoadAppointments();
        }

        // Métodos para Appointment
        public List<Appointment> GetAllAppointments()
        {
            return _appointments;
        }

        public Appointment GetAppointment(long id)
        {
            return _appointments.FirstOrDefault(a => a.Id == id);
        }

        public Appointment CreateAppointment(Appointment appointment)
        {
            lock (_lockObject)
            {
                // Generar ID único si no tiene
                if (appointment.Id <= 0)
                {
                    appointment.Id = _appointments.Count > 0 ? _appointments.Max(a => a.Id) + 1 : 1;
                }

                _appointments.Add(appointment);
                SaveAppointments();
                return appointment;
            }
        }

        public bool UpdateAppointment(Appointment appointment)
        {
            lock (_lockObject)
            {
                var index = _appointments.FindIndex(a => a.Id == appointment.Id);
                if (index == -1) return false;
                
                _appointments[index] = appointment;
                SaveAppointments();
                return true;
            }
        }

        public bool DeleteAppointment(long id)
        {
            lock (_lockObject)
            {
                var appointment = _appointments.FirstOrDefault(a => a.Id == id);
                if (appointment == null) return false;
                
                _appointments.Remove(appointment);
                SaveAppointments();
                return true;
            }
        }

        // Métodos para consultas específicas
        public List<Appointment> GetPatientAppointments(string patientName)
        {
            return _appointments
                .Where(a => a.PatientName != null && a.PatientName.Contains(patientName, StringComparison.OrdinalIgnoreCase))
                .OrderBy(a => a.AppointmentDateTime)
                .ToList();
        }

        public List<DateTime> GetAvailableSlots(DateTime date)
        {
            // Obtener citas para el día especificado
            var dayAppointments = _appointments
                .Where(a => a.AppointmentDateTime.Date == date.Date)
                .OrderBy(a => a.AppointmentDateTime)
                .ToList();

            // Crear una lista de todos los slots posibles (cada 30 minutos de 9 AM a 5 PM)
            var allSlots = new List<DateTime>();
            DateTime startTime = date.Date.AddHours(9); // 9 AM
            DateTime endTime = date.Date.AddHours(17);  // 5 PM

            while (startTime < endTime)
            {
                allSlots.Add(startTime);
                startTime = startTime.AddMinutes(30); // 30 minutos por cita
            }

            // Eliminar los slots que ya están reservados
            foreach (var appointment in dayAppointments)
            {
                var slotsToRemove = new List<DateTime>();
                foreach (var slot in allSlots)
                {
                    if (slot >= appointment.AppointmentDateTime && 
                        slot < appointment.AppointmentDateTime.AddMinutes(appointment.DurationMinutes))
                    {
                        slotsToRemove.Add(slot);
                    }
                }
                foreach (var slot in slotsToRemove)
                {
                    allSlots.Remove(slot);
                }
            }

            return allSlots;
        }

        // Métodos privados para cargar/guardar datos
        private List<Appointment> LoadAppointments()
        {
            lock (_lockObject)
            {
                if (!File.Exists(_appointmentsFile))
                {
                    return new List<Appointment>();
                }

                try
                {
                    string json = File.ReadAllText(_appointmentsFile);
                    return JsonSerializer.Deserialize<List<Appointment>>(json) ?? new List<Appointment>();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error loading appointments: {ex.Message}");
                    return new List<Appointment>();
                }
            }
        }

        private void SaveAppointments()
        {
            lock (_lockObject)
            {
                try
                {
                    var options = new JsonSerializerOptions { WriteIndented = true };
                    string json = JsonSerializer.Serialize(_appointments, options);
                    File.WriteAllText(_appointmentsFile, json);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error saving appointments: {ex.Message}");
                }
            }
        }
    }
} 
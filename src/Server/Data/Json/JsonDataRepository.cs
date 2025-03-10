using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Server.Models;

namespace Server.Data.Json
{
    /// <summary>
    /// Repositorio para almacenar y recuperar citas en archivos JSON
    /// </summary>
    public class JsonDataRepository
    {
        private readonly string _dataDirectory;
        private readonly string _appointmentsFile;
        
        /// <summary>
        /// Constructor del repositorio JSON
        /// </summary>
        /// <param name="dataDirectory">Directorio donde se almacenarán los archivos JSON</param>
        public JsonDataRepository(string dataDirectory)
        {
            _dataDirectory = dataDirectory;
            _appointmentsFile = Path.Combine(_dataDirectory, "appointments.json");
            
            // Asegurar que el directorio existe
            if (!Directory.Exists(_dataDirectory))
            {
                Directory.CreateDirectory(_dataDirectory);
            }
            
            // Crear archivo de citas si no existe
            if (!File.Exists(_appointmentsFile))
            {
                File.WriteAllText(_appointmentsFile, "[]");
            }
        }
        
        /// <summary>
        /// Obtiene todas las citas
        /// </summary>
        /// <returns>Lista de todas las citas</returns>
        public List<Appointment> GetAllAppointments()
        {
            return LoadAppointments();
        }
        
        /// <summary>
        /// Obtiene una cita específica por su ID
        /// </summary>
        /// <param name="id">ID de la cita a buscar</param>
        /// <returns>Cita encontrada o null si no existe</returns>
        public Appointment GetAppointment(long id)
        {
            var appointments = LoadAppointments();
            return appointments.FirstOrDefault(a => a.Id == id);
        }
        
        /// <summary>
        /// Crea una nueva cita
        /// </summary>
        /// <param name="appointment">Datos de la cita a crear</param>
        /// <returns>Cita creada con su ID asignado</returns>
        public Appointment CreateAppointment(Appointment appointment)
        {
            var appointments = LoadAppointments();
            
            // Asignar un ID único (el mayor ID + 1)
            appointment.Id = appointments.Count > 0 
                ? appointments.Max(a => a.Id) + 1 
                : 1;
            
            appointments.Add(appointment);
            SaveAppointments(appointments);
            
            return appointment;
        }
        
        /// <summary>
        /// Actualiza una cita existente
        /// </summary>
        /// <param name="appointment">Datos actualizados de la cita</param>
        /// <returns>true si se actualizó con éxito, false si no se encontró</returns>
        public bool UpdateAppointment(Appointment appointment)
        {
            var appointments = LoadAppointments();
            var index = appointments.FindIndex(a => a.Id == appointment.Id);
            
            if (index == -1)
            {
                return false;
            }
            
            appointments[index] = appointment;
            SaveAppointments(appointments);
            
            return true;
        }
        
        /// <summary>
        /// Elimina una cita por su ID
        /// </summary>
        /// <param name="id">ID de la cita a eliminar</param>
        /// <returns>true si se eliminó con éxito, false si no se encontró</returns>
        public bool DeleteAppointment(long id)
        {
            var appointments = LoadAppointments();
            var removedCount = appointments.RemoveAll(a => a.Id == id);
            
            if (removedCount > 0)
            {
                SaveAppointments(appointments);
                return true;
            }
            
            return false;
        }
        
        /// <summary>
        /// Obtiene las citas de un paciente específico
        /// </summary>
        /// <param name="patientName">Nombre del paciente</param>
        /// <returns>Lista de citas del paciente</returns>
        public List<Appointment> GetPatientAppointments(string patientName)
        {
            var appointments = LoadAppointments();
            return appointments.Where(a => a.PatientName.Contains(patientName, StringComparison.OrdinalIgnoreCase)).ToList();
        }
        
        /// <summary>
        /// Obtiene los horarios disponibles para una fecha específica
        /// </summary>
        /// <param name="date">Fecha a consultar</param>
        /// <returns>Lista de horarios disponibles</returns>
        public List<DateTime> GetAvailableSlots(DateTime date)
        {
            // Definir horarios disponibles (9:00 a 18:00, cada 30 minutos)
            var availableSlots = new List<DateTime>();
            var startTime = new DateTime(date.Year, date.Month, date.Day, 9, 0, 0);
            var endTime = new DateTime(date.Year, date.Month, date.Day, 18, 0, 0);
            
            for (var time = startTime; time <= endTime; time = time.AddMinutes(30))
            {
                availableSlots.Add(time);
            }
            
            // Obtener citas para el día seleccionado
            var appointments = LoadAppointments();
            var dayAppointments = appointments
                .Where(a => a.AppointmentDateTime.Date == date.Date)
                .ToList();
            
            // Eliminar horarios ocupados
            foreach (var appointment in dayAppointments)
            {
                var start = appointment.AppointmentDateTime;
                var end = start.AddMinutes(appointment.DurationMinutes);
                
                // Eliminar slots que se superpongan con esta cita
                availableSlots.RemoveAll(slot => 
                    slot >= start && slot < end);
            }
            
            return availableSlots;
        }
        
        /// <summary>
        /// Carga las citas desde el archivo JSON
        /// </summary>
        /// <returns>Lista de citas</returns>
        private List<Appointment> LoadAppointments()
        {
            try
            {
                var json = File.ReadAllText(_appointmentsFile);
                var appointments = JsonSerializer.Deserialize<List<Appointment>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                return appointments ?? new List<Appointment>();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error al cargar las citas: {ex.Message}");
                return new List<Appointment>();
            }
        }
        
        /// <summary>
        /// Guarda las citas en el archivo JSON
        /// </summary>
        /// <param name="appointments">Lista de citas a guardar</param>
        private void SaveAppointments(List<Appointment> appointments)
        {
            try
            {
                var options = new JsonSerializerOptions
                {
                    WriteIndented = true
                };
                
                var json = JsonSerializer.Serialize(appointments, options);
                File.WriteAllText(_appointmentsFile, json);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error al guardar las citas: {ex.Message}");
                throw;
            }
        }
    }
} 
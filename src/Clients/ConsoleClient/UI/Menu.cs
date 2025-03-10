using System;
using System.Threading.Tasks;

namespace Clients.ConsoleClient.UI
{
    public class Menu
    {
        private readonly Communication.ApiClient _apiClient;

        public Menu(Communication.ApiClient apiClient)
        {
            _apiClient = apiClient;
        }

        public async Task DisplayMainMenuAsync()
        {
            bool exit = false;
            while (!exit)
            {
                Console.Clear();
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine("=======================================================");
                Console.WriteLine("       SISTEMA DE GESTIÓN DE CITAS - CLÍNICA DENTAL    ");
                Console.WriteLine("=======================================================");
                Console.ResetColor();
                Console.WriteLine("\nSeleccione una opción:");
                Console.WriteLine("1. Ver todas las citas");
                Console.WriteLine("2. Ver horarios disponibles");
                Console.WriteLine("3. Reservar una cita");
                Console.WriteLine("4. Ver detalles de una cita");
                Console.WriteLine("5. Cancelar una cita");
                Console.WriteLine("0. Salir");
                Console.Write("\nOpción: ");

                string input = Console.ReadLine();

                try
                {
                    switch (input)
                    {
                        case "1":
                            await _apiClient.ViewAllAppointmentsAsync();
                            break;
                        case "2":
                            await _apiClient.ViewAvailableSlotsAsync();
                            break;
                        case "3":
                            await _apiClient.BookAppointmentAsync();
                            break;
                        case "4":
                            await _apiClient.ViewAppointmentDetailsAsync();
                            break;
                        case "5":
                            await _apiClient.CancelAppointmentAsync();
                            break;
                        case "0":
                            exit = true;
                            break;
                        default:
                            Console.WriteLine("Opción no válida. Pulse cualquier tecla para continuar...");
                            Console.ReadKey();
                            break;
                    }
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"Error: {ex.Message}");
                    Console.ResetColor();
                    Console.WriteLine("Pulse cualquier tecla para continuar...");
                    Console.ReadKey();
                }

                if (!exit)
                {
                    Console.WriteLine("\nPulse cualquier tecla para continuar...");
                    Console.ReadKey();
                }
            }
        }
    }
} 
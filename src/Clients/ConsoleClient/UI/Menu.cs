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
            Console.Clear();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("=======================================================");
            Console.WriteLine("       MONITOR DE OPERACIONES - CLÍNICA DENTAL         ");
            Console.WriteLine("=======================================================");
            Console.ResetColor();
            Console.WriteLine("\nEste cliente muestra las operaciones CRUD realizadas en tiempo real.");
            Console.WriteLine("Las notificaciones aparecerán automáticamente cuando se realicen cambios desde la aplicación web.");
            Console.WriteLine("\nConectado al servidor de notificaciones y listo para recibir eventos.");
            Console.WriteLine("Presione Ctrl+C para salir del monitor.");
            
            // Mantener la aplicación corriendo indefinidamente hasta que el usuario la cierre
            try
            {
                // Simple bucle de espera que mantiene la aplicación en ejecución
                await Task.Delay(-1); // Esto esperará indefinidamente
            }
            catch (TaskCanceledException)
            {
                // Esto ocurrirá cuando se cierre la aplicación
            }
        }
    }
} 
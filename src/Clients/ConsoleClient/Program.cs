using System;
using System.Threading.Tasks;
using Clients.ConsoleClient.Communication;

namespace Clients.ConsoleClient
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.Title = "Cliente Clínica Dental";
            
            try
            {
                var apiClient = new ApiClient();
                await apiClient.StartClientAsync();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error fatal: {ex.Message}");
                Console.ResetColor();
                Console.WriteLine("Pulse cualquier tecla para salir...");
                Console.ReadKey();
            }
        }
    }
}

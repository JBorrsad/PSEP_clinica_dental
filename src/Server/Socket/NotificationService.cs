using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Common.Models;
using Server.Models;
using Server.Security.Encryption;

namespace Server.Socket
{
    /// <summary>
    /// Servicio de notificaciones en tiempo real que gestiona la comunicación con clientes TCP y WebSocket
    /// </summary>
    public class NotificationService
    {
        private readonly int _port = 11000;
        private TcpListener _tcpListener;
        private readonly ConcurrentDictionary<string, TcpClient> _tcpClients;
        private readonly ConcurrentDictionary<string, WebSocket> _webSocketClients;
        private readonly AsymmetricEncryptionService _encryptionService;
        private readonly ConcurrentDictionary<string, string> _clientPublicKeys;
        
        /// <summary>
        /// Constructor del servicio de notificaciones
        /// </summary>
        /// <param name="encryptionService">Servicio de cifrado asimétrico</param>
        public NotificationService(AsymmetricEncryptionService encryptionService)
        {
            _encryptionService = encryptionService;
            _tcpClients = new ConcurrentDictionary<string, TcpClient>();
            _webSocketClients = new ConcurrentDictionary<string, WebSocket>();
            _clientPublicKeys = new ConcurrentDictionary<string, string>();
            _tcpListener = new TcpListener(IPAddress.Any, _port);
        }
        
        /// <summary>
        /// Inicia el servidor de notificaciones TCP en segundo plano
        /// </summary>
        public void StartNotificationServer()
        {
            _tcpListener = new TcpListener(IPAddress.Any, _port);
            
            Task.Run(async () =>
            {
                try
                {
                    _tcpListener.Start();
                    Console.WriteLine($"Servidor de notificaciones escuchando en puerto {_port}");
                    
                    while (true)
                    {
                        var client = await _tcpListener.AcceptTcpClientAsync();
                        var clientId = $"tcp-{Guid.NewGuid()}";
                        
                        // Manejar un nuevo cliente
                        _ = HandleClientConnectionAsync(clientId, client);
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Error en el servidor de notificaciones: {ex.Message}");
                }
            });
        }
        
        /// <summary>
        /// Gestiona la conexión con un cliente TCP
        /// </summary>
        /// <param name="clientId">ID único del cliente</param>
        /// <param name="client">Cliente TCP conectado</param>
        private async Task HandleClientConnectionAsync(string clientId, TcpClient client)
        {
            _tcpClients.TryAdd(clientId, client);
            Console.WriteLine($"Cliente {clientId} conectado");
            
            try
            {
                // Configurar stream para comunicación
                var netStream = client.GetStream();
                var reader = new StreamReader(netStream);
                var writer = new StreamWriter(netStream) { AutoFlush = true };
                
                // Enviar la clave pública del servidor
                var serverPublicKey = _encryptionService.GetPublicKey();
                await writer.WriteLineAsync(serverPublicKey);
                
                // Recibir la clave pública del cliente
                var clientPublicKey = await reader.ReadLineAsync();
                if (!string.IsNullOrEmpty(clientPublicKey))
                {
                    _clientPublicKeys.TryAdd(clientId, clientPublicKey);
                    
                    // Verificar la clave con un mensaje de prueba
                    if (_encryptionService.VerifyClientKey(clientPublicKey, out string testMessage))
                    {
                        // Enviar un mensaje de bienvenida cifrado
                        var welcomeNotification = new AppointmentNotification("CONNECTED", 
                            new { Message = $"Bienvenido. Las notificaciones empezarán a llegar pronto." });
                        
                        var encryptedMessage = _encryptionService.Encrypt(
                            JsonSerializer.Serialize(welcomeNotification), clientPublicKey);
                        
                        await writer.WriteLineAsync(encryptedMessage);
                    }
                }
                
                // Mantener la conexión abierta y manejar desconexiones
                while (client.Connected)
                {
                    await Task.Delay(1000);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error con cliente {clientId}: {ex.Message}");
            }
            finally
            {
                // Limpiar al desconectar
                _tcpClients.TryRemove(clientId, out _);
                _clientPublicKeys.TryRemove(clientId, out _);
                client.Close();
                Console.WriteLine($"Cliente {clientId} desconectado");
            }
        }
        
        /// <summary>
        /// Registra un cliente WebSocket
        /// </summary>
        /// <param name="webSocket">WebSocket conectado</param>
        /// <returns>ID único del cliente</returns>
        public string RegisterWebSocketClient(WebSocket webSocket)
        {
            string clientId = $"ws-{Guid.NewGuid()}";
            _webSocketClients.TryAdd(clientId, webSocket);
            Console.WriteLine($"WebSocket {clientId} conectado");
            
            // Enviar mensaje de bienvenida
            Task.Run(async () =>
            {
                try
                {
                    var welcomeNotification = new AppointmentNotification("CONNECTED", 
                        new { Message = $"Conexión WebSocket establecida. Las notificaciones empezarán a llegar pronto." });
                    
                    await SendWebSocketMessageAsync(clientId, JsonSerializer.Serialize(welcomeNotification));
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Error al enviar mensaje de bienvenida a {clientId}: {ex.Message}");
                }
            });
            
            return clientId;
        }
        
        /// <summary>
        /// Elimina un cliente WebSocket
        /// </summary>
        /// <param name="clientId">ID del cliente a eliminar</param>
        public void RemoveWebSocketClient(string clientId)
        {
            if (_webSocketClients.TryRemove(clientId, out _))
            {
                Console.WriteLine($"WebSocket {clientId} desconectado");
            }
        }
        
        /// <summary>
        /// Envía un mensaje a través de WebSocket
        /// </summary>
        /// <param name="clientId">ID del cliente</param>
        /// <param name="message">Mensaje a enviar</param>
        private async Task SendWebSocketMessageAsync(string clientId, string message)
        {
            if (_webSocketClients.TryGetValue(clientId, out WebSocket webSocket) && 
                webSocket.State == WebSocketState.Open)
            {
                try
                {
                    var buffer = Encoding.UTF8.GetBytes(message);
                    await webSocket.SendAsync(
                        new ArraySegment<byte>(buffer), 
                        WebSocketMessageType.Text, 
                        true, 
                        CancellationToken.None);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Error al enviar mensaje a {clientId}: {ex.Message}");
                    RemoveWebSocketClient(clientId);
                }
            }
        }
        
        /// <summary>
        /// Notifica a todos los clientes que se ha creado una cita
        /// </summary>
        /// <param name="appointment">Cita creada</param>
        public async Task NotifyAppointmentCreatedAsync(Server.Models.Appointment appointment)
        {
            var commonAppointment = appointment.ToCommonModel();
            var notification = new AppointmentNotification("CREATED", commonAppointment);
            await NotifyAllClientsAsync(notification);
        }
        
        /// <summary>
        /// Notifica a todos los clientes que se ha actualizado una cita
        /// </summary>
        /// <param name="appointment">Cita actualizada</param>
        public async Task NotifyAppointmentUpdatedAsync(Server.Models.Appointment appointment)
        {
            var commonAppointment = appointment.ToCommonModel();
            var notification = new AppointmentNotification("UPDATED", commonAppointment);
            await NotifyAllClientsAsync(notification);
        }
        
        /// <summary>
        /// Notifica a todos los clientes que se ha eliminado una cita
        /// </summary>
        /// <param name="appointmentData">Datos de la cita eliminada (normalmente solo el ID)</param>
        public async Task NotifyAppointmentDeletedAsync(object appointmentData)
        {
            var notification = new AppointmentNotification("DELETED", appointmentData);
            await NotifyAllClientsAsync(notification);
        }
        
        /// <summary>
        /// Envía una notificación a todos los clientes conectados
        /// </summary>
        /// <param name="notification">Notificación a enviar</param>
        private async Task NotifyAllClientsAsync(AppointmentNotification notification)
        {
            string json = JsonSerializer.Serialize(notification);
            Console.WriteLine($"Enviando notificación: {json}");
            
            // Notificar a los clientes WebSocket
            foreach (var clientId in _webSocketClients.Keys)
            {
                await SendWebSocketMessageAsync(clientId, json);
            }
            
            // Notificar a los clientes TCP
            foreach (var clientEntry in _tcpClients)
            {
                var clientId = clientEntry.Key;
                var client = clientEntry.Value;
                
                if (client.Connected && _clientPublicKeys.TryGetValue(clientId, out string publicKey))
                {
                    try
                    {
                        // Cifrar el mensaje con la clave pública del cliente
                        var encryptedMessage = _encryptionService.Encrypt(json, publicKey);
                        
                        var writer = new StreamWriter(client.GetStream()) { AutoFlush = true };
                        await writer.WriteLineAsync(encryptedMessage);
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"Error al enviar notificación a {clientId}: {ex.Message}");
                        
                        // Intentar cerrar la conexión si hay error
                        try
                        {
                            client.Close();
                        }
                        catch { }
                        
                        // Eliminar el cliente de las colecciones
                        _tcpClients.TryRemove(clientId, out _);
                        _clientPublicKeys.TryRemove(clientId, out _);
                    }
                }
            }
        }
    }
} 
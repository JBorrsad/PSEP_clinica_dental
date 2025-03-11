using System.IdentityModel.Tokens.Jwt;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Server.Data.Firebase;
using Server.Data.Json;
using Server.Security.Authentication;
using Server.Security.Encryption;
using Server.Security.Logging;
using Server.Socket;

var builder = WebApplication.CreateBuilder(args);

// Configuración de Firebase
var firebaseConfig = new
{
    FirebaseUrl = "https://psep-d6a75-default-rtdb.europe-west1.firebasedatabase.app/",
    ApiKey = "AIzaSyDMu2FOHNOXwcwXh_SK7fXo8wyx83nx340"
};

// Configuración de CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// Configuración de JWT
var jwtSecretKey = "Clave_Segura_Para_JWT_Tokens_PSEP_2023";
var jwtIssuer = "ClinicaDental.API";
var jwtAudience = "ClinicaDental.Clients";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSecretKey))
        };
    });

// Agregar servicios al contenedor
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Registrar servicios
builder.Services.AddSingleton<JwtAuthService>(provider => 
    new JwtAuthService(jwtSecretKey, jwtIssuer, jwtAudience));
builder.Services.AddSingleton<AsymmetricEncryptionService>();
builder.Services.AddSingleton<JsonDataRepository>(provider => 
    new JsonDataRepository(Path.Combine(builder.Environment.ContentRootPath, "Data")));
builder.Services.AddSingleton<FirebaseRepository>(provider => 
    new FirebaseRepository(firebaseConfig.FirebaseUrl, firebaseConfig.ApiKey));
builder.Services.AddSingleton<CrudAuditLogger>(provider => 
    new CrudAuditLogger(Path.Combine(builder.Environment.ContentRootPath, "Logs")));
builder.Services.AddSingleton<NotificationService>();

var app = builder.Build();

// Configurar el middleware HTTP
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();

// Configuración para servir archivos estáticos del cliente web
// Ruta base para archivos estáticos (WebClient)
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "..", "..", "Clients", "WebClient")),
    RequestPath = ""
});

// Ruta para el panel de administración
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "..", "..", "Clients", "WebClient", "admin")),
    RequestPath = "/admin"
});

app.UseAuthentication();
app.UseAuthorization();

// Iniciar el servicio de notificaciones
var notificationService = app.Services.GetRequiredService<NotificationService>();
notificationService.StartNotificationServer();

// Configurar endpoint para WebSockets
app.UseWebSockets();
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/ws")
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
            var clientId = app.Services.GetRequiredService<NotificationService>()
                .RegisterWebSocketClient(webSocket);
            
            // Mantener la conexión abierta hasta que el cliente se desconecte
            await KeepWebSocketAliveAsync(webSocket, clientId, app.Services.GetRequiredService<NotificationService>());
        }
        else
        {
            context.Response.StatusCode = 400; // Bad Request
        }
    }
    else
    {
        await next();
    }
});

app.MapControllers();

app.Run();

// Método para mantener viva la conexión WebSocket
async Task KeepWebSocketAliveAsync(WebSocket webSocket, string clientId, NotificationService notificationService)
{
    var buffer = new byte[1024];
    try
    {
        while (webSocket.State == WebSocketState.Open)
        {
            var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                notificationService.RemoveWebSocketClient(clientId);
                break;
            }
        }
    }
    catch (Exception)
    {
        // Manejar las desconexiones abruptas
        if (webSocket.State != WebSocketState.Closed && webSocket.State != WebSocketState.Aborted)
        {
            await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Error", CancellationToken.None);
        }
        notificationService.RemoveWebSocketClient(clientId);
    }
} 
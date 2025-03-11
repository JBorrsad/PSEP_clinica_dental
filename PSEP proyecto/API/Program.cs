using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using API.Models;
using API.Services;
using System.Net.WebSockets;
using System.Threading;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder
                .AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
        });
});

// Configuración JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "your-256-bit-secret"))
        };
    });

builder.Services.AddControllers();

// Registrar el repositorio JSON como servicio singleton para mantener los datos en memoria
builder.Services.AddSingleton<JsonDataRepository>();

// Mantener AppointmentContext para compatibilidad con código existente, pero sin usarlo para Appointments
builder.Services.AddDbContext<AppointmentContext>(opt =>
    opt.UseInMemoryDatabase("OtherData"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Habilitar WebSockets
app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromMinutes(2)
});

// Endpoint para conexiones WebSocket
app.Map("/ws", async context =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        // Añadir el socket a la lista de clientes websocket conectados
        AppointmentNotificationService.AddWebSocketClient(webSocket);
        // Mantener la conexión abierta
        await KeepWebSocketAlive(webSocket);
    }
    else
    {
        context.Response.StatusCode = 400;
    }
});

app.MapControllers();

// Start the appointment notification service
AppointmentNotificationService.StartServer();

// Método para mantener la conexión WebSocket activa
async Task KeepWebSocketAlive(WebSocket webSocket)
{
    var buffer = new byte[1024 * 4];
    try
    {
        // Mantener la conexión abierta hasta que se cierre o se produzca un error
        WebSocketReceiveResult result = await webSocket.ReceiveAsync(
            new ArraySegment<byte>(buffer), CancellationToken.None);

        while (!result.CloseStatus.HasValue)
        {
            result = await webSocket.ReceiveAsync(
                new ArraySegment<byte>(buffer), CancellationToken.None);
        }

        // Cerrar la conexión adecuadamente
        await webSocket.CloseAsync(
            result.CloseStatus.Value, 
            result.CloseStatusDescription, 
            CancellationToken.None);
    }
    catch (Exception)
    {
        // Si hay error, cerrar la conexión
        if (webSocket.State == WebSocketState.Open)
        {
            await webSocket.CloseAsync(
                WebSocketCloseStatus.InternalServerError,
                "Error interno del servidor",
                CancellationToken.None);
        }
    }
    finally
    {
        // Asegurarse de que el cliente sea eliminado de la lista
        AppointmentNotificationService.RemoveWebSocketClient(webSocket);
    }
}

app.Run();
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Server.Security.Authentication;

namespace Server.API.Middleware
{
    /// <summary>
    /// Middleware para validación de tokens JWT en peticiones
    /// </summary>
    public class JwtMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly JwtAuthService _jwtAuthService;

        public JwtMiddleware(RequestDelegate next, JwtAuthService jwtAuthService)
        {
            _next = next;
            _jwtAuthService = jwtAuthService;
        }

        public async Task Invoke(HttpContext context)
        {
            var token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();

            if (token != null)
                AttachUserToContext(context, token);

            await _next(context);
        }

        private void AttachUserToContext(HttpContext context, string token)
        {
            try
            {
                if (_jwtAuthService.ValidateToken(token))
                {
                    // Si se valida correctamente, se podría adjuntar información adicional
                    // al contexto, como el ID de usuario o roles
                    context.Items["AuthValid"] = true;
                }
            }
            catch
            {
                // No hacemos nada si la validación falla
                // Simplemente no se adjuntará la información al contexto
            }
        }
    }
} 
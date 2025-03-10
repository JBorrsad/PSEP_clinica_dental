using Microsoft.AspNetCore.Mvc;
using Server.Security.Authentication;

namespace Server.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly JwtAuthService _jwtAuthService;
        
        public AuthController(JwtAuthService jwtAuthService)
        {
            _jwtAuthService = jwtAuthService;
        }
        
        /// <summary>
        /// Inicia sesión y genera un token JWT
        /// </summary>
        /// <param name="model">Credenciales de inicio de sesión</param>
        /// <returns>Token JWT si las credenciales son válidas</returns>
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginModel model)
        {
            // Credenciales hardcoded para este ejemplo
            // En un entorno real, esto vendría de una base de datos
            if (model.Username == "admin" && model.Password == "admin123")
            {
                var token = _jwtAuthService.GenerateToken("1", "Administrador", "admin");
                
                return Ok(new { 
                    token = token,
                    username = "Administrador",
                    role = "admin"
                });
            }
            
            return Unauthorized(new { message = "Usuario o contraseña incorrectos" });
        }
        
        /// <summary>
        /// Valida un token JWT
        /// </summary>
        /// <returns>Estado de la validación del token</returns>
        [HttpPost("validate")]
        public IActionResult ValidateToken([FromBody] ValidateTokenModel model)
        {
            var isValid = _jwtAuthService.ValidateToken(model.Token);
            
            if (isValid)
            {
                return Ok(new { valid = true });
            }
            
            return BadRequest(new { valid = false, message = "Token inválido o expirado" });
        }
    }
    
    public class LoginModel
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
    
    public class ValidateTokenModel
    {
        public string Token { get; set; }
    }
} 
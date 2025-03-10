using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Server.Security.Authentication
{
    /// <summary>
    /// Servicio para la gestión de tokens JWT para autenticación
    /// </summary>
    public class JwtAuthService
    {
        private readonly string _issuer;
        private readonly string _audience;
        private readonly string _secretKey;
        
        /// <summary>
        /// Constructor del servicio de autenticación JWT
        /// </summary>
        /// <param name="issuer">Emisor del token</param>
        /// <param name="audience">Audiencia del token</param>
        /// <param name="secretKey">Clave secreta para firmar el token</param>
        public JwtAuthService(string issuer, string audience, string secretKey)
        {
            _issuer = issuer;
            _audience = audience;
            _secretKey = secretKey;
        }
        
        /// <summary>
        /// Genera un token JWT para el usuario especificado
        /// </summary>
        /// <param name="userId">ID del usuario</param>
        /// <param name="userName">Nombre del usuario</param>
        /// <param name="role">Rol del usuario</param>
        /// <param name="expirationMinutes">Tiempo de expiración en minutos</param>
        /// <returns>Token JWT como string</returns>
        public string GenerateToken(string userId, string userName, string role, int expirationMinutes = 60)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secretKey);
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId),
                    new Claim(ClaimTypes.Name, userName),
                    new Claim(ClaimTypes.Role, role)
                }),
                Expires = DateTime.UtcNow.AddMinutes(expirationMinutes),
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
        
        /// <summary>
        /// Valida un token JWT
        /// </summary>
        /// <param name="token">Token JWT a validar</param>
        /// <returns>True si el token es válido, False en caso contrario</returns>
        public bool ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secretKey);
            
            try
            {
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudience = _audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out _);
                
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
} 
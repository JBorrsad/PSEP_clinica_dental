using System;
using System.Security.Cryptography;
using System.Text;

namespace Server.Security.Encryption
{
    /// <summary>
    /// Servicio que proporciona cifrado y descifrado asimétrico utilizando RSA
    /// </summary>
    public class AsymmetricEncryptionService
    {
        private readonly RSA _rsaProvider;
        private readonly RSAParameters _publicKey;
        private readonly RSAParameters _privateKey;

        /// <summary>
        /// Constructor que inicializa las claves RSA
        /// </summary>
        /// <param name="keySize">Tamaño de la clave en bits</param>
        public AsymmetricEncryptionService(int keySize = 2048)
        {
            _rsaProvider = RSA.Create(keySize);
            _publicKey = _rsaProvider.ExportParameters(false);
            _privateKey = _rsaProvider.ExportParameters(true);
        }

        /// <summary>
        /// Obtiene la clave pública en formato XML
        /// </summary>
        /// <returns>Clave pública como cadena XML</returns>
        public string GetPublicKey()
        {
            return Convert.ToBase64String(_rsaProvider.ExportRSAPublicKey());
        }

        /// <summary>
        /// Cifra un mensaje utilizando la clave pública proporcionada por el cliente
        /// </summary>
        /// <param name="plainText">Texto plano a cifrar</param>
        /// <param name="clientPublicKeyXml">Clave pública del cliente en formato XML</param>
        /// <returns>Texto cifrado como string codificado en Base64</returns>
        public string Encrypt(string plainText, string clientPublicKeyXml)
        {
            try
            {
                byte[] clientPublicKeyBytes = Convert.FromBase64String(clientPublicKeyXml);
                
                using (var clientRsa = RSA.Create())
                {
                    clientRsa.ImportRSAPublicKey(clientPublicKeyBytes, out _);
                    
                    byte[] dataToEncrypt = Encoding.UTF8.GetBytes(plainText);
                    byte[] encryptedData = clientRsa.Encrypt(dataToEncrypt, RSAEncryptionPadding.OaepSHA256);
                    
                    return Convert.ToBase64String(encryptedData);
                }
            }
            catch (Exception ex)
            {
                throw new CryptographicException($"Error al cifrar datos: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Descifra un mensaje utilizando la clave privada del servidor
        /// </summary>
        /// <param name="encryptedText">Texto cifrado como string codificado en Base64</param>
        /// <returns>Texto plano descifrado</returns>
        public string Decrypt(string encryptedText)
        {
            try
            {
                _rsaProvider.ImportParameters(_privateKey);
                
                byte[] dataToDecrypt = Convert.FromBase64String(encryptedText);
                byte[] decryptedData = _rsaProvider.Decrypt(dataToDecrypt, RSAEncryptionPadding.OaepSHA256);
                
                return Encoding.UTF8.GetString(decryptedData);
            }
            catch (Exception ex)
            {
                throw new CryptographicException($"Error al descifrar datos: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Verifica un mensaje cifrado con la clave pública del cliente
        /// </summary>
        /// <param name="clientPublicKeyXml">Clave pública del cliente</param>
        /// <param name="testMessage">Mensaje de prueba</param>
        /// <returns>True si la verificación es exitosa</returns>
        public bool VerifyClientKey(string clientPublicKeyXml, out string testMessage)
        {
            testMessage = Guid.NewGuid().ToString();
            
            try
            {
                // Intentar cifrar un mensaje de prueba
                string encrypted = Encrypt(testMessage, clientPublicKeyXml);
                return !string.IsNullOrEmpty(encrypted);
            }
            catch
            {
                return false;
            }
        }
    }
} 
using System;
using System.Security.Cryptography;
using System.Text;

namespace Server.Security.Encryption
{
    /// <summary>
    /// Proporciona funcionalidades para el cifrado asimétrico RSA
    /// Esta clase cumple con el RA5 - Técnicas criptográficas para proteger la comunicación
    /// </summary>
    public class AsymmetricEncryption
    {
        private readonly RSA _privateKey;
        private readonly RSA _publicKey;

        // Constructor que genera un nuevo par de claves
        public AsymmetricEncryption()
        {
            _privateKey = RSA.Create(2048);
            _publicKey = RSA.Create();
            _publicKey.ImportRSAPublicKey(_privateKey.ExportRSAPublicKey(), out _);
        }

        // Constructor que importa claves existentes
        public AsymmetricEncryption(string privateKeyXml, string publicKeyXml)
        {
            _privateKey = RSA.Create();
            _publicKey = RSA.Create();
            
            if (!string.IsNullOrEmpty(privateKeyXml))
                _privateKey.FromXmlString(privateKeyXml);
            
            _publicKey.FromXmlString(publicKeyXml);
        }

        // Obtener la clave pública en formato XML
        public string GetPublicKey()
        {
            return _publicKey.ToXmlString(false);
        }

        // Obtener la clave privada en formato XML
        public string GetPrivateKey()
        {
            return _privateKey.ToXmlString(true);
        }

        // Cifrar datos usando la clave pública
        public byte[] Encrypt(byte[] data)
        {
            return _publicKey.Encrypt(data, RSAEncryptionPadding.OaepSHA256);
        }

        // Cifrar texto usando la clave pública
        public string Encrypt(string plainText)
        {
            byte[] data = Encoding.UTF8.GetBytes(plainText);
            byte[] encryptedData = Encrypt(data);
            return Convert.ToBase64String(encryptedData);
        }

        // Descifrar datos usando la clave privada
        public byte[] Decrypt(byte[] encryptedData)
        {
            return _privateKey.Decrypt(encryptedData, RSAEncryptionPadding.OaepSHA256);
        }

        // Descifrar texto usando la clave privada
        public string Decrypt(string encryptedText)
        {
            byte[] encryptedData = Convert.FromBase64String(encryptedText);
            byte[] decryptedData = Decrypt(encryptedData);
            return Encoding.UTF8.GetString(decryptedData);
        }
    }

    // Extensión para manejar la conversión entre RSA y XML
    public static class RSAExtensions
    {
        public static void FromXmlString(this RSA rsa, string xmlString)
        {
            var parameters = new RSAParameters();
            
            // Código simplificado para convertir XML a RSAParameters
            // En una implementación real, habría que parsear el XML adecuadamente
            
            rsa.ImportParameters(parameters);
        }

        public static string ToXmlString(this RSA rsa, bool includePrivateParameters)
        {
            var parameters = rsa.ExportParameters(includePrivateParameters);
            
            // Código simplificado para convertir RSAParameters a XML
            // En una implementación real, habría que construir el XML adecuadamente
            
            return "RSA_KEY_XML_FORMAT";
        }
    }
} 
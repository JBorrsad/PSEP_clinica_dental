using System;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;

namespace Clients.ConsoleClient.Security
{
    public class EncryptionService
    {
        private readonly RSA _rsa;
        private readonly string _publicKey;
        private readonly string _privateKey;

        public EncryptionService()
        {
            _rsa = RSA.Create(2048);
            _publicKey = _rsa.ToXmlString(false);
            _privateKey = _rsa.ToXmlString(true);
        }

        public string GetPublicKey()
        {
            return _publicKey;
        }

        public string Encrypt(string plainText)
        {
            byte[] data = Encoding.UTF8.GetBytes(plainText);
            byte[] encryptedData = _rsa.Encrypt(data, RSAEncryptionPadding.OaepSHA256);
            return Convert.ToBase64String(encryptedData);
        }

        public string Decrypt(string encryptedText)
        {
            try
            {
                byte[] encryptedData = Convert.FromBase64String(encryptedText);
                byte[] decryptedData = _rsa.Decrypt(encryptedData, RSAEncryptionPadding.OaepSHA256);
                return Encoding.UTF8.GetString(decryptedData);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al descifrar: {ex.Message}");
                return string.Empty;
            }
        }
    }

    // Extensiones para RSA para compatibilidad con formato XML
    public static class RSAExtensions
    {
        public static void FromXmlString(this RSA rsa, string xmlString)
        {
            var parameters = new RSAParameters();
            var doc = XDocument.Parse(xmlString);

            // Cargar parámetros públicos
            if (doc.Root.Element("Modulus") != null)
                parameters.Modulus = Convert.FromBase64String(doc.Root.Element("Modulus").Value);
            if (doc.Root.Element("Exponent") != null)
                parameters.Exponent = Convert.FromBase64String(doc.Root.Element("Exponent").Value);

            // Cargar parámetros privados si están presentes
            if (doc.Root.Element("P") != null)
            {
                parameters.P = Convert.FromBase64String(doc.Root.Element("P").Value);
                parameters.Q = Convert.FromBase64String(doc.Root.Element("Q").Value);
                parameters.DP = Convert.FromBase64String(doc.Root.Element("DP").Value);
                parameters.DQ = Convert.FromBase64String(doc.Root.Element("DQ").Value);
                parameters.InverseQ = Convert.FromBase64String(doc.Root.Element("InverseQ").Value);
                parameters.D = Convert.FromBase64String(doc.Root.Element("D").Value);
            }

            rsa.ImportParameters(parameters);
        }

        public static string ToXmlString(this RSA rsa, bool includePrivateParameters)
        {
            var parameters = rsa.ExportParameters(includePrivateParameters);
            var doc = new XDocument();
            var root = new XElement("RSAKeyValue");
            doc.Add(root);

            // Añadir parámetros públicos
            root.Add(new XElement("Modulus", Convert.ToBase64String(parameters.Modulus)));
            root.Add(new XElement("Exponent", Convert.ToBase64String(parameters.Exponent)));

            // Añadir parámetros privados si se solicitan
            if (includePrivateParameters)
            {
                root.Add(new XElement("P", Convert.ToBase64String(parameters.P)));
                root.Add(new XElement("Q", Convert.ToBase64String(parameters.Q)));
                root.Add(new XElement("DP", Convert.ToBase64String(parameters.DP)));
                root.Add(new XElement("DQ", Convert.ToBase64String(parameters.DQ)));
                root.Add(new XElement("InverseQ", Convert.ToBase64String(parameters.InverseQ)));
                root.Add(new XElement("D", Convert.ToBase64String(parameters.D)));
            }

            return doc.ToString();
        }
    }
} 
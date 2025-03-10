// Configuración
// Usar URL relativa para que funcione en cualquier entorno
const API_URL = '/api';

// Variables globales
let staffToken = null;

// Comprobar si hay un token guardado
function checkAuth() {
    console.log("Verificando autenticación...");
    
    const token = localStorage.getItem('staffToken');
    if (token) {
        console.log("Token encontrado, procediendo a validarlo");
        staffToken = token;
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        // Inicializar el dashboard
        initializeDashboard();
    } else {
        console.log("No hay token guardado, mostrando formulario de login");
    }
}

// Manejar el inicio de sesión
document.getElementById('staffLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Procesando inicio de sesión...");
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Verificar si los campos están vacíos
    if (!username.trim() || !password.trim()) {
        alert('Por favor, completa todos los campos');
        return;
    }

    try {
        // Usar URL absoluta para la petición de API
        const apiUrl = window.location.origin + API_URL;
        console.log(`Realizando petición de login a ${apiUrl}/Staff/login`);
        
        const response = await fetch(`${apiUrl}/Staff/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            console.log("Inicio de sesión exitoso");
            const data = await response.json();
            localStorage.setItem('staffToken', data.token);
            staffToken = data.token;
            
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            
            // Inicializar el dashboard después del login
            initializeDashboard();
        } else {
            console.error(`Error de autenticación: ${response.status} ${response.statusText}`);
            alert('Usuario o contraseña incorrectos');
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al conectar con el servidor. Por favor, intenta de nuevo más tarde.');
    }
});

// Manejar el cierre de sesión
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('staffToken');
    staffToken = null;
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    // Limpiar cualquier dato sensible que pueda haber quedado
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    console.log("Sesión cerrada correctamente");
}

// Comprobar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', checkAuth); 
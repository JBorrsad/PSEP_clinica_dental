// Configuración
// Usar URL absoluta para que funcione en cualquier entorno
const API_URL = window.location.origin + '/api';

// Variables globales
let currentAppointment = null;
let webSocket = null;
let requestHistory = [];
let adminCalendar = null;

// Obtener token de autenticación
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Inicialización de la página
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado. Iniciando aplicación...");
    console.log("API URL:", API_URL);
    
    const token = localStorage.getItem('staffToken');
    
    // Verificar si hay un token para mostrar la interfaz correcta
    if (token) {
        console.log("Token encontrado, mostrando dashboard");
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        // Inicializar solo si no se ha hecho ya en auth.js
        if (typeof adminCalendar === 'undefined' || adminCalendar === null) {
            initializeDashboard();
        }
    } else {
        console.log("No hay token, mostrando formulario de login");
    }
    
    // Configurar evento para cerrar sesión
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Configurar eventos para el modal de citas
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    const acceptBtn = document.getElementById('acceptBtn');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => updateAppointment('confirm'));
    }
    
    const toggleRescheduleBtn = document.getElementById('toggleRescheduleBtn');
    if (toggleRescheduleBtn) {
        toggleRescheduleBtn.addEventListener('click', toggleRescheduleMode);
    }
    
    const saveRescheduleBtn = document.getElementById('saveRescheduleBtn');
    if (saveRescheduleBtn) {
        saveRescheduleBtn.addEventListener('click', () => updateAppointment('reschedule'));
    }
    
    const rejectBtn = document.getElementById('rejectBtn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => updateAppointment('reject'));
    }
    
    // Configurar el colapso del historial
    setupCollapsibleSections();
});

// Inicializar el panel de administración
function initializeDashboard() {
    console.log("Inicializando dashboard...");
    
    try {
        // Verificar que los elementos del DOM existen antes de continuar
        const calendarContainer = document.getElementById('adminCalendar');
        const requestHistoryContainer = document.getElementById('requestHistory');
        const dailyAppointmentsContainer = document.getElementById('dailyAppointmentsList');
        const pendingRequestsContainer = document.getElementById('pendingRequests');
        
        // Verificar que todos los contenedores necesarios existan
        if (!calendarContainer) {
            console.error("Error crítico: No se encontró el contenedor del calendario con ID 'adminCalendar'");
            alert("Error: No se encontró el contenedor del calendario");
            return;
        }
        
        if (!requestHistoryContainer) {
            console.error("Error crítico: No se encontró el contenedor del historial con ID 'requestHistory'");
            alert("Error: No se encontró el contenedor del historial");
            return;
        }
        
        if (!dailyAppointmentsContainer) {
            console.error("Error crítico: No se encontró el contenedor de citas diarias con ID 'dailyAppointmentsList'");
            alert("Error: No se encontró el contenedor de citas diarias");
            return;
        }
        
        if (!pendingRequestsContainer) {
            console.error("Error crítico: No se encontró el contenedor de solicitudes pendientes con ID 'pendingRequests'");
            alert("Error: No se encontró el contenedor de solicitudes pendientes");
            return;
        }
        
        console.log("Todos los contenedores verificados correctamente");
        
        // Inicializar el calendario
        console.log("Inicializando calendario administrativo...");
        
        // Verificar si la clase AdminCalendar está disponible
        if (typeof AdminCalendar !== 'function') {
            console.error("Error crítico: La clase AdminCalendar no está disponible. Asegúrate de que admin-calendar.js esté cargado.");
            alert("Error: La clase AdminCalendar no está disponible");
            return;
        }
        
        // Crear instancia de calendario
        adminCalendar = new AdminCalendar('adminCalendar');
        
        if (!adminCalendar) {
            console.error("Error crítico: No se pudo crear la instancia de AdminCalendar");
            alert("Error: No se pudo crear la instancia de calendario");
            return;
        }
        
        console.log("Instancia de calendario creada:", adminCalendar);
        
        // Configurar el callback para cuando se selecciona una fecha
        adminCalendar.setOnDateSelected(function(date) {
            console.log("Fecha seleccionada:", date);
            loadAppointmentsForDate(date);
        });
        
        // Inicializar el calendario y cargar las citas
        adminCalendar.initialize();
        
        // Cargar solicitudes pendientes
        loadPendingRequests();
        
        // Cargar historial de solicitudes
        loadRequestHistory();
        
        // Configurar conexión WebSocket
        setupWebSocketConnection();
        
        // Configurar las secciones colapsables
        setupCollapsibleSections();
        
        console.log("Dashboard inicializado correctamente");
    } catch (error) {
        console.error("Error fatal al inicializar el dashboard:", error);
        alert("Error al inicializar el panel de administración: " + error.message);
    }
}

// Configurar secciones colapsables
function setupCollapsibleSections() {
    console.log("Configurando secciones colapsables...");
    
    try {
        // Obtener referencias a los headers y contenidos
        const requestHistoryHeader = document.getElementById('requestHistoryHeader');
        const requestHistoryContent = document.getElementById('requestHistory');
        const pendingRequestsHeader = document.getElementById('pendingRequestsHeader');
        const pendingRequestsContent = document.getElementById('pendingRequests');
        
        // Verificar que existan los elementos
        if (!requestHistoryHeader || !requestHistoryContent) {
            console.error("Error: No se encontró la sección de historial de solicitudes");
            return;
        }
        
        if (!pendingRequestsHeader || !pendingRequestsContent) {
            console.error("Error: No se encontró la sección de solicitudes pendientes");
            return;
        }
        
        console.log("Elementos de secciones colapsables encontrados correctamente");
        
        // Configurar evento para historial de solicitudes
        requestHistoryHeader.addEventListener('click', function() {
            console.log("Clic en header de historial de solicitudes");
            this.classList.toggle('active');
            
            if (this.classList.contains('active')) {
                console.log("Expandiendo historial de solicitudes");
                requestHistoryContent.classList.add('active');
                requestHistoryContent.style.maxHeight = requestHistoryContent.scrollHeight + "px";
            } else {
                console.log("Colapsando historial de solicitudes");
                requestHistoryContent.classList.remove('active');
                requestHistoryContent.style.maxHeight = null;
            }
        });
        
        // Configurar evento para solicitudes pendientes
        pendingRequestsHeader.addEventListener('click', function() {
            console.log("Clic en header de solicitudes pendientes");
            this.classList.toggle('active');
            
            if (this.classList.contains('active')) {
                console.log("Expandiendo solicitudes pendientes");
                pendingRequestsContent.classList.add('active');
                pendingRequestsContent.style.maxHeight = pendingRequestsContent.scrollHeight + "px";
            } else {
                console.log("Colapsando solicitudes pendientes");
                pendingRequestsContent.classList.remove('active');
                pendingRequestsContent.style.maxHeight = null;
            }
        });
        
        // Inicialmente, expandir solicitudes pendientes (importante)
        pendingRequestsHeader.classList.add('active');
        pendingRequestsContent.classList.add('active');
        pendingRequestsContent.style.maxHeight = pendingRequestsContent.scrollHeight + "px";
        
        console.log("Secciones colapsables configuradas correctamente");
    } catch (error) {
        console.error("Error al configurar secciones colapsables:", error);
    }
}

// Configurar WebSocket para notificaciones en tiempo real
function setupWebSocketConnection() {
    try {
        console.log("Configurando conexión WebSocket...");
        
        // Construir URL del WebSocket (ws:// o wss:// según el protocolo de la página)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/appointments`;
        
        console.log(`URL de WebSocket: ${wsUrl}`);
        
        // Crear conexión WebSocket
        const socket = new WebSocket(wsUrl);
        
        // Configurar eventos de WebSocket
        socket.onopen = function() {
            console.log("Conexión WebSocket establecida correctamente");
        };
        
        socket.onmessage = function(event) {
            console.log("Mensaje WebSocket recibido:", event.data);
            
            try {
                const notification = JSON.parse(event.data);
                showNotification(notification);
                
                // Recargar datos según el tipo de notificación
                if (notification.type === 'new') {
                    loadPendingRequests();
                } else if (notification.type === 'updated' || notification.type === 'deleted') {
                    // Recargar todos los datos
                    loadPendingRequests();
                    loadRequestHistory();
                    if (adminCalendar) {
                        adminCalendar.loadAppointments();
                    }
                }
            } catch (error) {
                console.error("Error al procesar mensaje WebSocket:", error);
            }
        };
        
        socket.onerror = function(error) {
            console.error("Error en la conexión WebSocket:", error);
        };
        
        socket.onclose = function() {
            console.log("Conexión WebSocket cerrada");
            // Intentar reconectar después de un tiempo
            setTimeout(setupWebSocketConnection, 5000);
        };
    } catch (error) {
        console.error("Error al configurar WebSocket:", error);
    }
}

// Mostrar notificación en la interfaz de usuario
function showNotification(notification) {
    console.log("Mostrando notificación:", notification);
    
    let message = '';
    let color = '';
    
    // Determinar mensaje y color según el tipo de notificación
    switch (notification.type) {
        case 'new':
            message = 'Nueva solicitud de cita recibida';
            color = '#4CAF50'; // Verde
            break;
        case 'updated':
            message = 'Una cita ha sido actualizada';
            color = '#2196F3'; // Azul
            break;
        case 'deleted':
            message = 'Una cita ha sido cancelada';
            color = '#f44336'; // Rojo
            break;
    }
    
    // Crear elemento de notificación
    const notificationElement = document.createElement('div');
    notificationElement.style.position = 'fixed';
    notificationElement.style.top = '20px';
    notificationElement.style.right = '20px';
    notificationElement.style.backgroundColor = color;
    notificationElement.style.color = 'white';
    notificationElement.style.padding = '15px 20px';
    notificationElement.style.borderRadius = '5px';
    notificationElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notificationElement.style.zIndex = '1000';
    notificationElement.textContent = message;
    
    // Añadir al DOM
    document.body.appendChild(notificationElement);
    
    // Eliminar después de 5 segundos
    setTimeout(() => {
        notificationElement.style.opacity = '0';
        notificationElement.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notificationElement);
        }, 500);
    }, 5000);
    
    // Reproducir sonido de notificación
    playNotificationSound();
}

// Reproducir sonido de notificación
function playNotificationSound() {
    try {
        // Crear elemento de audio
        const audio = new Audio('/admin/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => {
            console.log("No se pudo reproducir el sonido: ", err);
        });
    } catch (error) {
        console.error("Error al reproducir sonido:", error);
    }
}

// Cargar solicitudes pendientes
async function loadPendingRequests() {
    console.log("Cargando solicitudes pendientes...");
    
    const container = document.getElementById('pendingRequests');
    if (!container) {
        console.error("Error: No se encontró el contenedor de solicitudes pendientes con ID 'pendingRequests'");
        return;
    }
    
    // Mostrar indicador de carga
    container.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando solicitudes pendientes...</p>
        </div>
    `;
    
    try {
        // Obtener el token de autenticación
        const token = getAuthToken();
        if (!token) {
            console.error("Error: No hay token de autenticación");
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error de autenticación. Por favor, inicie sesión nuevamente.</p>
                </div>
            `;
            return;
        }
        
        // Construir URL de la API
        const url = `${API_URL}/appointments`;
        console.log(`Realizando petición a: ${url}`);
        
        // Realizar petición a la API
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
        }
        
        const appointments = await response.json();
        console.log(`Recibidas ${appointments.length} citas`);
        
        displayPendingRequests(appointments);
    } catch (error) {
        console.error("Error al cargar solicitudes pendientes:", error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar solicitudes pendientes: ${error.message}</p>
            </div>
        `;
    }
}

// Mostrar solicitudes pendientes en el contenedor
function displayPendingRequests(appointments) {
    console.log("Mostrando solicitudes pendientes...");
    
    const container = document.getElementById('pendingRequests');
    if (!container) {
        console.error("Error: No se encontró el contenedor de solicitudes pendientes");
        return;
    }
    
    // Filtrar citas pendientes (no confirmadas)
    const pendingAppointments = appointments.filter(appointment => !appointment.isConfirmed);
    
    if (pendingAppointments.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No hay solicitudes pendientes</p>
            </div>
        `;
        return;
    }
    
    // Construir HTML para cada solicitud pendiente
    let html = '';
    pendingAppointments.forEach(appointment => {
        // Formatear fecha y hora
        const date = new Date(appointment.date);
        const formattedDate = date.toLocaleDateString('es-ES');
        const formattedTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="request-item" data-id="${appointment.id}" onclick="openAppointmentModal(${JSON.stringify(appointment).replace(/"/g, '&quot;')})">
                <div class="request-date">${formattedDate} - ${formattedTime}</div>
                <div class="request-name">${appointment.patientName}</div>
                <div class="request-treatment">${appointment.treatmentType}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Cargar citas para una fecha específica
async function loadAppointmentsForDate(date) {
    console.log(`Cargando citas para la fecha: ${date}`);
    
    const container = document.getElementById('dailyAppointmentsList');
    if (!container) {
        console.error("Error: No se encontró el contenedor de citas diarias");
        return;
    }
    
    // Actualizar el elemento que muestra la fecha seleccionada
    const selectedDateElement = document.getElementById('selectedDate');
    if (selectedDateElement) {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        selectedDateElement.textContent = formattedDate;
    }
    
    // Mostrar indicador de carga
    container.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando citas para ${date}...</p>
        </div>
    `;
    
    try {
        // Obtener el token de autenticación
        const token = getAuthToken();
        if (!token) {
            console.error("Error: No hay token de autenticación");
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error de autenticación. Por favor, inicie sesión nuevamente.</p>
                </div>
            `;
            return;
        }
        
        // Construir URL de la API
        const dateString = date.replace(/\//g, '-'); // Asegurar formato correcto de fecha
        const url = `${API_URL}/appointments`;
        console.log(`Realizando petición a: ${url}`);
        
        // Realizar petición a la API
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
        }
        
        const allAppointments = await response.json();
        
        // Filtrar solo las citas de la fecha seleccionada
        const dateOnly = date.split('T')[0]; // Obtener solo la parte de la fecha (sin hora)
        const appointmentsForDate = allAppointments.filter(appointment => {
            const appointmentDate = new Date(appointment.date);
            const appointmentDateString = appointmentDate.toISOString().split('T')[0];
            return appointmentDateString === dateOnly;
        });
        
        console.log(`Encontradas ${appointmentsForDate.length} citas para la fecha ${date}`);
        
        // Mostrar las citas
        displayDailyAppointments(appointmentsForDate, date);
    } catch (error) {
        console.error(`Error al cargar citas para la fecha ${date}:`, error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar citas: ${error.message}</p>
            </div>
        `;
    }
}

// Mostrar citas del día en el contenedor
function displayDailyAppointments(appointments, date) {
    console.log(`Mostrando ${appointments.length} citas para la fecha ${date}`);
    
    const container = document.getElementById('dailyAppointmentsList');
    if (!container) {
        console.error("Error: No se encontró el contenedor de citas diarias");
        return;
    }
    
    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No hay citas programadas para esta fecha</p>
            </div>
        `;
        return;
    }
    
    // Ordenar las citas por hora
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Construir HTML para cada cita
    let html = '';
    appointments.forEach(appointment => {
        // Formatear fecha y hora
        const appointmentDateTime = new Date(appointment.date);
        const formattedTime = appointmentDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Determinar el estado de la cita
        let statusClass = '';
        let statusText = '';
        
        if (appointment.isConfirmed) {
            statusClass = 'status-confirmed';
            statusText = 'Confirmada';
        } else {
            statusClass = 'status-pending';
            statusText = 'Pendiente';
        }
        
        html += `
            <div class="appointment-item" data-id="${appointment.id}" onclick="openAppointmentModal(${JSON.stringify(appointment).replace(/"/g, '&quot;')})">
                <div class="appointment-time">${formattedTime}</div>
                <div class="appointment-patient">${appointment.patientName}</div>
                <div class="appointment-treatment">${appointment.treatmentType}</div>
                <span class="appointment-status ${statusClass}">${statusText}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Cargar historial de solicitudes
async function loadRequestHistory() {
    console.log("Cargando historial de solicitudes...");
    
    const container = document.getElementById('requestHistory');
    if (!container) {
        console.error("Error: No se encontró el contenedor del historial de solicitudes");
        return;
    }
    
    // Mostrar indicador de carga
    container.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando historial...</p>
        </div>
    `;
    
    try {
        // Obtener el token de autenticación
        const token = getAuthToken();
        if (!token) {
            console.error("Error: No hay token de autenticación");
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error de autenticación. Por favor, inicie sesión nuevamente.</p>
                </div>
            `;
            return;
        }
        
        // Construir URL de la API
        const url = `${API_URL}/appointments/history`;
        console.log(`Realizando petición a: ${url}`);
        
        // Realizar petición a la API
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
        }
        
        const historyItems = await response.json();
        console.log(`Recibidos ${historyItems.length} elementos de historial`);
        
        displayRequestHistory(historyItems);
    } catch (error) {
        console.error("Error al cargar historial de solicitudes:", error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar historial: ${error.message}</p>
            </div>
        `;
    }
}

// Mostrar historial de solicitudes en el contenedor
function displayRequestHistory(historyItems) {
    console.log("Mostrando historial de solicitudes:", historyItems);
    
    const container = document.getElementById('requestHistory');
    if (!container) {
        console.error("Error: No se encontró el contenedor del historial de solicitudes");
        return;
    }
    
    if (!historyItems || historyItems.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No hay historial de solicitudes</p>
            </div>
        `;
        return;
    }
    
    // Ordenar el historial por fecha (más reciente primero)
    historyItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Construir HTML para cada elemento del historial
    let html = '';
    historyItems.forEach(item => {
        // Formatear fecha y hora
        const timestamp = new Date(item.timestamp);
        const formattedDate = timestamp.toLocaleDateString('es-ES');
        const formattedTime = timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Determinar el estado
        let statusClass = '';
        let statusText = '';
        
        switch (item.action) {
            case 'confirm':
                statusClass = 'accepted';
                statusText = 'Confirmada';
                break;
            case 'reject':
                statusClass = 'rejected';
                statusText = 'Rechazada';
                break;
            case 'reschedule':
                statusClass = 'rescheduled';
                statusText = 'Reprogramada';
                break;
            default:
                statusClass = '';
                statusText = item.action;
        }
        
        html += `
            <div class="history-item">
                <div>${formattedDate} ${formattedTime}</div>
                <div>${item.patientName}</div>
                <span class="history-status ${statusClass}">${statusText}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Abrir modal con detalles de la cita
function openAppointmentModal(appointment) {
    console.log("Abriendo modal para la cita:", appointment);
    
    // Obtener elementos del modal
    const modal = document.getElementById('appointmentModal');
    const modalTitle = document.getElementById('modalTitle');
    const appointmentDetails = document.getElementById('appointmentDetails');
    const confirmBtn = document.getElementById('confirmAppointment');
    const cancelBtn = document.getElementById('cancelAppointment');
    const closeBtn = document.getElementById('closeModal');
    
    if (!modal || !modalTitle || !appointmentDetails || !confirmBtn || !cancelBtn || !closeBtn) {
        console.error("Error: No se encontraron los elementos del modal");
        return;
    }
    
    // Almacenar la cita actual en una variable global para usarla en las acciones
    window.currentAppointment = appointment;
    
    // Formatear fecha y hora
    const appointmentDateTime = new Date(appointment.date);
    const formattedDate = appointmentDateTime.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const formattedTime = appointmentDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Actualizar título del modal
    modalTitle.textContent = `Cita con ${appointment.patientName}`;
    
    // Actualizar detalles de la cita
    appointmentDetails.innerHTML = `
        <div class="appointment-detail-item">
            <strong>Paciente:</strong> ${appointment.patientName}
        </div>
        <div class="appointment-detail-item">
            <strong>Teléfono:</strong> ${appointment.contactPhone || 'No disponible'}
        </div>
        <div class="appointment-detail-item">
            <strong>Email:</strong> ${appointment.contactEmail || 'No disponible'}
        </div>
        <div class="appointment-detail-item">
            <strong>Fecha:</strong> ${formattedDate}
        </div>
        <div class="appointment-detail-item">
            <strong>Hora:</strong> ${formattedTime}
        </div>
        <div class="appointment-detail-item">
            <strong>Tratamiento:</strong> ${appointment.treatmentType}
        </div>
        <div class="appointment-detail-item">
            <strong>Estado:</strong> ${appointment.isConfirmed ? 'Confirmada' : 'Pendiente'}
        </div>
        ${appointment.notes ? `
        <div class="appointment-detail-item">
            <strong>Notas:</strong> ${appointment.notes}
        </div>` : ''}
    `;
    
    // Configurar visibilidad de botones según el estado de la cita
    if (appointment.isConfirmed) {
        confirmBtn.style.display = 'none';
    } else {
        confirmBtn.style.display = 'block';
    }
    
    // Configurar eventos para los botones
    confirmBtn.onclick = function() {
        updateAppointment('confirm');
    };
    
    cancelBtn.onclick = function() {
        if (confirm('¿Está seguro de que desea cancelar esta cita?')) {
            updateAppointment('reject');
        }
    };
    
    closeBtn.onclick = closeModal;
    
    // Configurar cierre del modal al hacer clic en la X
    const closeModalX = modal.querySelector('.close-modal');
    if (closeModalX) {
        closeModalX.onclick = closeModal;
    }
    
    // Mostrar el modal
    modal.style.display = 'block';
}

// Cerrar el modal
function closeModal() {
    const modal = document.getElementById('appointmentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Actualizar estado de una cita
async function updateAppointment(action) {
    console.log(`Actualizando cita #${currentAppointment.id} con acción: ${action}`);
    
    try {
        // Obtener el token de autenticación
        const token = getAuthToken();
        if (!token) {
            alert("Error de autenticación. Por favor, inicie sesión nuevamente.");
            return;
        }
        
        let apiUrl = API_URL;
        let endpoint = '';
        let method = '';
        let body = {};
        
        // Configurar la petición según la acción
        switch (action) {
            case 'confirm':
                endpoint = `${apiUrl}/appointments/${currentAppointment.id}/status`;
                method = 'PUT';
                body = { status: 'confirmed' };
                break;
            case 'reject':
                endpoint = `${apiUrl}/appointments/${currentAppointment.id}/status`;
                method = 'PUT';
                body = { status: 'rejected' };
                break;
            case 'reschedule':
                endpoint = `${apiUrl}/appointments/${currentAppointment.id}/status`;
                method = 'PUT';
                body = { 
                    status: 'rescheduled',
                    newDate: document.getElementById('newDate').value
                };
                break;
            default:
                throw new Error(`Acción no válida: ${action}`);
        }
        
        console.log(`Realizando petición a: ${endpoint}`);
        
        // Realizar petición a la API
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
        }
        
        // Procesar respuesta
        const result = await response.json();
        console.log("Respuesta de actualización:", result);
        
        // Cerrar modal
        closeModal();
        
        // Mostrar notificación
        let message = '';
        switch (action) {
            case 'confirm':
                message = 'Cita confirmada correctamente';
                break;
            case 'reject':
                message = 'Cita cancelada correctamente';
                break;
            case 'reschedule':
                message = 'Cita reprogramada correctamente';
                break;
        }
        
        showActionNotification(message);
        
        // Recargar datos
        if (adminCalendar) {
            adminCalendar.loadAppointments();
        }
        
        loadPendingRequests();
        loadRequestHistory();
        
        // Si hay una fecha seleccionada, recargar las citas de ese día
        if (currentAppointment && currentAppointment.date) {
            const dateObj = new Date(currentAppointment.date);
            const dateString = dateObj.toISOString().split('T')[0];
            loadAppointmentsForDate(dateString);
        }
    } catch (error) {
        console.error(`Error al ${action === 'confirm' ? 'confirmar' : action === 'reject' ? 'rechazar' : 'reprogramar'} la cita:`, error);
        alert(`Error al ${action === 'confirm' ? 'confirmar' : action === 'reject' ? 'rechazar' : 'reprogramar'} la cita: ${error.message}`);
    }
}

// Mostrar notificación de acción completada
function showActionNotification(message) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    notification.textContent = message;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Exponer funciones globalmente
window.openAppointmentModal = openAppointmentModal;
window.updateAppointment = updateAppointment;
window.closeModal = closeModal;

// Cerrar sesión
function logout() {
    console.log("Cerrando sesión...");
    localStorage.removeItem('staffToken');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    // Limpiar datos
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.close();
    }
} 
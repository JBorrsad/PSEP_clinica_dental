// Variables globales
let currentAppointment = null;
let webSocket = null;
let requestHistory = [];
let adminCalendar = null;
// Definir la URL de la API explícitamente
const API_URL = window.location.origin + '/api';  // La URL base de la API

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

// Configurar conexión WebSocket
function setupWebSocketConnection() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    
    console.log(`Conectando a WebSocket: ${wsUrl}`);
    webSocket = new WebSocket(wsUrl);
    
    webSocket.onopen = function() {
        console.log('Conexión WebSocket establecida');
    };
    
    webSocket.onmessage = function(event) {
        console.log('Mensaje recibido:', event.data);
        try {
            const notification = JSON.parse(event.data);
            if (notification.Type === 'notification') {
                // Actualizar los datos al recibir una notificación
                loadPendingRequests();
                adminCalendar.loadAppointments();
                
                // Si hay una fecha seleccionada, recargar las citas de ese día
                if (adminCalendar.selectedDate) {
                    loadAppointmentsForDate(adminCalendar.selectedDate);
                }
                
                // Mostrar notificación visual
                showNotification(notification);
                
                // Actualizar historial si es relevante
                if (['created', 'updated', 'deleted'].includes(notification.Action.toLowerCase())) {
                    loadRequestHistory();
                }
            }
        } catch (error) {
            console.error('Error al procesar notificación:', error);
        }
    };
    
    webSocket.onclose = function(event) {
        console.log('Conexión WebSocket cerrada:', event);
        // Reconectar después de un retraso
        setTimeout(setupWebSocketConnection, 5000);
    };
    
    webSocket.onerror = function(error) {
        console.error('Error en WebSocket:', error);
    };
}

// Mostrar notificación visual
function showNotification(notification) {
    let message = '';
    let color = '';
    
    switch(notification.Action.toLowerCase()) {
        case 'created':
            message = 'Nueva solicitud de cita recibida';
            color = '#4CAF50'; // Verde
            // Reproducir sonido de notificación
            playNotificationSound();
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
}

// Reproducir sonido de notificación
function playNotificationSound() {
    try {
        // Crear un oscilador de audio (beep) para la notificación
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Frecuencia más alta para un sonido de notificación
        gainNode.gain.value = 0.1; // Volumen bajo
        
        oscillator.start();
        
        // Detener después de 0.2 segundos
        setTimeout(() => {
            oscillator.stop();
            // Reproducir un segundo beep más bajo para el efecto de notificación
            const oscillator2 = audioContext.createOscillator();
            oscillator2.connect(gainNode);
            oscillator2.type = 'sine';
            oscillator2.frequency.value = 600;
            oscillator2.start();
            setTimeout(() => oscillator2.stop(), 100);
        }, 200);
    } catch (err) {
        console.log('No se pudo reproducir el sonido de notificación', err);
    }
}

// Cargar solicitudes pendientes
async function loadPendingRequests() {
    console.log("Cargando solicitudes pendientes...");
    try {
        // Verificar que el contenedor existe
        const container = document.getElementById('pendingRequests');
        if (!container) {
            console.error("Error: No se encontró el contenedor de solicitudes pendientes con ID 'pendingRequests'");
            return;
        }

        // Mostrar mensaje de carga
        container.innerHTML = '<p class="loading-message">Cargando solicitudes pendientes...</p>';
        
        const token = localStorage.getItem('staffToken');
        if (!token) {
            console.error("Error: No hay token de autenticación");
            container.innerHTML = '<p class="empty-message error-message">Error de autenticación</p>';
            return;
        }
        
        // Usar URL de API global
        const url = `${API_URL}/Staff/pending`;
        console.log(`Realizando petición a: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            console.log("Solicitudes pendientes recibidas correctamente");
            const appointments = await response.json();
            console.log(`Recibidas ${appointments.length} solicitudes pendientes:`, appointments);
            displayPendingRequests(appointments);
        } else {
            console.error(`Error al cargar solicitudes pendientes: ${response.status} ${response.statusText}`);
            container.innerHTML = `<p class="empty-message error-message">Error ${response.status}: ${response.statusText}</p>`;
        }
    } catch (error) {
        console.error("Error al cargar solicitudes pendientes:", error);
        const container = document.getElementById('pendingRequests');
        if (container) {
            container.innerHTML = `<p class="empty-message error-message">Error: ${error.message}</p>`;
        }
    }
}

// Mostrar las solicitudes pendientes en el panel lateral
function displayPendingRequests(appointments) {
    console.log("Mostrando solicitudes pendientes...");
    
    const container = document.getElementById('pendingRequests');
    if (!container) {
        console.error("Error: No se encontró el contenedor de solicitudes pendientes");
        return;
    }
    
    container.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        console.log("No hay solicitudes pendientes para mostrar");
        container.innerHTML = '<p class="empty-message">No hay solicitudes pendientes</p>';
        return;
    }

    console.log(`Mostrando ${appointments.length} solicitudes pendientes`);

    // Filtrar citas pendientes (no confirmadas)
    const pendingAppointments = appointments.filter(appointment => !appointment.isConfirmed);

    if (pendingAppointments.length === 0) {
        console.log("No hay solicitudes pendientes después del filtrado");
        container.innerHTML = '<p class="empty-message">No hay solicitudes pendientes</p>';
        return;
    }

    // Para depuración
    console.log(`Hay ${pendingAppointments.length} solicitudes pendientes después del filtrado:`, pendingAppointments);

    // Ordenar por fecha, las más recientes primero
    pendingAppointments.sort((a, b) => 
        new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()
    );

    // Crear elementos para cada solicitud pendiente
    pendingAppointments.forEach((appointment, index) => {
        console.log(`Procesando solicitud pendiente ${index + 1}:`, appointment);
        
        try {
            const appointmentDate = new Date(appointment.appointmentDateTime);
            if (isNaN(appointmentDate.getTime())) {
                console.warn(`Fecha inválida para la solicitud ${index + 1}: ${appointment.appointmentDateTime}`);
                return;
            }
            
            const card = document.createElement('div');
            card.className = 'request-card';
            
            // Formatear fecha y hora
            const dateStr = appointmentDate.toLocaleDateString('es-ES');
            const timeStr = appointmentDate.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            
            card.innerHTML = `
                <div class="status-badge status-pending">Pendiente</div>
                <h3>${appointment.patientName || 'Sin nombre'}</h3>
                <p class="appointment-date">Fecha: ${dateStr}</p>
                <p class="appointment-time">Hora: ${timeStr}</p>
                <p class="appointment-treatment">Tratamiento: ${appointment.treatmentType || appointment.treatment || 'No especificado'}</p>
            `;
            
            // Añadir evento de clic para abrir el modal
            card.addEventListener('click', function() {
                openAppointmentModal(appointment);
            });
            
            container.appendChild(card);
        } catch (error) {
            console.error(`Error al procesar solicitud pendiente ${index + 1}:`, error);
        }
    });
    
    console.log("Solicitudes pendientes mostradas correctamente");
}

// Cargar citas para una fecha específica
async function loadAppointmentsForDate(date) {
    console.log(`Cargando citas para la fecha: ${date.toISOString().split('T')[0]}`);
    
    try {
        // Verificar que el contenedor existe
        const container = document.getElementById('dailyAppointmentsList');
        if (!container) {
            console.error("Error: No se encontró el contenedor de citas diarias con ID 'dailyAppointmentsList'");
            return;
        }

        // Mostrar mensaje de carga
        container.innerHTML = '<p class="loading-message">Cargando citas...</p>';
        
        const token = localStorage.getItem('staffToken');
        if (!token) {
            console.error("Error: No hay token de autenticación");
            container.innerHTML = '<p class="empty-message error-message">Error de autenticación</p>';
            return;
        }
        
        // Formatear la fecha para la URL
        const dateString = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        // Usar URL de API global
        const url = `${API_URL}/Staff/appointments/date/${dateString}`;
        console.log(`Realizando petición a: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            console.log("Citas diarias recibidas correctamente");
            const appointments = await response.json();
            console.log(`Recibidas ${appointments.length} citas para el día ${dateString}:`, appointments);
            displayDailyAppointments(appointments, date);
        } else {
            console.error(`Error al cargar las citas: ${response.status} ${response.statusText}`);
            container.innerHTML = `<p class="empty-message error-message">Error ${response.status}: ${response.statusText}</p>`;
        }
    } catch (error) {
        console.error('Error al cargar citas diarias:', error);
        const container = document.getElementById('dailyAppointmentsList');
        if (container) {
            container.innerHTML = `<p class="empty-message error-message">Error: ${error.message}</p>`;
        }
    }
}

// Mostrar las citas diarias
function displayDailyAppointments(appointments, date) {
    console.log("Mostrando citas diarias...");
    
    const container = document.getElementById('dailyAppointmentsList');
    if (!container) {
        console.error("Error: No se encontró el contenedor de citas diarias");
        return;
    }
    
    container.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        console.log("No hay citas programadas para este día");
        container.innerHTML = '<p class="empty-message">No hay citas programadas para este día</p>';
        return;
    }

    console.log(`Mostrando ${appointments.length} citas para el día seleccionado`);

    // Ordenar citas por hora
    const sortedAppointments = [...appointments].sort((a, b) => 
        new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()
    );

    // Para depuración
    console.log("Citas ordenadas:", sortedAppointments);

    // Crear elementos para cada cita
    sortedAppointments.forEach((appointment, index) => {
        console.log(`Procesando cita ${index + 1}:`, appointment);
        
        try {
            const appointmentDate = new Date(appointment.appointmentDateTime);
            if (isNaN(appointmentDate.getTime())) {
                console.warn(`Fecha inválida para la cita ${index + 1}: ${appointment.appointmentDateTime}`);
                return;
            }
            
            const item = document.createElement('div');
            item.className = `daily-appointment-item${appointment.isConfirmed ? '' : ' pending'}`;
            
            // Formatear la hora
            const timeStr = appointmentDate.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            
            item.innerHTML = `
                <div class="daily-appointment-time">
                    ${timeStr}
                    <span class="status-badge status-${appointment.isConfirmed ? 'confirmed' : 'pending'}">
                        ${appointment.isConfirmed ? 'Confirmada' : 'Pendiente'}
                    </span>
                </div>
                <div class="daily-appointment-patient">${appointment.patientName || 'Sin nombre'}</div>
                <div class="daily-appointment-treatment">${appointment.treatmentType || appointment.treatment || 'No especificado'}</div>
            `;
            
            // Añadir evento de clic para abrir el modal
            item.addEventListener('click', function() {
                openAppointmentModal(appointment);
            });
            
            container.appendChild(item);
        } catch (error) {
            console.error(`Error al procesar cita ${index + 1}:`, error);
        }
    });
    
    console.log("Citas diarias mostradas correctamente");
}

// Cargar historial de solicitudes
async function loadRequestHistory() {
    console.log("Cargando historial de solicitudes...");
    try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
            console.error("Error: No hay token de autenticación");
            return;
        }
        
        // Verificar si el contenedor existe antes de intentar cargar los datos
        const container = document.getElementById('requestHistory');
        if (!container) {
            console.error("Error: No se encontró el contenedor de historial con ID 'requestHistory'");
            return;
        }

        // Mostrar mensaje de carga
        container.innerHTML = '<p class="loading-message">Cargando historial...</p>';
        
        // Usar la URL API definida globalmente
        const url = `${API_URL}/Staff/history`;
        console.log(`Realizando petición al endpoint de historial: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            console.log("Respuesta recibida correctamente del endpoint de historial");
            requestHistory = await response.json();
            console.log(`Recibidos ${requestHistory.length} elementos de historial:`, requestHistory);
            displayRequestHistory();
        } else {
            console.error(`Error al cargar el historial: ${response.status} ${response.statusText}`);
            container.innerHTML = `<p class="empty-message error-message">Error ${response.status}: ${response.statusText}</p>`;
        }
    } catch (error) {
        console.error("Error al cargar el historial de solicitudes:", error);
        // Mostrar mensaje de error en la UI
        const container = document.getElementById('requestHistory');
        if (container) {
            container.innerHTML = `<p class="empty-message error-message">Error: ${error.message}</p>`;
        }
    }
}

// Mostrar historial de solicitudes
function displayRequestHistory() {
    console.log("Mostrando historial de solicitudes...");
    const container = document.getElementById('requestHistory');
    
    if (!container) {
        console.error("Error: No se encontró el contenedor de historial de solicitudes");
        return;
    }
    
    container.innerHTML = '';

    if (!requestHistory || requestHistory.length === 0) {
        console.log("No hay historial de solicitudes para mostrar");
        container.innerHTML = '<p class="empty-message">No hay historial de solicitudes</p>';
        return;
    }

    console.log(`Mostrando ${requestHistory.length} elementos de historial`);
    
    // Ordenar por fecha, más recientes primero
    const sortedHistory = [...requestHistory].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Para depuración
    console.log("Historial ordenado:", sortedHistory);

    // Crear elementos para cada item del historial
    sortedHistory.forEach((item, index) => {
        if (!item) {
            console.warn(`Elemento ${index} es nulo o indefinido`);
            return;
        }
        
        console.log(`Procesando elemento de historial ${index + 1}:`, item);
        
        // Verificar si el elemento tiene las propiedades necesarias
        if (!item.patientName || !item.action || !item.timestamp) {
            console.warn(`Elemento de historial ${index + 1} incompleto:`, item);
            return; // Saltar este elemento
        }
        
        // Crear el elemento de historial
        const historyItem = document.createElement('div');
        
        // Determinar la clase CSS según el tipo de acción
        let statusClass = '';
        const action = (item.action || '').toLowerCase();
        
        if (action.includes('aceptada') || action.includes('accepted')) {
            statusClass = 'accepted';
        } else if (action.includes('rechazada') || action.includes('rejected')) {
            statusClass = 'rejected';
        } else if (action.includes('reprogramada') || action.includes('rescheduled')) {
            statusClass = 'rescheduled';
        } else {
            console.log(`Tipo de acción no reconocido: ${item.action}`);
        }
        
        historyItem.className = `history-item ${statusClass}`;
        
        // Formatear la fecha
        let formattedDate = 'Fecha desconocida';
        let formattedTime = '';
        
        try {
            const date = new Date(item.timestamp);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('es-ES');
                formattedTime = date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            } else {
                console.warn(`Fecha inválida: ${item.timestamp}`);
            }
        } catch (error) {
            console.error(`Error al formatear la fecha del elemento ${index + 1}:`, error);
        }
        
        // Crear HTML del elemento
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="patient-name">${item.patientName || 'Paciente sin nombre'}</span>
                <span class="history-item-date">${formattedDate} ${formattedTime}</span>
            </div>
            <div class="history-item-status">
                <span class="status-before">Pendiente</span>
                <span class="status-arrow">→</span>
                <span class="status-after">${item.action}</span>
            </div>
        `;
        
        container.appendChild(historyItem);
    });
    
    console.log("Historial de solicitudes mostrado correctamente");
}

// Abrir modal de cita
function openAppointmentModal(appointment) {
    currentAppointment = appointment;
    const modal = document.getElementById('requestModal');
    
    // Desactivar modo de reprogramación
    disableRescheduleMode();
    
    // Rellenar datos en el modal
    document.getElementById('patientName').value = appointment.patientName;
    document.getElementById('contactPhone').value = appointment.contactPhone || 'No disponible';
    document.getElementById('contactEmail').value = appointment.email || 'No disponible';
    
    // Formatear correctamente la fecha para el campo datetime-local
    try {
        const appointmentDate = new Date(appointment.appointmentDateTime);
        if (!isNaN(appointmentDate.getTime())) {
            // Formatear a YYYY-MM-DDThh:mm (formato requerido por datetime-local)
            const localDatetime = appointmentDate.toISOString().slice(0, 16);
            document.getElementById('appointmentDateTime').value = localDatetime;
        } else {
            console.error("Fecha inválida:", appointment.appointmentDateTime);
            document.getElementById('appointmentDateTime').value = "";
        }
    } catch (error) {
        console.error("Error al formatear la fecha:", error);
        document.getElementById('appointmentDateTime').value = "";
    }
    
    // Seleccionar el tratamiento correcto
    const treatmentSelect = document.getElementById('treatmentType');
    const treatmentOptions = Array.from(treatmentSelect.options);
    const treatmentIndex = treatmentOptions.findIndex(option => 
        option.value === appointment.treatmentType
    );
    
    treatmentSelect.selectedIndex = treatmentIndex >= 0 ? treatmentIndex : 0;
    document.getElementById('notes').value = appointment.notes || '';

    modal.style.display = 'block';
}

// Cerrar modal
function closeModal() {
    document.getElementById('requestModal').style.display = 'none';
    disableRescheduleMode();
}

// Activar modo de reprogramación
function toggleRescheduleMode() {
    const isRescheduleMode = document.getElementById('appointmentDateTime').readOnly === false;
    
    if (isRescheduleMode) {
        disableRescheduleMode();
    } else {
        enableRescheduleMode();
    }
}

// Habilitar modo de reprogramación
function enableRescheduleMode() {
    document.getElementById('appointmentDateTime').readOnly = false;
    document.getElementById('treatmentType').disabled = false;
    document.getElementById('notes').readOnly = false;
    document.getElementById('dateEditHint').style.display = 'block';
    
    document.getElementById('toggleRescheduleBtn').style.display = 'none';
    document.getElementById('saveRescheduleBtn').style.display = 'inline-block';
}

// Deshabilitar modo de reprogramación
function disableRescheduleMode() {
    document.getElementById('appointmentDateTime').readOnly = true;
    document.getElementById('treatmentType').disabled = true;
    document.getElementById('notes').readOnly = true;
    document.getElementById('dateEditHint').style.display = 'none';
    
    document.getElementById('toggleRescheduleBtn').style.display = 'inline-block';
    document.getElementById('saveRescheduleBtn').style.display = 'none';
}

// Actualizar el estado de una cita
async function updateAppointment(action) {
    console.log(`Actualizando cita con acción: ${action}`);
    if (!currentAppointment) {
        console.error("Error: No hay cita seleccionada para actualizar");
        return;
    }

    try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
            console.error("Error: No hay token de autenticación");
            return;
        }
        
        let endpoint;
        let method;
        let updatedData = null;
        let actionText = '';
        
        // Usar URL absoluta
        const apiUrl = window.location.origin + '/api';
        
        // Configurar acción según el tipo
        if (action === 'reject') {
            endpoint = `${apiUrl}/Staff/appointments/${currentAppointment.id}`;
            method = 'DELETE';
            actionText = 'Rechazada';
        } else if (action === 'confirm') {
            endpoint = `${apiUrl}/Staff/appointments/${currentAppointment.id}/status`;
            method = 'PUT';
            updatedData = {
                isConfirmed: true,
                notes: document.getElementById('notes').value
            };
            actionText = 'Aceptada';
        } else if (action === 'reschedule') {
            endpoint = `${apiUrl}/Staff/appointments/${currentAppointment.id}/status`;
            method = 'PUT';
            
            const newDateTime = document.getElementById('appointmentDateTime').value;
            if (!newDateTime) {
                alert('Por favor, selecciona una fecha y hora para reprogramar la cita.');
                return;
            }
            
            updatedData = {
                isConfirmed: true,
                notes: document.getElementById('notes').value,
                appointmentDateTime: new Date(newDateTime).toISOString(),
                treatmentType: document.getElementById('treatmentType').value
            };
            actionText = 'Reprogramada';
        } else {
            console.error(`Acción desconocida: ${action}`);
            return;
        }
        
        console.log(`Realizando petición ${method} a ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: method === 'PUT' ? JSON.stringify(updatedData) : null
        });

        if (response.ok) {
            console.log("Cita actualizada correctamente");
            
            // Crear elemento para el historial
            const historyItem = {
                appointmentId: currentAppointment.id,
                patientName: currentAppointment.patientName,
                action: actionText,
                timestamp: new Date().toISOString()
            };
            
            // Actualizar la interfaz local inmediatamente
            addToRequestHistory(historyItem);
            
            // Mostrar notificación
            showActionNotification(`Cita ${actionText.toLowerCase()} exitosamente`);
            
            // Cerrar el modal
            closeModal();
            
            // Recargar datos
            loadPendingRequests();
            
            if (adminCalendar) {
                adminCalendar.loadAppointments();
            }
            
            if (adminCalendar && adminCalendar.selectedDate) {
                loadAppointmentsForDate(adminCalendar.selectedDate);
            }
        } else {
            console.error(`Error al actualizar la cita: ${response.status} ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            alert(`Error al procesar la solicitud: ${errorData.message || response.statusText}`);
        }
    } catch (error) {
        console.error('Error al actualizar la cita:', error);
        alert('Error al procesar la solicitud. Por favor, inténtalo de nuevo.');
    }
}

// Agregar elemento al historial local
function addToRequestHistory(historyItem) {
    requestHistory.unshift(historyItem);
    displayRequestHistory();
}

// Mostrar notificación de acción completada
function showActionNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'action-notification';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

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
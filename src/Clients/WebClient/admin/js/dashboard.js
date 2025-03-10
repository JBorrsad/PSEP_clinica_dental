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
        initializeDashboard();
    } else {
        console.log("No hay token, mostrando formulario de login");
    }
    
    // Configurar evento para cerrar sesión
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Configurar eventos para el modal de citas
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('acceptBtn').addEventListener('click', () => updateAppointment('confirm'));
    document.getElementById('toggleRescheduleBtn').addEventListener('click', toggleRescheduleMode);
    document.getElementById('saveRescheduleBtn').addEventListener('click', () => updateAppointment('reschedule'));
    document.getElementById('rejectBtn').addEventListener('click', () => updateAppointment('reject'));
    
    // Configurar el colapso del historial
    setupCollapsibleSections();
});

// Inicializar el panel de administración
function initializeDashboard() {
    console.log("Inicializando dashboard...");
    
    try {
        // Inicializar el calendario
        const calendarContainer = document.getElementById('adminCalendar');
        if (!calendarContainer) {
            console.error("Error: No se encontró el contenedor del calendario con ID 'adminCalendar'");
        } else {
            console.log("Inicializando calendario administrativo");
            adminCalendar = new AdminCalendar('adminCalendar');
            
            // Configurar el callback para cuando se selecciona una fecha
            adminCalendar.setOnDateSelected(loadAppointmentsForDate);
            
            // Inicializar el calendario y cargar las citas
            adminCalendar.initialize();
        }
        
        // Cargar solicitudes pendientes
        loadPendingRequests();
        
        // Cargar historial de solicitudes
        loadRequestHistory();
        
        // Configurar conexión WebSocket
        setupWebSocketConnection();
        
        console.log("Dashboard inicializado correctamente");
    } catch (error) {
        console.error("Error al inicializar el dashboard:", error);
    }
}

// Configurar las secciones colapsables
function setupCollapsibleSections() {
    console.log("Configurando secciones colapsables...");
    const collapsibles = document.querySelectorAll('.collapsible');
    
    collapsibles.forEach((section, index) => {
        console.log(`Configurando sección colapsable ${index + 1}`);
        
        // Inicialmente colapsar las secciones
        section.classList.add('collapsed');
        
        const header = section.querySelector('.collapsible-header');
        if (!header) {
            console.error(`No se encontró el encabezado para la sección colapsable ${index + 1}`);
            return;
        }
        
        const content = section.querySelector('.collapsible-content');
        if (!content) {
            console.error(`No se encontró el contenido para la sección colapsable ${index + 1}`);
            return;
        }
        
        // Aplicar estilo para ocultar inicialmente
        content.style.display = 'none';
        
        header.addEventListener('click', () => {
            console.log(`Clic en el encabezado de la sección ${index + 1}`);
            section.classList.toggle('collapsed');
            
            // Mostrar u ocultar el contenido
            if (section.classList.contains('collapsed')) {
                console.log("Colapsando la sección");
                content.style.display = 'none';
            } else {
                console.log("Expandiendo la sección");
                content.style.display = 'block';
            }
            
            // Rotar el icono si es necesario
            const icon = header.querySelector('.toggle-icon');
            if (icon) {
                if (section.classList.contains('collapsed')) {
                    icon.style.transform = 'rotate(-90deg)';
                } else {
                    icon.style.transform = 'rotate(0deg)';
                }
            }
        });
    });
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
        const token = localStorage.getItem('staffToken');
        if (!token) {
            console.error("Error: No hay token de autenticación");
            return;
        }
        
        // Usar URL absoluta
        const apiUrl = window.location.origin + '/api';
        const url = `${apiUrl}/Staff/pending`;
        console.log(`Realizando petición a: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log("Solicitudes pendientes recibidas correctamente");
            const appointments = await response.json();
            console.log(`Recibidas ${appointments.length} solicitudes pendientes`);
            displayPendingRequests(appointments);
        } else {
            console.error(`Error al cargar solicitudes pendientes: ${response.status} ${response.statusText}`);
            throw new Error(`Error al cargar solicitudes pendientes: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error al cargar solicitudes pendientes:", error);
        const container = document.getElementById('pendingRequests');
        if (container) {
            container.innerHTML = '<p class="empty-message error-message">Error al cargar solicitudes</p>';
        }
    }
}

// Mostrar las solicitudes pendientes en el panel lateral
function displayPendingRequests(appointments) {
    const container = document.getElementById('pendingRequests');
    container.innerHTML = '';

    // Filtrar citas pendientes (no confirmadas)
    const pendingAppointments = appointments.filter(appointment => !appointment.isConfirmed);

    if (pendingAppointments.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay solicitudes pendientes</p>';
        return;
    }

    pendingAppointments.forEach(appointment => {
        const card = document.createElement('div');
        card.className = 'request-card';
        const appointmentDate = new Date(appointment.appointmentDateTime);
        
        card.innerHTML = `
            <div class="status-badge status-pending">Pendiente</div>
            <h3>${appointment.patientName}</h3>
            <p>Fecha: ${appointmentDate.toLocaleDateString()}</p>
            <p>Hora: ${appointmentDate.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</p>
            <p>Tratamiento: ${appointment.treatmentType}</p>
        `;
        card.onclick = () => openAppointmentModal(appointment);
        container.appendChild(card);
    });
}

// Cargar citas para una fecha específica
async function loadAppointmentsForDate(date) {
    console.log(`Cargando citas para la fecha: ${date.toISOString().split('T')[0]}`);
    
    try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
            console.error("Error: No hay token de autenticación");
            return;
        }
        
        // Formatear la fecha para la URL
        const dateString = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        // Usar URL absoluta
        const apiUrl = window.location.origin + '/api';
        const url = `${apiUrl}/Staff/appointments/date/${dateString}`;
        console.log(`Realizando petición a: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log("Citas diarias recibidas correctamente");
            const appointments = await response.json();
            console.log(`Recibidas ${appointments.length} citas para el día ${dateString}`);
            displayDailyAppointments(appointments, date);
        } else {
            console.error(`Error al cargar las citas: ${response.status} ${response.statusText}`);
            throw new Error(`Error al cargar las citas del día: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error al cargar citas diarias:', error);
        document.getElementById('dailyAppointmentsList').innerHTML = 
            '<p class="empty-message error-message">Error al cargar las citas del día</p>';
    }
}

// Mostrar las citas diarias
function displayDailyAppointments(appointments, date) {
    const container = document.getElementById('dailyAppointmentsList');
    container.innerHTML = '';

    if (appointments.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay citas programadas para este día</p>';
        return;
    }

    // Ordenar citas por hora
    appointments.sort((a, b) => 
        new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()
    );

    appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.appointmentDateTime);
        const item = document.createElement('div');
        
        item.className = `daily-appointment-item${appointment.isConfirmed ? '' : ' pending'}`;
        
        item.innerHTML = `
            <div class="daily-appointment-time">
                ${appointmentDate.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                <span class="status-badge status-${appointment.isConfirmed ? 'confirmed' : 'pending'}">
                    ${appointment.isConfirmed ? 'Confirmada' : 'Pendiente'}
                </span>
            </div>
            <div class="daily-appointment-patient">${appointment.patientName}</div>
            <div class="daily-appointment-treatment">${appointment.treatmentType}</div>
        `;
        
        item.onclick = () => openAppointmentModal(appointment);
        container.appendChild(item);
    });
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
        
        // Usar la URL absoluta
        const apiUrl = window.location.origin + '/api';
        const url = `${apiUrl}/Staff/history`;
        console.log(`Realizando petición al endpoint de historial: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log("Respuesta recibida correctamente del endpoint de historial");
            requestHistory = await response.json();
            console.log(`Recibidos ${requestHistory.length} elementos de historial:`, requestHistory);
            displayRequestHistory();
        } else {
            console.error(`Error al cargar el historial: ${response.status} ${response.statusText}`);
            throw new Error(`Error al cargar el historial de solicitudes: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error al cargar el historial de solicitudes:", error);
        // Mostrar mensaje de error en la UI
        const container = document.getElementById('requestHistory');
        if (container) {
            container.innerHTML = '<p class="empty-message error-message">Error al cargar el historial</p>';
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

    sortedHistory.forEach((item, index) => {
        console.log(`Procesando elemento de historial ${index + 1}:`, item);
        
        // Verificar si el elemento tiene las propiedades necesarias
        if (!item.patientName || !item.action || !item.timestamp) {
            console.warn(`Elemento de historial ${index + 1} incompleto:`, item);
            return; // Saltar este elemento
        }
        
        const historyItem = document.createElement('div');
        let statusClass = '';
        
        // Normalizar la acción a minúsculas para la comparación
        const action = item.action.toLowerCase();
        
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
        
        // Asegurarse de que timestamp sea una fecha válida
        let formattedDate = 'Fecha desconocida';
        let formattedTime = '';
        
        try {
            const date = new Date(item.timestamp);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString();
                formattedTime = date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            }
        } catch (error) {
            console.error(`Error al formatear la fecha del elemento ${index + 1}:`, error);
        }
        
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span>${item.patientName || 'Paciente sin nombre'}</span>
                <span class="history-item-date">${formattedDate} ${formattedTime}</span>
            </div>
            <div class="history-item-status">
                <span>Pendiente</span>
                <span class="status-arrow">→</span>
                <span>${item.action}</span>
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
    localStorage.removeItem('staffToken');
    window.location.reload();
} 
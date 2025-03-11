/**
 * Clase AdminCalendar para el panel de administración
 */
class AdminCalendar {
    /**
     * Constructor del calendario administrativo
     * @param {string} containerId - ID del contenedor del calendario
     */
    constructor(containerId) {
        console.log(`Creando AdminCalendar en el contenedor: ${containerId}`);
        
        // Validar parámetros
        if (!containerId) {
            throw new Error("Se requiere un ID de contenedor para el calendario");
        }
        
        // Obtener contenedor
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`No se encontró el elemento con ID: ${containerId}`);
        }
        
        // Inicializar propiedades
        this.currentDate = new Date();
        this.selectedDate = null;
        this.appointments = [];
        this.onDateSelectedCallback = null;
        
        // Mensaje de inicialización exitosa
        console.log("AdminCalendar inicializado correctamente");
    }
    
    /**
     * Inicializa el calendario
     */
    initialize() {
        console.log("Inicializando calendario administrativo...");
        try {
            this.loadAppointmentsData();
        } catch (error) {
            console.error("Error al inicializar calendario:", error);
            this.showError("Error al inicializar el calendario: " + error.message);
        }
    }
    
    /**
     * Carga las citas desde la API
     */
    loadAppointmentsData() {
        console.log("Cargando datos de citas...");
        this.showLoading();
        
        // Obtener token de autenticación
        const token = localStorage.getItem('staffToken');
        if (!token) {
            console.error("No hay token de autenticación disponible");
            this.showError("Error de autenticación. Inicie sesión nuevamente.");
            return;
        }
        
        // Realizar petición para obtener todas las citas
        fetch(API_URL + '/Appointments', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Datos de citas recibidos:", data);
            this.appointments = Array.isArray(data) ? data : [];
            this.render();
        })
        .catch(error => {
            console.error("Error al cargar citas:", error);
            this.showError("Error al cargar datos de citas: " + error.message);
        });
    }
    
    /**
     * Establece el callback para cuando se selecciona una fecha
     * @param {Function} callback 
     */
    setOnDateSelected(callback) {
        if (typeof callback === 'function') {
            this.onDateSelectedCallback = callback;
            console.log("Callback de selección de fecha establecido");
        } else {
            console.error("El callback debe ser una función");
        }
    }
    
    /**
     * Muestra un mensaje de error en el contenedor
     * @param {string} message - Mensaje de error
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button onclick="adminCalendar.initialize()">Reintentar</button>
                </div>
            `;
        }
    }
    
    /**
     * Muestra un mensaje de carga en el contenedor
     */
    showLoading() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando calendario...</p>
                </div>
            `;
        }
    }
    
    /**
     * Renderiza el calendario
     */
    render() {
        console.log("Renderizando calendario...");
        
        // Verificar que el contenedor existe
        if (!this.container) {
            console.error("No se puede renderizar: el contenedor no existe");
            return;
        }
        
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        // Construir HTML del calendario con diseño mejorado
        let html = '<div class="admin-calendar">';
        
        // Cabecera con navegación
        html += '<div class="calendar-header">';
        html += '<button class="prev-month" onclick="window.adminCalendar.previousMonth()">&lt;</button>';
        html += `<span>${this.getMonthName(this.currentDate.getMonth())} de ${this.currentDate.getFullYear()}</span>`;
        html += '<button class="next-month" onclick="window.adminCalendar.nextMonth()">&gt;</button>';
        html += '</div>';
        
        // Días de la semana
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        html += '<div class="calendar-days">';
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';
        
        // Fechas del mes
        html += '<div class="calendar-dates">';
        
        // Espacios vacíos antes del primer día
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="calendar-date empty"></div>';
        }
        
        // Días del mes
        const today = new Date();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), i);
            const dateStr = this.formatDate(date);
            
            // Obtener información de citas para este día
            const appointmentInfo = this.getAppointmentsForDate(date);
            const hasPendingAppointments = appointmentInfo.pending > 0;
            const hasConfirmedAppointments = appointmentInfo.confirmed > 0;
            
            // Determinar clases CSS
            const isToday = date.getDate() === today.getDate() && 
                           date.getMonth() === today.getMonth() && 
                           date.getFullYear() === today.getFullYear();
                           
            const isSelected = this.selectedDate && 
                              date.getDate() === this.selectedDate.getDate() &&
                              date.getMonth() === this.selectedDate.getMonth() &&
                              date.getFullYear() === this.selectedDate.getFullYear();
            
            const classNames = [
                'calendar-date',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
                (hasPendingAppointments || hasConfirmedAppointments) ? 'has-appointments' : ''
            ].filter(Boolean).join(' ');
            
            // Crear indicadores de citas pendientes y confirmadas
            let appointmentIndicators = '';
            
            if (hasPendingAppointments) {
                appointmentIndicators += `<span class="appointment-indicator pending">${appointmentInfo.pending}</span>`;
            }
            
            if (hasConfirmedAppointments) {
                appointmentIndicators += `<span class="appointment-indicator confirmed">${appointmentInfo.confirmed}</span>`;
            }
            
            // Crear HTML para el día
            html += `
                <div class="${classNames}" data-date="${dateStr}" onclick="window.adminCalendar.selectDate('${dateStr}')">
                    <span class="date-number">${i}</span>
                    <div class="appointment-indicators">
                        ${appointmentIndicators}
                    </div>
                </div>
            `;
        }
        
        html += '</div></div>';
        
        // Agregar estilos mejorados que coincidan con el diseño de la página principal
        html += `
        <style>
            .admin-calendar {
                width: 100%;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: white;
                overflow: hidden;
            }
            
            .admin-calendar .calendar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background-color: #f8f8f8;
                border-bottom: 1px solid #ddd;
            }
            
            .admin-calendar .calendar-header span {
                font-weight: bold;
                color: #333;
                font-size: 16px;
            }
            
            .admin-calendar .calendar-header button {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                width: 30px;
                height: 30px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.3s;
            }
            
            .admin-calendar .calendar-header button:hover {
                background-color: #45a049;
            }
            
            .admin-calendar .calendar-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                background-color: #f8f8f8;
                padding: 5px;
                border-bottom: 1px solid #ddd;
            }
            
            .admin-calendar .calendar-day-header {
                text-align: center;
                font-weight: bold;
                padding: 8px;
                color: #555;
                font-size: 14px;
            }
            
            .admin-calendar .calendar-dates {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 1px;
                background-color: white;
                padding: 5px;
            }
            
            .admin-calendar .calendar-date {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                height: 60px;
                padding: 8px 0;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
                border-radius: 4px;
            }
            
            .admin-calendar .calendar-date:hover {
                background-color: #f0f0f0;
                border-color: #ddd;
            }
            
            .admin-calendar .calendar-date.empty {
                cursor: default;
            }
            
            .admin-calendar .calendar-date.selected {
                background-color: #4CAF50;
                color: white;
                font-weight: bold;
                border-color: #4CAF50;
            }
            
            .admin-calendar .calendar-date.today {
                border: 2px solid #4CAF50;
                font-weight: bold;
            }
            
            .admin-calendar .date-number {
                font-size: 16px;
                margin-bottom: 4px;
            }
            
            .admin-calendar .appointment-indicators {
                display: flex;
                justify-content: center;
                gap: 4px;
                margin-top: 2px;
            }
            
            .admin-calendar .appointment-indicator {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                font-size: 10px;
                font-weight: bold;
            }
            
            .admin-calendar .appointment-indicator.pending {
                background-color: #f39c12;
                color: white;
            }
            
            .admin-calendar .appointment-indicator.confirmed {
                background-color: #2ecc71;
                color: white;
            }
        </style>
        `;
        
        // Actualizar contenedor
        this.container.innerHTML = html;
    }
    
    /**
     * Obtiene información de citas para una fecha específica
     * @param {Date} date - Fecha a verificar
     * @returns {Object} Objeto con conteo de citas pendientes y confirmadas
     */
    getAppointmentsForDate(date) {
        const result = {
            pending: 0,
            confirmed: 0,
            total: 0
        };
        
        if (!this.appointments || !Array.isArray(this.appointments)) {
            return result;
        }
        
        const dateStr = this.formatDate(date);
        
        this.appointments.forEach(appointment => {
            // Verificar si appointment es válido y tiene appointmentDateTime
            if (!appointment || !appointment.appointmentDateTime) {
                return;
            }
            
            // Extraer la fecha de la cita
            const appointmentDate = new Date(appointment.appointmentDateTime);
            const appointmentDateStr = this.formatDate(appointmentDate);
            
            if (appointmentDateStr === dateStr) {
                result.total++;
                
                // Contar citas pendientes y confirmadas
                if (appointment.status === 'Canceled' || appointment.status === 'Cancelada') {
                    // No contar canceladas
                } else if (appointment.isConfirmed === true || appointment.status === 'Confirmada') {
                    result.confirmed++;
                } else {
                    result.pending++;
                }
            }
        });
        
        return result;
    }
    
    /**
     * Verifica si hay citas para una fecha específica
     * @param {Date} date - Fecha a verificar
     * @returns {boolean} True si hay citas, false en caso contrario
     */
    hasAppointmentsForDate(date) {
        const appointmentInfo = this.getAppointmentsForDate(date);
        return appointmentInfo.total > 0;
    }
    
    /**
     * Devuelve la fecha seleccionada actual
     * @returns {string|null} Fecha seleccionada en formato YYYY-MM-DD o null
     */
    getSelectedDate() {
        return this.selectedDate ? this.formatDate(this.selectedDate) : null;
    }
    
    /**
     * Selecciona una fecha y ejecuta el callback
     * @param {string} dateStr - Fecha en formato YYYY-MM-DD
     */
    selectDate(dateStr) {
        console.log("Fecha seleccionada:", dateStr);
        
        // Convertir string a objeto Date
        const date = new Date(dateStr + "T00:00:00");
        
        // Actualizar fecha seleccionada
        this.selectedDate = date;
        
        // Re-renderizar para mostrar la selección
        this.render();
        
        // Ejecutar callback si existe
        if (this.onDateSelectedCallback) {
            console.log("Ejecutando callback con fecha:", date);
            this.onDateSelectedCallback(date);
        }
    }
    
    /**
     * Avanza al mes siguiente
     */
    nextMonth() {
        console.log("Avanzando al mes siguiente");
        // Crear una nueva fecha para evitar referencia al objeto actual
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
        this.render();
    }
    
    /**
     * Retrocede al mes anterior
     */
    previousMonth() {
        console.log("Retrocediendo al mes anterior");
        // Crear una nueva fecha para evitar referencia al objeto actual
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
        this.render();
    }
    
    /**
     * Obtiene el nombre del mes
     * @param {number} month - Número del mes (0-11)
     * @returns {string} Nombre del mes
     */
    getMonthName(month) {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[month];
    }
    
    /**
     * Formatea una fecha a formato YYYY-MM-DD
     * @param {Date} date - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Exponer funciones globalmente para acceso desde HTML
window.adminCalendar = null;

// No inicializamos aquí, lo haremos desde dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("[AdminCalendar] DOM cargado para admin-calendar.js");
}); 
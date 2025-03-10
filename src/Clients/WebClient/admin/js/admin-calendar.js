// Clase para el calendario administrativo
class AdminCalendar {
    constructor(containerId) {
        console.log(`Construyendo AdminCalendar para el contenedor '${containerId}'`);
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Error: No se encontró el contenedor con ID '${containerId}'`);
            return;
        }
        
        console.log(`Inicializando calendario administrativo en ${containerId}`);
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.appointments = {
            confirmed: {},  // Mapa de fechas -> número de citas confirmadas
            pending: {}     // Mapa de fechas -> número de citas pendientes
        };
        this.onDateSelected = null;
    }

    // Establecer función callback para cuando se selecciona una fecha
    setOnDateSelected(callback) {
        this.onDateSelected = callback;
    }

    // Inicializar el calendario
    initialize() {
        try {
            console.log("Inicializando calendario administrativo...");
            this.render();
            this.loadAppointments();
            console.log("Calendario administrativo inicializado correctamente");
        } catch (error) {
            console.error("Error al inicializar el calendario administrativo:", error);
        }
    }

    // Cargar citas desde la API
    async loadAppointments() {
        try {
            console.log("Cargando citas para el calendario administrativo...");
            const token = localStorage.getItem('staffToken');
            if (!token) {
                console.error("No hay token disponible para cargar citas");
                return;
            }
            
            const apiUrl = window.location.origin + '/api';
            console.log(`Realizando petición a ${apiUrl}/Staff/appointments/all`);
            
            const response = await fetch(`${apiUrl}/Staff/appointments/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log("Respuesta recibida correctamente");
                const appointments = await response.json();
                console.log(`Recibidas ${appointments.length} citas`);
                this.processAppointments(appointments);
                this.render();
                
                // Si hay un callback de fecha seleccionada, llamarlo
                if (this.onDateSelected) {
                    this.onDateSelected(this.selectedDate);
                }
            } else {
                console.error(`Error al cargar citas: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error al cargar citas para el calendario:', error);
        }
    }

    // Procesar las citas para agruparlas por fecha y estado
    processAppointments(appointments) {
        // Reiniciar mapa de citas
        this.appointments = {
            confirmed: {},
            pending: {}
        };

        // Procesar cada cita
        appointments.forEach(appointment => {
            const date = new Date(appointment.appointmentDateTime);
            const dateKey = this.formatDateKey(date);
            
            if (appointment.isConfirmed) {
                if (!this.appointments.confirmed[dateKey]) {
                    this.appointments.confirmed[dateKey] = 0;
                }
                this.appointments.confirmed[dateKey]++;
            } else {
                if (!this.appointments.pending[dateKey]) {
                    this.appointments.pending[dateKey] = 0;
                }
                this.appointments.pending[dateKey]++;
            }
        });
    }

    // Formatear fecha como clave para el mapa (YYYY-MM-DD)
    formatDateKey(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }

    // Renderizar el calendario
    render() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        let html = '<div class="admin-calendar-container">';
        
        // Cabecera del calendario
        html += '<div class="calendar-header">';
        html += `<button class="calendar-nav-btn" onclick="adminCalendar.previousMonth()">&lt;</button>`;
        html += `<span>${this.currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>`;
        html += `<button class="calendar-nav-btn" onclick="adminCalendar.nextMonth()">&gt;</button>`;
        html += '</div>';
        
        // Días de la semana
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        html += '<div class="calendar-days">';
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';

        // Días del mes
        html += '<div class="calendar-dates">';
        
        // Espacios en blanco para el primer día
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="calendar-date empty"></div>';
        }

        // Días del mes
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), i);
            const dateKey = this.formatDateKey(date);
            const confirmedCount = this.appointments.confirmed[dateKey] || 0;
            const pendingCount = this.appointments.pending[dateKey] || 0;
            
            const isSelected = this.selectedDate && 
                             date.getFullYear() === this.selectedDate.getFullYear() &&
                             date.getMonth() === this.selectedDate.getMonth() &&
                             date.getDate() === this.selectedDate.getDate();
            
            const isPast = date < new Date().setHours(0,0,0,0);
            const classes = [
                'calendar-date',
                isSelected ? 'selected' : '',
                isPast ? 'past' : ''
            ].filter(Boolean).join(' ');

            html += `<div class="${classes}" onclick="adminCalendar.selectDate(${i})">`;
            html += `<span class="date-number">${i}</span>`;
            
            // Añadir indicadores de citas solo si hay citas ese día
            if (confirmedCount > 0 || pendingCount > 0) {
                html += '<div class="appointment-indicators">';
                
                if (confirmedCount > 0) {
                    html += `<span class="indicator confirmed" title="${confirmedCount} citas confirmadas">${confirmedCount}</span>`;
                }
                
                if (pendingCount > 0) {
                    html += `<span class="indicator pending" title="${pendingCount} citas pendientes">${pendingCount}</span>`;
                }
                
                html += '</div>';
            }
            
            html += '</div>';
        }
        html += '</div></div>';

        this.container.innerHTML = html;
    }

    // Seleccionar una fecha
    selectDate(day) {
        this.selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        this.render();
        
        // Actualizar el formato de la fecha mostrada
        const formattedDate = this.selectedDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('selectedDate').textContent = formattedDate;
        
        // Si hay un callback de fecha seleccionada, llamarlo
        if (this.onDateSelected) {
            this.onDateSelected(this.selectedDate);
        }
    }

    // Ir al mes anterior
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    // Ir al mes siguiente
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }
}

// Inicializar variables globales
let adminCalendar;
let API_URL = '/api'; // Esto debería ser definido en dashboard.js también

// Cuando se carga el documento, inicializar el calendario
document.addEventListener('DOMContentLoaded', () => {
    // No inicializamos aquí para asegurarnos de que el token esté disponible
    // La inicialización ocurrirá después del login exitoso en dashboard.js
}); 
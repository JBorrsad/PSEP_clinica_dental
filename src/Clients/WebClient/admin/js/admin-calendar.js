/**
 * Clase AdminCalendar: Gestiona el calendario para el panel de administración
 */
class AdminCalendar {
    /**
     * Constructor del calendario
     * @param {string} containerId - ID del elemento contenedor para el calendario
     */
    constructor(containerId) {
        console.log(`Construyendo AdminCalendar con containerId: ${containerId}`);
        
        // Validar que se proporcionó un ID de contenedor
        if (!containerId) {
            throw new Error('Se requiere un ID de contenedor para inicializar el calendario');
        }
        
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        // Verificar que el contenedor existe
        if (!this.container) {
            throw new Error(`No se encontró el elemento con ID '${containerId}'`);
        }
        
        // Mes y año actuales
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        
        // Callback para cuando se selecciona una fecha
        this.onDateSelected = null;
        
        // Almacén de citas para mostrar en el calendario
        this.appointments = [];
        
        console.log(`AdminCalendar construido con éxito. Fecha actual: ${this.currentDate.toLocaleDateString()}`);
    }
    
    /**
     * Establece el callback para cuando se selecciona una fecha
     * @param {Function} callback - Función a llamar cuando se selecciona una fecha
     */
    setOnDateSelected(callback) {
        if (typeof callback !== 'function') {
            console.error('El callback debe ser una función');
            return;
        }
        this.onDateSelected = callback;
        console.log('Callback de selección de fecha establecido');
    }
    
    /**
     * Inicializa el calendario
     */
    initialize() {
        console.log('Inicializando el calendario...');
        try {
            this.render();
            this.loadAppointments();
            console.log('Calendario inicializado con éxito');
        } catch (error) {
            console.error('Error al inicializar el calendario:', error);
            this.showError('Error al inicializar el calendario: ' + error.message);
        }
    }
    
    /**
     * Muestra un mensaje de error en el contenedor
     * @param {string} message - Mensaje de error a mostrar
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
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
     * Carga las citas desde la API
     */
    loadAppointments() {
        console.log('Cargando citas para el calendario...');
        this.showLoading();
        
        // Verificar que hay un token válido
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No hay un token de autenticación');
            this.showError('Error de autenticación. Por favor, inicie sesión nuevamente.');
            return;
        }
        
        // Construir la URL de la API con el origen absoluto
        const apiUrl = `${window.location.origin}/api/appointments`;
        console.log(`URL de API para citas: ${apiUrl}`);
        
        // Realizar la petición a la API
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al obtener las citas: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Citas recibidas:', data);
            this.appointments = data;
            this.render();
        })
        .catch(error => {
            console.error('Error al cargar las citas:', error);
            this.showError('Error al cargar las citas: ' + error.message);
        });
    }
    
    /**
     * Renderiza el calendario
     */
    render() {
        console.log('Renderizando calendario...');
        if (!this.container) {
            console.error('No se puede renderizar el calendario: el contenedor no existe');
            return;
        }
        
        // Crear estructura del calendario
        let calendarHTML = `
            <div class="calendar-header">
                <button id="prevMonth" class="calendar-nav-btn">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h2 id="currentMonthYear">${this.getMonthName(this.currentMonth)} ${this.currentYear}</h2>
                <button id="nextMonth" class="calendar-nav-btn">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="calendar-body">
                <div class="weekdays">
                    <div>Dom</div>
                    <div>Lun</div>
                    <div>Mar</div>
                    <div>Mié</div>
                    <div>Jue</div>
                    <div>Vie</div>
                    <div>Sáb</div>
                </div>
                <div class="days" id="calendarDays">
                    ${this.generateDays()}
                </div>
            </div>
        `;
        
        // Actualizar el contenedor
        this.container.innerHTML = calendarHTML;
        
        // Añadir eventos a los botones de navegación
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.navigateMonth(-1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.navigateMonth(1);
            });
        }
        
        // Añadir eventos de clic a los días del calendario
        this.attachDayClickEvents();
        
        console.log('Calendario renderizado con éxito');
    }
    
    /**
     * Genera el HTML para los días del calendario
     * @returns {string} HTML con los días del mes
     */
    generateDays() {
        console.log(`Generando días para ${this.getMonthName(this.currentMonth)} ${this.currentYear}`);
        
        // Obtener el primer día del mes actual
        const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
        const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        // Obtener el número del día de la semana (0: domingo, 6: sábado)
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();
        
        console.log(`Primer día del mes cae en día de semana: ${firstDayOfWeek}, Días en el mes: ${daysInMonth}`);
        
        let daysHTML = '';
        
        // Añadir espacios en blanco para los días anteriores al primer día del mes
        for (let i = 0; i < firstDayOfWeek; i++) {
            daysHTML += '<div class="day empty"></div>';
        }
        
        // Añadir los días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dateString = this.formatDate(date);
            
            // Verificar si hay citas para este día
            const hasAppointments = this.hasAppointmentsOnDate(dateString);
            const isToday = this.isToday(date);
            
            let className = 'day';
            if (isToday) className += ' today';
            if (hasAppointments) className += ' has-appointments';
            
            daysHTML += `
                <div class="${className}" data-date="${dateString}">
                    <span class="day-number">${day}</span>
                    ${hasAppointments ? '<span class="appointment-indicator"></span>' : ''}
                </div>
            `;
        }
        
        return daysHTML;
    }
    
    /**
     * Añade eventos de clic a los días del calendario
     */
    attachDayClickEvents() {
        console.log('Adjuntando eventos de clic a los días...');
        const days = document.querySelectorAll(`#${this.containerId} .day:not(.empty)`);
        
        days.forEach(day => {
            day.addEventListener('click', () => {
                const dateString = day.getAttribute('data-date');
                console.log(`Día seleccionado: ${dateString}`);
                
                // Eliminar la clase 'selected' de todos los días
                document.querySelectorAll(`#${this.containerId} .day`).forEach(d => {
                    d.classList.remove('selected');
                });
                
                // Añadir la clase 'selected' al día seleccionado
                day.classList.add('selected');
                
                // Llamar al callback si existe
                if (this.onDateSelected && dateString) {
                    console.log(`Llamando a onDateSelected con fecha: ${dateString}`);
                    this.onDateSelected(dateString);
                }
            });
        });
        
        console.log(`Se adjuntaron eventos a ${days.length} días`);
    }
    
    /**
     * Cambia el mes actual
     * @param {number} delta - Número de meses a avanzar/retroceder
     */
    navigateMonth(delta) {
        console.log(`Navegando ${delta > 0 ? 'adelante' : 'atrás'} un mes`);
        this.currentMonth += delta;
        
        // Ajustar el año si el mes sale del rango (0-11)
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        
        console.log(`Nuevo mes: ${this.getMonthName(this.currentMonth)} ${this.currentYear}`);
        
        // Actualizar el calendario
        this.render();
    }
    
    /**
     * Comprueba si una fecha es hoy
     * @param {Date} date - Fecha a comprobar
     * @returns {boolean} true si la fecha es hoy
     */
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
    }
    
    /**
     * Comprueba si hay citas en una fecha determinada
     * @param {string} dateString - Fecha en formato YYYY-MM-DD
     * @returns {boolean} true si hay citas para esa fecha
     */
    hasAppointmentsOnDate(dateString) {
        if (!this.appointments || !Array.isArray(this.appointments)) return false;
        
        return this.appointments.some(appointment => {
            // Extraer solo la parte de la fecha (sin hora)
            const appointmentDate = appointment.date ? appointment.date.split('T')[0] : null;
            return appointmentDate === dateString;
        });
    }
    
    /**
     * Formatea una fecha como YYYY-MM-DD
     * @param {Date} date - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    formatDate(date) {
        const year = date.getFullYear();
        // Mes y día con ceros a la izquierda si es necesario
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Obtiene el nombre del mes
     * @param {number} month - Número de mes (0-11)
     * @returns {string} Nombre del mes en español
     */
    getMonthName(month) {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        return monthNames[month];
    }
}

// Exportar la clase para que esté disponible globalmente
window.AdminCalendar = AdminCalendar;

// No inicializamos aquí, lo haremos desde dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("[AdminCalendar] DOM cargado para admin-calendar.js");
}); 
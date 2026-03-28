// Управление режимом технического обслуживания
class MaintenanceManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.init();
    }

    async getStatus() {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${this.API_BASE}/api/admin/maintenance/status`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка получения статуса обслуживания:', error);
            return { success: false, error: error.message };
        }
    }

    async enable() {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${this.API_BASE}/api/admin/maintenance/enable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка включения режима обслуживания:', error);
            return { success: false, error: error.message };
        }
    }

    async disable() {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${this.API_BASE}/api/admin/maintenance/disable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка выключения режима обслуживания:', error);
            return { success: false, error: error.message };
        }
    }

    async init() {
        const status = await this.getStatus();
        this.updateUI(status.enabled);
        this.attachEventListeners();
    }

    updateUI(enabled) {
        const toggleBtn = document.getElementById('maintenanceToggle');
        const statusSpan = document.getElementById('maintenanceStatus');
        const statusText = document.getElementById('maintenanceStatusText');

        if (toggleBtn) {
            toggleBtn.textContent = enabled ? 'Выключить режим' : 'Включить режим';
            toggleBtn.classList.remove('btn-primary', 'btn-warning', 'btn-danger');
            if (enabled) {
                toggleBtn.classList.add('btn-danger');
            } else {
                toggleBtn.classList.add('btn-warning');
            }
        }
        if (statusSpan) {
            statusSpan.textContent = enabled ? 'Включён' : 'Выключен';
            statusSpan.className = enabled ? 'badge badge-danger' : 'badge badge-success';
        }
        if (statusText) {
            statusText.textContent = enabled 
                ? 'Сайт временно недоступен для посетителей.' 
                : 'Сайт работает в обычном режиме.';
        }
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('maintenanceToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
                const currentStatus = await this.getStatus();
                let result;
                if (currentStatus.enabled) {
                    result = await this.disable();
                } else {
                    result = await this.enable();
                }
                if (result.success) {
                    const newStatus = await this.getStatus();
                    this.updateUI(newStatus.enabled);
                    this.showNotification(result.message, 'success');
                } else {
                    this.showNotification(result.error || 'Не удалось изменить режим', 'error');
                }
            });
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                ${message}
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 1000;
            max-width: 400px;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что находимся на дашборде
    if (window.location.pathname.includes('/admin/dashboard') || window.location.pathname.includes('/admin/')) {
        window.maintenanceManager = new MaintenanceManager();
    }
});
// Аутентификация администратора
class AdminAuth {
    constructor() {
        this.API_BASE = window.location.origin;
        this.init();
    }
    
    init() {
        this.checkExistingSession();
        this.initializeLoginPage();
    }
    
    checkExistingSession() {
        const token = localStorage.getItem('admin_token');
        const session = localStorage.getItem('admin_session');
        
        const isLoginPage = window.location.pathname.includes('admin-login.html');
        
        if (token && session && !isLoginPage) {
            // Проверяем валидность токена
            this.verifyToken(token);
        } else if (!token && !isLoginPage) {
            window.location.href = 'admin-login.html';
        }
    }
    
    async verifyToken(token) {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/verify`, {
                headers: { 'Authorization': token }
            });
            
            if (!response.ok) {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_session');
                window.location.href = 'admin-login.html';
            }
        } catch (error) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
            window.location.href = 'admin-login.html';
        }
    }
    
    initializeLoginPage() {
        const isLoginPage = window.location.pathname.includes('admin-login.html');
        
        if (!isLoginPage) return;
        
        // Загружаем статистику
        this.loadStatistics();
        
        // Переключение видимости пароля
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', function() {
                const passwordInput = document.getElementById('password');
                const icon = this.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
        
        // Обработчик формы входа
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Проверяем сохраненные данные
        const rememberMe = localStorage.getItem('admin_remember');
        if (rememberMe === 'true') {
            const savedUsername = localStorage.getItem('admin_username');
            const usernameInput = document.getElementById('username');
            if (savedUsername && usernameInput) {
                usernameInput.value = savedUsername;
            }
            document.getElementById('remember').checked = true;
        }
    }
    
    async loadStatistics() {
        try {
            const response = await fetch(`${this.API_BASE}/api/stats`);
            const data = await response.json();
            
            if (data.success) {
                const productsCount = document.getElementById('productsCount');
                const ordersCount = document.getElementById('ordersCount');
                
                if (productsCount) productsCount.textContent = data.products_count || 0;
                if (ordersCount) ordersCount.textContent = data.orders_count || 0;
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember').checked;
        
        // Валидация
        if (!username || !password) {
            this.showNotification('Пожалуйста, заполните все поля', 'error');
            return;
        }
        
        // Показываем индикатор загрузки
        const submitBtn = event.target.querySelector('.btn-login');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Сохраняем токен и сессию
                localStorage.setItem('admin_token', data.session_token);
                localStorage.setItem('admin_session', JSON.stringify(data.admin));
                
                // Сохраняем данные для "Запомнить меня"
                if (rememberMe) {
                    localStorage.setItem('admin_username', username);
                    localStorage.setItem('admin_remember', 'true');
                } else {
                    localStorage.removeItem('admin_username');
                    localStorage.removeItem('admin_remember');
                }
                
                this.showNotification('Успешный вход! Перенаправление...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
            } else {
                this.showNotification(data.error || 'Неверный логин или пароль', 'error');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showNotification('Ошибка соединения с сервером', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
            
            this.showNotification('Вы успешно вышли из системы', 'success');
            
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 1000);
        }
    }
    
    showNotification(message, type = 'success') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icon}"></i>
                ${message}
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#27ae60' : 
                        type === 'error' ? '#e74c3c' : '#f39c12'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 1000;
            max-width: 400px;
            animation: slideIn 0.3s ease forwards;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.adminAuth = new AdminAuth();
    
    // Глобальная функция для выхода
    window.handleLogout = function(e) {
        if (e) e.preventDefault();
        window.adminAuth.logout();
    };
    
    // Дебаг функция
    window.debugAdminAuth = function() {
        console.log('=== Admin Auth Debug ===');
        console.log('Token:', localStorage.getItem('admin_token'));
        console.log('Session:', localStorage.getItem('admin_session'));
        console.log('Remember:', localStorage.getItem('admin_remember'));
        console.log('Username:', localStorage.getItem('admin_username'));
        console.log('========================');
    };
});
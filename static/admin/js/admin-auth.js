document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Auth: Initializing login page...');
    
    // Проверяем, не авторизован ли пользователь уже
    checkExistingSession();
    
    // Инициализация страницы
    initializeLoginPage();
    
    // Загрузка статистики
    loadStatistics();
    
    // Обработчик переключения видимости пароля
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
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Проверка существующей сессии
function checkExistingSession() {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    const session = JSON.parse(localStorage.getItem('admin_session'));
    
    if (isLoggedIn === 'true' && session && session.username === 'admin') {
        console.log('Admin Auth: Session exists, redirecting to dashboard...');
        // Пользователь уже авторизован, перенаправляем в админку
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 500);
    }
}

function initializeLoginPage() {
    console.log('Admin Auth: Initializing login page...');
    
    // Проверяем, есть ли сохраненные данные для входа
    const savedUsername = localStorage.getItem('admin_username');
    const savedPassword = localStorage.getItem('admin_password');
    const rememberMe = localStorage.getItem('admin_remember');
    
    if (rememberMe === 'true' && savedUsername) {
        document.getElementById('username').value = savedUsername;
        if (savedPassword) {
            document.getElementById('password').value = savedPassword;
        }
        document.getElementById('remember').checked = true;
    }
    
    // Устанавливаем дефолтные учетные данные при первом запуске
    const credentialsSet = localStorage.getItem('admin_credentials_set');
    if (!credentialsSet || credentialsSet !== 'true') {
        console.log('Admin Auth: Setting default credentials...');
        setDefaultCredentials();
    }
}

function setDefaultCredentials() {
    // Устанавливаем дефолтные логин и пароль
    const defaultCredentials = {
        username: 'admin',
        password: 'admin123',
        role: 'admin'
    };
    
    try {
        localStorage.setItem('admin_credentials', JSON.stringify(defaultCredentials));
        localStorage.setItem('admin_credentials_set', 'true');
        console.log('Admin Auth: Default credentials set successfully');
    } catch (error) {
        console.error('Admin Auth: Error setting default credentials:', error);
    }
}

function loadStatistics() {
    try {
        // Загружаем данные из localStorage
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const orders = JSON.parse(localStorage.getItem('orders')) || [];
        
        // Обновляем счетчики
        const productsCount = document.getElementById('productsCount');
        const ordersCount = document.getElementById('ordersCount');
        
        if (productsCount) {
            productsCount.textContent = products.length;
        }
        
        if (ordersCount) {
            ordersCount.textContent = orders.length;
        }
    } catch (error) {
        console.error('Admin Auth: Error loading statistics:', error);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    console.log('Admin Auth: Login attempt...');
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember').checked;
    
    console.log('Admin Auth: Username:', username);
    console.log('Admin Auth: Password length:', password.length);
    
    // Валидация
    if (!username || !password) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    // Показываем индикатор загрузки
    const submitBtn = event.target.querySelector('.btn-login');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка...';
    submitBtn.disabled = true;
    
    try {
        // Проверяем учетные данные
        const isValid = await validateCredentials(username, password);
        console.log('Admin Auth: Credentials valid:', isValid);
        
        if (isValid) {
            // Сохраняем данные для входа если выбрано "Запомнить меня"
            if (rememberMe) {
                localStorage.setItem('admin_username', username);
                localStorage.setItem('admin_password', password);
                localStorage.setItem('admin_remember', 'true');
            } else {
                localStorage.removeItem('admin_username');
                localStorage.removeItem('admin_password');
                localStorage.removeItem('admin_remember');
            }
            
            // Создаем сессию
            createAdminSession(username);
            
            // Перенаправляем в админ-панель
            showNotification('Успешный вход! Перенаправление...', 'success');
            
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1000);
        } else {
            showNotification('Неверный логин или пароль', 'error');
        }
    } catch (error) {
        console.error('Admin Auth: Login error:', error);
        showNotification('Произошла ошибка при входе: ' + error.message, 'error');
    } finally {
        // Восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function validateCredentials(username, password) {
    console.log('Admin Auth: Validating credentials...');
    
    // Загружаем сохраненные учетные данные
    const savedCredentials = localStorage.getItem('admin_credentials');
    console.log('Admin Auth: Saved credentials:', savedCredentials);
    
    if (!savedCredentials) {
        // Если нет сохраненных данных, используем дефолтные
        console.log('Admin Auth: No saved credentials, setting default...');
        setDefaultCredentials();
        return validateCredentials(username, password);
    }
    
    try {
        const credentials = JSON.parse(savedCredentials);
        console.log('Admin Auth: Parsed credentials:', credentials);
        
        // Проверяем соответствие
        if (username === credentials.username && password === credentials.password) {
            console.log('Admin Auth: Credentials match saved credentials');
            return true;
        }
        
        // Дополнительная проверка для дефолтных учетных данных
        if (username === 'admin' && password === 'admin123') {
            console.log('Admin Auth: Credentials match default');
            return true;
        }
        
        console.log('Admin Auth: Credentials do not match');
        return false;
    } catch (error) {
        console.error('Admin Auth: Error parsing credentials:', error);
        return false;
    }
}

function createAdminSession(username) {
    console.log('Admin Auth: Creating session for user:', username);
    
    const session = {
        username: username,
        loginTime: new Date().toISOString(),
        token: generateSessionToken(),
        ip: 'local'
    };
    
    console.log('Admin Auth: Session data:', session);
    
    try {
        localStorage.setItem('admin_session', JSON.stringify(session));
        localStorage.setItem('admin_logged_in', 'true');
        
        // Логируем вход
        logAdminActivity('login', `Пользователь ${username} вошел в систему`);
        
        console.log('Admin Auth: Session created successfully');
    } catch (error) {
        console.error('Admin Auth: Error creating session:', error);
    }
}

function generateSessionToken() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function logAdminActivity(action, details) {
    try {
        const logs = JSON.parse(localStorage.getItem('admin_logs')) || [];
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            user: localStorage.getItem('admin_session') ? JSON.parse(localStorage.getItem('admin_session')).username : 'unknown'
        };
        
        logs.push(logEntry);
        
        // Сохраняем только последние 100 записей
        if (logs.length > 100) {
            logs.shift();
        }
        
        localStorage.setItem('admin_logs', JSON.stringify(logs));
    } catch (error) {
        console.error('Admin Auth: Error logging activity:', error);
    }
}

function showNotification(message, type = 'success') {
    console.log('Admin Auth: Showing notification:', message, type);
    
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            ${message}
        </div>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
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
    
    // Добавляем анимацию входа
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Добавляем CSS для анимации
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(120%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(120%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Добавляем глобальные функции для отладки
window.debugAdminAuth = function() {
    console.log('=== Admin Auth Debug Info ===');
    console.log('admin_credentials_set:', localStorage.getItem('admin_credentials_set'));
    console.log('admin_credentials:', localStorage.getItem('admin_credentials'));
    console.log('admin_session:', localStorage.getItem('admin_session'));
    console.log('admin_logged_in:', localStorage.getItem('admin_logged_in'));
    console.log('============================');
};

// Инициализируем отладку по клавише F12
document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') {
        e.preventDefault();
        window.debugAdminAuth();
    }
});

// Проверяем localStorage при загрузке
console.log('Admin Auth: Checking localStorage on load...');
console.log('admin_credentials_set:', localStorage.getItem('admin_credentials_set'));
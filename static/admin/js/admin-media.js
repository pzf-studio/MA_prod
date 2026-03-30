// Админ-панель: управление медиа (главным фоном)
class AdminMediaManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.authToken = localStorage.getItem('admin_token');
        this.currentBackground = null;
        
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        await this.loadBackground();
        this.initEventListeners();
    }
    
    async checkAuth() {
        if (!this.authToken) {
            window.location.href = '/admin';
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/verify`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (!response.ok) {
                window.location.href = '/admin';
            }
        } catch (error) {
            window.location.href = '/admin';
        }
    }
    
    async loadBackground() {
        try {
            const response = await fetch(`${this.API_BASE}/api/media/background`);
            const data = await response.json();
            
            if (data.success) {
                this.currentBackground = data.background;
                this.renderBackgroundPreview();
                this.populateForm();
            } else if (data.error && data.error.includes('не найден')) {
                // Фон еще не создан
                this.currentBackground = null;
                this.renderBackgroundPreview();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки фона:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    async deleteBackground() {
        if (!this.currentBackground) return;
        if (!confirm('Удалить фоновое изображение?')) return;
        try {
            const res = await fetch(`${this.API_BASE}/api/admin/media/background/${this.currentBackground.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await res.json();
            if (data.success) {
                this.currentBackground = null;
                this.renderBackgroundPreview();
                this.populateForm();
                window.showNotification('Фон удалён');
            }
        } catch(e) { console.error(e); }
    }

    renderBackgroundPreview() {
        const previewContainer = document.getElementById('currentBackgroundPreview');
        const infoContainer = document.getElementById('backgroundInfo');
        const lastUpdated = document.getElementById('lastUpdated');
        
        if (!previewContainer || !infoContainer || !lastUpdated) return;
        
        if (this.currentBackground && this.currentBackground.image_url) {
            // Показываем текущий фон
            previewContainer.innerHTML = `
                <div class="current-background">
                    <img src="${this.currentBackground.image_url}" 
                         alt="${this.currentBackground.title || 'Фон'}"
                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYwLDEwMCkiPjxjaXJjbGUgcj0iMzAiIGZpbGw9IiNlOWVjZWYiLz48cGF0aCBkPSJNLTQwLDBhNDAsNDAgMCAxLDAgODAsMCA0MCw0MCAwIDEsMCAtODAsMFoiIGZpbGw9IiNlM2U1ZWEiLz48cGF0aCBkPSJNLTUwLDBhNTAsNTAgMCAxLDAgMTAwLDAgNTAsNTAgMCAxLDAtMTAwLDBaIiBmaWxsPSIjZGNlMGVlIi8+PC9nPjwvc3ZnPg=='">
                    <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">
                        <i class="fas fa-check-circle"></i> Активен
                    </div>
                </div>
            `;
            
            infoContainer.innerHTML = `
                <h4>${this.currentBackground.title || 'Без названия'}</h4>
                <p style="color: #6c757d; margin-bottom: 10px;">${this.currentBackground.description || 'Нет описания'}</p>
                <div class="status-badge ${this.currentBackground.active ? 'status-active' : 'status-inactive'}">
                    ${this.currentBackground.active ? 'Активный' : 'Неактивный'}
                </div>
                <p style="font-size: 0.85rem; color: #6c757d; margin-top: 10px;">
                    <i class="fas fa-calendar-alt"></i> 
                    Обновлен: ${this.formatDate(this.currentBackground.updated_at)}
                </p>
            `;
            
            if (this.currentBackground.updated_at) {
                lastUpdated.textContent = this.formatDate(this.currentBackground.updated_at);
            }
        } else {
            // Нет фона
            previewContainer.innerHTML = `
                <div class="no-background">
                    <div style="text-align: center;">
                        <i class="fas fa-image"></i>
                        <p>Фон не установлен</p>
                    </div>
                </div>
            `;
            
            infoContainer.innerHTML = `
                <p style="text-align: center; color: #6c757d;">
                    <i class="fas fa-info-circle"></i> Загрузите фоновое изображение для главной страницы
                </p>
            `;
            
            lastUpdated.textContent = '-';
        }
    }
    
    populateForm() {
        if (this.currentBackground) {
            document.getElementById('backgroundId').value = this.currentBackground.id || '';
            document.getElementById('backgroundTitle').value = this.currentBackground.title || '';
            document.getElementById('backgroundDescription').value = this.currentBackground.description || '';
            document.getElementById('backgroundStatus').value = this.currentBackground.active ? 'true' : 'false';
        } else {
            // Сброс формы
            document.getElementById('backgroundForm').reset();
            document.getElementById('backgroundId').value = '';
        }
        
        // Сбрасываем превью
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
        
        document.getElementById('selectedFileName').textContent = '';
    }
    
    initEventListeners() {
        // Загрузка изображения
        const imageUploadArea = document.getElementById('imageUploadArea');
        const backgroundImage = document.getElementById('backgroundImage');
        
        if (imageUploadArea && backgroundImage) {
            imageUploadArea.addEventListener('click', () => backgroundImage.click());
            backgroundImage.addEventListener('change', (e) => this.handleImageSelect(e));
            
            // Drag & Drop
            imageUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                imageUploadArea.style.borderColor = 'var(--secondary-color)';
                imageUploadArea.style.background = '#e9f7fe';
            });
            
            imageUploadArea.addEventListener('dragleave', () => {
                imageUploadArea.style.borderColor = 'var(--border-color)';
                imageUploadArea.style.background = '#f8f9fa';
            });
            
            imageUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                imageUploadArea.style.borderColor = 'var(--border-color)';
                imageUploadArea.style.background = '#f8f9fa';
                
                if (e.dataTransfer.files.length) {
                    backgroundImage.files = e.dataTransfer.files;
                    this.handleImageSelect({ target: backgroundImage });
                }
            });
        }
        
        // Форма
        const backgroundForm = document.getElementById('backgroundForm');
        if (backgroundForm) {
            backgroundForm.addEventListener('submit', (e) => this.handleBackgroundSubmit(e));
        }
        
        // Кнопка сброса
        const resetBtn = document.getElementById('resetForm');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.populateForm();
                this.showNotification('Форма сброшена', 'info');
            });
        }
        
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Модальное окно
        const modalClose = document.querySelector('#confirmModal .modal-close');
        const confirmCancel = document.getElementById('confirmCancel');
        if (modalClose) modalClose.addEventListener('click', () => this.closeConfirmModal());
        if (confirmCancel) confirmCancel.addEventListener('click', () => this.closeConfirmModal());
    }
    
    handleImageSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            this.showNotification('Пожалуйста, выберите изображение', 'error');
            return;
        }
        
        // Проверка размера
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('Файл слишком большой (максимум 10MB)', 'error');
            return;
        }
        
        // Показываем имя файла
        document.getElementById('selectedFileName').textContent = file.name;
        
        // Создаем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.style.display = 'block';
            preview.innerHTML = `
                <div style="text-align: center;">
                    <h4>Предпросмотр</h4>
                    <img src="${e.target.result}" 
                         alt="Превью" 
                         style="max-width: 100%; max-height: 200px; border-radius: 8px; margin: 10px 0;">
                    <p style="color: #6c757d; font-size: 0.9rem;">
                        Размер: ${this.formatFileSize(file.size)}
                    </p>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
    
    async handleBackgroundSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const backgroundData = {
            title: formData.get('title')?.trim() || 'Главный фон сайта',
            description: formData.get('description')?.trim() || '',
            active: formData.get('active') === 'true'
        };
        
        const backgroundId = formData.get('id');
        
        // Проверяем, есть ли новое изображение
        const imageInput = document.getElementById('backgroundImage');
        const imageFile = imageInput.files[0];
        
        try {
            let imageUrl = this.currentBackground?.image_url;
            
            // Если есть новое изображение, загружаем его
            if (imageFile) {
                const uploadResult = await this.uploadImage(imageFile);
                if (!uploadResult.success) {
                    throw new Error(uploadResult.error);
                }
                imageUrl = uploadResult.url;
            }
            
            // Добавляем URL изображения к данным
            if (imageUrl) {
                backgroundData.image_url = imageUrl;
            } else if (!backgroundId) {
                // Для нового фона изображение обязательно
                this.showNotification('Выберите изображение для фона', 'error');
                return;
            }
            
            // Отправляем данные на сервер
            const url = backgroundId ? 
                `${this.API_BASE}/api/admin/media/background/${backgroundId}` : 
                `${this.API_BASE}/api/admin/media/background`;
            
            const method = backgroundId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(backgroundData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                await this.loadBackground(); // Перезагружаем данные
                
                // Сбрасываем форму
                this.populateForm();
                imageInput.value = '';
                
                this.showNotification(
                    backgroundId ? 'Фон обновлен' : 'Фон сохранен', 
                    'success'
                );
                
                // Показываем предупреждение о кэше
                this.showNotification(
                    'Изменения могут отображаться не сразу из-за кэширования браузера. Для немедленного обновления очистите кэш браузера.',
                    'info',
                    5000
                );
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения фона:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Admin-Request': 'true',
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            return { success: false, error: error.message };
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.remove('active');
    }
    
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
            window.location.href = '/admin';
        }
    }
    
    showNotification(message, type = 'success', duration = 3000) {
        // Удаляем старые уведомления
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
                        type === 'error' ? '#e74c3c' : 
                        type === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 1000;
            max-width: 400px;
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
        }, duration);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.adminMedia = new AdminMediaManager();
});
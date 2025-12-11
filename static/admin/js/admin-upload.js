// Упрощенный загрузчик для админки
class AdminFileUploader {
    constructor() {
        this.API_BASE = window.location.origin;
    }
    
    async uploadFile(file) {
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'Только изображения' };
        }
        
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: 'Файл слишком большой (макс. 5MB)' };
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Admin-Request': 'true',
                    'Authorization': localStorage.getItem('admin_token')
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            return { success: false, error: 'Ошибка сети' };
        }
    }
    
    async uploadFiles(files) {
        const results = [];
        
        for (const file of files) {
            const result = await this.uploadFile(file);
            results.push(result);
            
            // Задержка между загрузками
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        return results;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Глобальный инстанс
window.fileUploader = new AdminFileUploader();
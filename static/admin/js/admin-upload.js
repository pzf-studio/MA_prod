// Функции для загрузки файлов на сервер
class FileUploader {
    constructor() {
        this.apiUrl = 'YOUR_SERVER_API_URL'; // Замените на URL вашего сервера
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    }
    
    // Загрузка файла на сервер
    async uploadFile(file, type = 'product') {
        try {
            // Проверка типа файла
            if (!this.allowedTypes.includes(file.type)) {
                throw new Error('Неподдерживаемый тип файла. Используйте JPG, PNG, WebP или GIF');
            }
            
            // Проверка размера файла
            if (file.size > this.maxFileSize) {
                throw new Error(`Файл слишком большой. Максимальный размер: ${this.maxFileSize / 1024 / 1024}MB`);
            }
            
            // Создаем FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            formData.append('timestamp', Date.now());
            
            // Отправляем на сервер
            const response = await fetch(`${this.apiUrl}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка загрузки файла');
            }
            
            const data = await response.json();
            return {
                success: true,
                url: data.url,
                filename: data.filename,
                size: file.size,
                type: file.type
            };
            
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Загрузка нескольких файлов
    async uploadFiles(files, type = 'product') {
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const result = await this.uploadFile(file, type);
            results.push(result);
            
            // Небольшая задержка между загрузками
            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        return results;
    }
    
    // Загрузка файла в localStorage (для демо-версии)
    uploadToLocalStorage(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Создаем уникальный ключ для файла
                    const fileKey = `uploaded_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    // Сохраняем в localStorage
                    localStorage.setItem(fileKey, e.target.result);
                    
                    resolve({
                        success: true,
                        url: e.target.result,
                        key: fileKey,
                        filename: file.name,
                        size: file.size,
                        type: file.type,
                        storage: 'local'
                    });
                };
                
                reader.onerror = function(error) {
                    reject(new Error('Ошибка чтения файла'));
                };
                
                reader.readAsDataURL(file);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Удаление файла из localStorage
    deleteFromLocalStorage(fileKey) {
        try {
            localStorage.removeItem(fileKey);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Получение всех загруженных файлов из localStorage
    getLocalFiles() {
        const files = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key.startsWith('uploaded_file_')) {
                const fileData = localStorage.getItem(key);
                
                // Пытаемся получить метаданные из ключа
                const parts = key.split('_');
                const timestamp = parseInt(parts[2]);
                const random = parts[3];
                
                files.push({
                    key: key,
                    url: fileData,
                    uploadedAt: new Date(timestamp),
                    storage: 'local'
                });
            }
        }
        
        // Сортируем по дате загрузки (новые сверху)
        return files.sort((a, b) => b.uploadedAt - a.uploadedAt);
    }
    
    // Очистка старых файлов из localStorage (старше 7 дней)
    cleanupOldFiles() {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const filesDeleted = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key.startsWith('uploaded_file_')) {
                const parts = key.split('_');
                const timestamp = parseInt(parts[2]);
                
                if (timestamp < weekAgo) {
                    localStorage.removeItem(key);
                    filesDeleted.push(key);
                }
            }
        }
        
        return filesDeleted;
    }
    
    // Загрузка на ImgBB (альтернативный сервис)
    async uploadToImgBB(file, apiKey = 'YOUR_IMGBB_API_KEY') {
        try {
            const formData = new FormData();
            formData.append('image', file.split(',')[1] || file);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                return {
                    success: true,
                    url: data.data.url,
                    display_url: data.data.display_url,
                    thumb_url: data.data.thumb.url,
                    delete_url: data.data.delete_url
                };
            } else {
                throw new Error(data.error?.message || 'Ошибка загрузки на ImgBB');
            }
        } catch (error) {
            console.error('Ошибка загрузки на ImgBB:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Создание миниатюры изображения
    createThumbnail(file, maxWidth = 200, maxHeight = 200) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                
                // Рассчитываем размеры для миниатюры
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(function(blob) {
                    const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    resolve(thumbnailFile);
                }, 'image/jpeg', 0.7);
            };
            
            img.onerror = reject;
            
            if (typeof file === 'string') {
                img.src = file;
            } else {
                const reader = new FileReader();
                reader.onload = function(e) {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Сжатие изображения
    async compressImage(file, quality = 0.8, maxWidth = 1200) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                
                // Масштабируем если изображение слишком большое
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(function(blob) {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    resolve({
                        file: compressedFile,
                        originalSize: file.size,
                        compressedSize: blob.size,
                        reduction: ((file.size - blob.size) / file.size * 100).toFixed(1)
                    });
                }, 'image/jpeg', quality);
            };
            
            img.onerror = reject;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Проверка наличия файла по URL
    async checkFileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    // Получение информации о файле
    getFileInfo(file) {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified),
            extension: file.name.split('.').pop().toLowerCase()
        };
    }
    
    // Форматирование размера файла
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Глобальный инстанс загрузчика
const fileUploader = new FileUploader();

// Инициализация загрузки файлов на странице
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация зон загрузки файлов
    initializeUploadZones();
    
    // Очистка старых файлов
    fileUploader.cleanupOldFiles();
});

// Инициализация зон загрузки файлов
function initializeUploadZones() {
    // Находим все зоны загрузки
    const uploadZones = document.querySelectorAll('.upload-zone, .image-upload-area');
    
    uploadZones.forEach(zone => {
        // Создаем скрытый input если его нет
        let fileInput = zone.querySelector('input[type="file"]');
        
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.multiple = true;
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            zone.appendChild(fileInput);
        }
        
        // Обработчик клика
        zone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Обработчик перетаскивания
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            handleFiles(files, zone);
        });
        
        // Обработчик выбора файлов через диалог
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            handleFiles(files, zone);
        });
    });
}

// Обработка загруженных файлов
async function handleFiles(files, zone) {
    const previewContainer = zone.nextElementSibling?.classList.contains('preview-container') 
        ? zone.nextElementSibling 
        : zone.parentElement.querySelector('.preview-container');
    
    // Показываем индикатор загрузки
    zone.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    
    try {
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Сжимаем изображение если оно слишком большое
            let fileToUpload = file;
            if (file.size > 2 * 1024 * 1024) { // Больше 2MB
                const compressed = await fileUploader.compressImage(file);
                fileToUpload = compressed.file;
                
                console.log(`Изображение сжато: ${compressed.reduction}% уменьшение`);
            }
            
            // Загружаем файл
            const result = await fileUploader.uploadToLocalStorage(fileToUpload);
            
            if (result.success) {
                results.push(result);
                
                // Добавляем превью
                if (previewContainer) {
                    addImagePreview(previewContainer, result);
                }
                
                // Показываем прогресс
                const progress = Math.round(((i + 1) / files.length) * 100);
                zone.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Загрузка... ${progress}%`;
            }
        }
        
        // Восстанавливаем исходный текст зоны загрузки
        zone.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Перетащите сюда изображения или кликните для выбора</p>
        `;
        
        // Показываем уведомление
        showUploadNotification(results.length);
        
        // Возвращаем результаты
        return results;
        
    } catch (error) {
        console.error('Ошибка обработки файлов:', error);
        
        // Восстанавливаем исходный текст
        zone.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Перетащите сюда изображения или кликните для выбора</p>
        `;
        
        // Показываем ошибку
        showNotification(`Ошибка загрузки файлов: ${error.message}`, 'error');
        
        return [];
    }
}

// Добавление превью изображения
function addImagePreview(container, fileInfo) {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.dataset.key = fileInfo.key;
    
    previewItem.innerHTML = `
        <img src="${fileInfo.url}" alt="${fileInfo.filename}">
        <div class="preview-overlay">
            <button class="preview-delete" onclick="deletePreview(this)">
                <i class="fas fa-times"></i>
            </button>
            <button class="preview-copy" onclick="copyImageUrl('${fileInfo.url}')">
                <i class="fas fa-copy"></i>
            </button>
        </div>
        <div class="preview-info">
            <span>${fileInfo.filename}</span>
            <small>${fileUploader.formatFileSize(fileInfo.size)}</small>
        </div>
    `;
    
    container.appendChild(previewItem);
}

// Удаление превью
function deletePreview(button) {
    const previewItem = button.closest('.preview-item');
    const fileKey = previewItem.dataset.key;
    
    if (fileKey) {
        fileUploader.deleteFromLocalStorage(fileKey);
    }
    
    previewItem.remove();
}

// Копирование URL изображения
function copyImageUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification('URL изображения скопирован в буфер обмена', 'success');
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        showNotification('Не удалось скопировать URL', 'error');
    });
}

// Показ уведомления о загрузке
function showUploadNotification(count) {
    if (count === 0) {
        showNotification('Не удалось загрузить файлы', 'error');
    } else if (count === 1) {
        showNotification('Файл успешно загружен', 'success');
    } else {
        showNotification(`${count} файлов успешно загружены`, 'success');
    }
}

// Показ уведомления
function showNotification(message, type = 'success') {
    // Реализация из предыдущих файлов
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// Экспорт функций
window.fileUploader = fileUploader;
window.handleFiles = handleFiles;
window.deletePreview = deletePreview;
window.copyImageUrl = copyImageUrl;
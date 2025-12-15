# app.py - ВЕРСИЯ С ФАЙЛОВЫМ ХРАНИЛИЩЕМ
import os
import json
import logging
import sys
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import hashlib
import uuid
from werkzeug.utils import secure_filename
from order_manager import order_manager
import os

# Добавить в переменные окружения
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
# ========== НАСТРОЙКА ПУТЕЙ ==========
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Отладочная информация
print("=" * 60)
print("MA FURNITURE - FILE-BASED STORAGE")
print("=" * 60)
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"BASE_DIR: {BASE_DIR}")

# Пути к данным (в корне проекта)
DATA_DIR = os.path.join(BASE_DIR, 'data')
PRODUCTS_DIR = os.path.join(DATA_DIR, 'products')
SECTIONS_FILE = os.path.join(DATA_DIR, 'sections.json')

# Статика
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOAD_FOLDER = os.path.join(STATIC_DIR, 'uploads/products')
TEMP_FOLDER = os.path.join(STATIC_DIR, 'uploads/temp')

print(f"\nDATA_DIR: {DATA_DIR}")
print(f"PRODUCTS_DIR: {PRODUCTS_DIR}")
print(f"SECTIONS_FILE: {SECTIONS_FILE}")
print(f"STATIC_DIR: {STATIC_DIR}")

# Создаем необходимые папки (только если их нет)
os.makedirs(PRODUCTS_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)

print(f"PRODUCTS_DIR exists: {os.path.exists(PRODUCTS_DIR)}")
print(f"Folders created/verified")
print("=" * 60)

# ========== ИНИЦИАЛИЗАЦИЯ APP ==========
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Разрешаем кросс-доменные запросы

# Настройки загрузки файлов
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TEMP_FOLDER'] = TEMP_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Настройка логирования
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = app.logger

# ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_filename(original_name):
    """Генерация уникального имени файла"""
    timestamp = int(datetime.now().timestamp())
    random_str = hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:8]
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    return f"{timestamp}_{random_str}.{ext}"

# ========== ФУНКЦИИ РАБОТЫ С ФАЙЛАМИ ==========
def get_all_products():
    """Получить все товары из файлов"""
    products = []
    
    if not os.path.exists(PRODUCTS_DIR):
        return products
    
    try:
        for filename in sorted(os.listdir(PRODUCTS_DIR)):
            if filename.endswith('.json'):
                try:
                    filepath = os.path.join(PRODUCTS_DIR, filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        product = json.load(f)
                        products.append(product)
                except Exception as e:
                    logger.error(f"Ошибка чтения файла {filename}: {e}")
        
        # Сортируем по дате создания (новые сначала)
        products.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    except Exception as e:
        logger.error(f"Ошибка получения товаров: {e}")
    
    return products

def get_product_by_id(product_id):
    """Получить товар по ID"""
    filepath = os.path.join(PRODUCTS_DIR, f"{product_id}.json")
    
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Ошибка чтения товара {product_id}: {e}")
    
    return None

def save_product(product_data):
    """Сохранить товар в файл"""
    try:
        # Определяем ID товара
        if 'id' in product_data and product_data['id']:
            product_id = product_data['id']
        else:
            # Находим максимальный ID
            max_id = 0
            if os.path.exists(PRODUCTS_DIR):
                for filename in os.listdir(PRODUCTS_DIR):
                    if filename.endswith('.json'):
                        try:
                            file_id = int(filename.split('.')[0])
                            max_id = max(max_id, file_id)
                        except:
                            continue
            product_id = max_id + 1
            product_data['id'] = product_id
        
        # Добавляем временные метки
        if 'created_at' not in product_data:
            product_data['created_at'] = datetime.now().isoformat()
        product_data['updated_at'] = datetime.now().isoformat()
        
        # Сохраняем в файл
        filepath = os.path.join(PRODUCTS_DIR, f"{product_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(product_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Товар сохранен: {product_id}.json")
        return product_id
        
    except Exception as e:
        logger.error(f"Ошибка сохранения товара: {e}")
        return None

def delete_product(product_id):
    """Удалить товар"""
    filepath = os.path.join(PRODUCTS_DIR, f"{product_id}.json")
    
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            logger.info(f"Товар удален: {product_id}.json")
            return True
        except Exception as e:
            logger.error(f"Ошибка удаления товара: {e}")
    
    return False

def load_sections():
    """Загрузить разделы из файла"""
    if os.path.exists(SECTIONS_FILE):
        try:
            with open(SECTIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    
    # Дефолтные разделы
    default_sections = [
        {"id": 1, "code": "pantographs", "name": "Пантографы", "active": True},
        {"id": 2, "code": "wardrobes", "name": "Гардеробные системы", "active": True},
        {"id": 3, "code": "shoeracks", "name": "Обувницы", "active": True}
    ]
    
    # Сохраняем дефолтные
    save_sections(default_sections)
    return default_sections

def save_sections(sections):
    """Сохранить разделы в файл"""
    try:
        with open(SECTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(sections, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Ошибка сохранения разделов: {e}")

# ========== МАРШРУТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ==========
@app.route('/')
def index():
    """Главная страница магазина"""
    try:
        index_path = os.path.join(STATIC_DIR, 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
        else:
            return '''
            <!DOCTYPE html>
            <html>
            <head><title>MA Furniture</title></head>
            <body>
                <h1>MA Furniture - Backend работает!</h1>
                <p>Файловое хранилище активировано.</p>
                <a href="/shop">Магазин</a> | 
                <a href="/admin">Админка</a> |
                <a href="/api/products">API товаров</a>
            </body>
            </html>
            '''
    except Exception as e:
        logger.error(f"Ошибка загрузки index.html: {e}")
        return f'Error: {str(e)}', 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Создание нового заказа"""
    try:
        # Проверка токена Telegram
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
            return jsonify({
                'success': False, 
                'error': 'Telegram бот не настроен. Обратитесь к администратору.'
            }), 500
        
        data = request.get_json()
        
        # Базовая валидация
        required_fields = ['customer_name', 'customer_phone', 'items']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Поле {field} обязательно'}), 400
        
        if not isinstance(data['items'], list) or len(data['items']) == 0:
            return jsonify({'success': False, 'error': 'Корзина пуста'}), 400
        
        # Обработка заказа
        result = order_manager.process_order(data)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Ошибка создания заказа: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/shop')
def shop():
    """Страница каталога"""
    try:
        shop_path = os.path.join(STATIC_DIR, 'shop.html')
        if os.path.exists(shop_path):
            return send_file(shop_path)
        return "Shop page not found", 404
    except Exception as e:
        logger.error(f"Ошибка загрузки shop.html: {e}")
        return str(e), 500

@app.route('/piece')
def piece():
    """Страница товара"""
    try:
        piece_path = os.path.join(STATIC_DIR, 'piece.html')
        if os.path.exists(piece_path):
            return send_file(piece_path)
        return "Product page not found", 404
    except Exception as e:
        logger.error(f"Ошибка загрузки piece.html: {e}")
        return str(e), 500

@app.route('/admin')
@app.route('/admin/')
def admin_root():
    """Главная страница админки"""
    try:
        login_path = os.path.join(STATIC_DIR, 'admin/admin-login.html')
        if os.path.exists(login_path):
            return send_file(login_path)
        return "Admin login not found", 404
    except Exception as e:
        logger.error(f"Admin root error: {e}")
        return str(e), 500

@app.route('/admin/dashboard')
@app.route('/admin/dashboard/')
def admin_dashboard():
    """Дашборд админки"""
    try:
        dashboard_path = os.path.join(STATIC_DIR, 'admin/admin-dashboard.html')
        if os.path.exists(dashboard_path):
            return send_file(dashboard_path)
        return "Dashboard not found", 404
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return str(e), 500

# ========== API ДЛЯ УПРАВЛЕНИЯ КАТЕГОРИЯМИ (РАЗДЕЛАМИ) ==========
@app.route('/api/admin/sections', methods=['GET'])
def admin_get_sections():
    """Получение всех разделов для админки"""
    try:
        sections = load_sections()
        return jsonify({'success': True, 'sections': sections})
        
    except Exception as e:
        logger.error(f"Ошибка получения разделов: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/sections', methods=['POST'])
def admin_create_section():
    """Создание нового раздела"""
    try:
        data = request.get_json()
        
        # Валидация обязательных полей
        required_fields = ['name', 'code']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({'success': False, 'error': f'Поле {field} обязательно'}), 400
        
        sections = load_sections()
        
        # Проверяем уникальность ID и кода
        new_id = max([s.get('id', 0) for s in sections], default=0) + 1
        if any(s.get('code') == data['code'] for s in sections):
            return jsonify({'success': False, 'error': 'Раздел с таким кодом уже существует'}), 400
        
        # Создаем новый раздел
        new_section = {
            'id': new_id,
            'name': data['name'].strip(),
            'code': data['code'].strip().lower(),
            'active': data.get('active', True),
            'display_order': data.get('display_order', len(sections) + 1)
        }
        
        sections.append(new_section)
        save_sections(sections)
        
        return jsonify({
            'success': True,
            'section': new_section,
            'message': 'Раздел успешно создан'
        })
        
    except Exception as e:
        logger.error(f"Ошибка создания раздела: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/sections/<int:section_id>', methods=['PUT'])
def admin_update_section(section_id):
    """Обновление раздела"""
    try:
        data = request.get_json()
        sections = load_sections()
        
        # Находим раздел
        section_index = None
        for i, section in enumerate(sections):
            if section.get('id') == section_id:
                section_index = i
                break
        
        if section_index is None:
            return jsonify({'success': False, 'error': 'Раздел не найден'}), 404
        
        # Обновляем поля
        if 'name' in data:
            sections[section_index]['name'] = data['name'].strip()
        
        if 'code' in data:
            new_code = data['code'].strip().lower()
            # Проверяем уникальность кода (кроме текущего раздела)
            if any(s.get('code') == new_code and s.get('id') != section_id for s in sections):
                return jsonify({'success': False, 'error': 'Раздел с таким кодом уже существует'}), 400
            sections[section_index]['code'] = new_code
        
        if 'active' in data:
            sections[section_index]['active'] = bool(data['active'])
        
        if 'display_order' in data:
            sections[section_index]['display_order'] = int(data['display_order'])
        
        save_sections(sections)
        
        return jsonify({
            'success': True,
            'section': sections[section_index],
            'message': 'Раздел успешно обновлен'
        })
        
    except Exception as e:
        logger.error(f"Ошибка обновления раздела: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/sections/<int:section_id>', methods=['DELETE'])
def admin_delete_section(section_id):
    """Удаление раздела"""
    try:
        sections = load_sections()
        
        # Находим раздел
        section_index = None
        section_to_delete = None
        for i, section in enumerate(sections):
            if section.get('id') == section_id:
                section_index = i
                section_to_delete = section
                break
        
        if section_index is None:
            return jsonify({'success': False, 'error': 'Раздел не найден'}), 404
        
        # Проверяем, используется ли раздел в товарах
        products = get_all_products()
        products_in_section = [p for p in products if p.get('section') == section_to_delete.get('code')]
        
        if products_in_section:
            return jsonify({
                'success': False, 
                'error': f'Нельзя удалить раздел, так как в нем есть товары ({len(products_in_section)} шт.)'
            }), 400
        
        # Удаляем раздел
        sections.pop(section_index)
        save_sections(sections)
        
        return jsonify({
            'success': True,
            'message': 'Раздел успешно удален'
        })
        
    except Exception as e:
        logger.error(f"Ошибка удаления раздела: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/sections/reorder', methods=['POST'])
def admin_reorder_sections():
    """Изменение порядка разделов"""
    try:
        data = request.get_json()
        new_order = data.get('order', [])
        
        if not new_order:
            return jsonify({'success': False, 'error': 'Не указан новый порядок'}), 400
        
        sections = load_sections()
        
        # Обновляем порядок
        for section in sections:
            if str(section.get('id')) in new_order:
                section['display_order'] = new_order.index(str(section.get('id'))) + 1
        
        save_sections(sections)
        
        return jsonify({
            'success': True,
            'message': 'Порядок разделов обновлен'
        })
        
    except Exception as e:
        logger.error(f"Ошибка изменения порядка разделов: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========== КОНСТАНТЫ ДЛЯ МЕДИА ==========
BACKGROUND_FILE = os.path.join(DATA_DIR, 'background.json')

# ========== ФУНКЦИИ РАБОТЫ С МЕДИА ==========
def load_background():
    """Загрузить данные о фоне"""
    if os.path.exists(BACKGROUND_FILE):
        try:
            with open(BACKGROUND_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return None

def save_background(background_data):
    """Сохранить данные о фоне"""
    try:
        # Добавляем временные метки
        if 'id' not in background_data:
            background_data['id'] = 1
        if 'created_at' not in background_data:
            background_data['created_at'] = datetime.now().isoformat()
        background_data['updated_at'] = datetime.now().isoformat()
        
        with open(BACKGROUND_FILE, 'w', encoding='utf-8') as f:
            json.dump(background_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Ошибка сохранения фона: {e}")
        return False

# ========== API ДЛЯ МЕДИА (ГЛАВНЫЙ ФОН) ==========
@app.route('/api/media/background', methods=['GET'])
def get_background():
    """Получение данных о главном фоне"""
    try:
        background = load_background()
        
        if not background:
            return jsonify({
                'success': False, 
                'error': 'Фон не найден',
                'background': None
            }), 404
        
        return jsonify({
            'success': True, 
            'background': background
        })
    except Exception as e:
        logger.error(f"Ошибка получения фона: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/media/background', methods=['GET'])
def admin_get_background():
    """Получение данных о фоне для админки"""
    try:
        background = load_background()
        return jsonify({'success': True, 'background': background})
    except Exception as e:
        logger.error(f"Ошибка получения фона: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/media/background', methods=['POST'])
def admin_create_background():
    """Создание нового фона"""
    try:
        data = request.get_json()
        
        # Валидация
        if not data.get('image_url'):
            return jsonify({'success': False, 'error': 'Изображение обязательно'}), 400
        
        # Сохраняем фон
        if save_background(data):
            background = load_background()
            return jsonify({
                'success': True,
                'background': background,
                'message': 'Фон успешно создан'
            })
        else:
            return jsonify({'success': False, 'error': 'Ошибка сохранения'}), 500
        
    except Exception as e:
        logger.error(f"Ошибка создания фона: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/media/background/<int:background_id>', methods=['PUT'])
def admin_update_background(background_id):
    """Обновление фона"""
    try:
        data = request.get_json()
        current_background = load_background()
        
        if not current_background or current_background.get('id') != background_id:
            return jsonify({'success': False, 'error': 'Фон не найден'}), 404
        
        # Обновляем данные
        for key, value in data.items():
            if key in ['title', 'description', 'image_url', 'active']:
                current_background[key] = value
        
        # Обновляем временную метку
        current_background['updated_at'] = datetime.now().isoformat()
        
        # Сохраняем
        if save_background(current_background):
            return jsonify({
                'success': True,
                'background': current_background,
                'message': 'Фон успешно обновлен'
            })
        else:
            return jsonify({'success': False, 'error': 'Ошибка сохранения'}), 500
        
    except Exception as e:
        logger.error(f"Ошибка обновления фона: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/media/background/<int:background_id>', methods=['DELETE'])
def admin_delete_background(background_id):
    """Удаление фона"""
    try:
        current_background = load_background()
        
        if not current_background or current_background.get('id') != background_id:
            return jsonify({'success': False, 'error': 'Фон не найден'}), 404
        
        # Удаляем файл
        if os.path.exists(BACKGROUND_FILE):
            os.remove(BACKGROUND_FILE)
            
            # Удаляем изображение если оно в uploads
            image_url = current_background.get('image_url', '')
            if image_url and '/uploads/' in image_url:
                try:
                    filename = image_url.split('/')[-1]
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)
                except:
                    pass
            
            return jsonify({
                'success': True,
                'message': 'Фон успешно удален'
            })
        else:
            return jsonify({'success': False, 'error': 'Файл фона не найден'}), 404
        
    except Exception as e:
        logger.error(f"Ошибка удаления фона: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========== ФУНКЦИИ ДЛЯ АКТИВНОСТИ ==========
def get_recent_activity():
    """Получить последнюю активность"""
    activity = []
    
    try:
        # Получаем последние товары
        products = get_all_products()
        recent_products = sorted(products, key=lambda x: x.get('created_at', ''), reverse=True)[:3]
        
        for product in recent_products:
            activity.append({
                'type': 'product',
                'title': 'Добавлен новый товар',
                'description': product.get('name', 'Товар'),
                'time': product.get('created_at', ''),
                'icon': 'fas fa-box'
            })
        
        # Получаем информацию о фоне
        background = load_background()
        if background and background.get('updated_at'):
            activity.append({
                'type': 'background',
                'title': 'Обновлен фон',
                'description': background.get('title', 'Главный фон'),
                'time': background.get('updated_at', ''),
                'icon': 'fas fa-image'
            })
        
        # Сортируем по времени (новые сначала)
        activity.sort(key=lambda x: x.get('time', ''), reverse=True)
        
    except Exception as e:
        logger.error(f"Ошибка получения активности: {e}")
    
    return activity

# ========== API ДЛЯ ДАШБОРДА ==========
@app.route('/api/admin/dashboard/stats', methods=['GET'])
def admin_dashboard_stats():
    """Получение статистики для дашборда"""
    try:
        # Количество товаров
        products = get_all_products()
        active_products = len([p for p in products if p.get('status') == 'active'])
        
        # Количество категорий
        sections = load_sections()
        active_sections = len([s for s in sections if s.get('active', True)])
        
        # Информация о фоне
        background = load_background()
        background_exists = bool(background and background.get('image_url'))
        
        return jsonify({
            'success': True,
            'stats': {
                'total_products': len(products),
                'active_products': active_products,
                'total_sections': len(sections),
                'active_sections': active_sections,
                'background_exists': background_exists
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики дашборда: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/dashboard/activity', methods=['GET'])
def admin_dashboard_activity():
    """Получение последней активности"""
    try:
        activity = get_recent_activity()
        return jsonify({
            'success': True,
            'activity': activity[:5]  # Ограничиваем 5 записями
        })
    except Exception as e:
        logger.error(f"Ошибка получения активности: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/dashboard/popular-products', methods=['GET'])
def admin_dashboard_popular_products():
    """Получение популярных товаров"""
    try:
        products = get_all_products()
        
        # Фильтруем популярные товары (с бейджами или рекомендуемые)
        popular_products = []
        for product in products:
            if product.get('status') == 'active':
                badge = product.get('badge', '')
                if badge in ['Хит продаж', 'Новинка', 'Акция'] or product.get('recommended'):
                    popular_products.append(product)
        
        # Берем максимум 3 товара
        popular_products = popular_products[:3]
        
        return jsonify({
            'success': True,
            'products': popular_products
        })
    except Exception as e:
        logger.error(f"Ошибка получения популярных товаров: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========== РОУТ ДЛЯ СТРАНИЦЫ УПРАВЛЕНИЯ МЕДИА ==========
@app.route('/admin/media')
@app.route('/admin/media/')
def admin_media():
    """Страница управления медиа"""
    try:
        media_path = os.path.join(STATIC_DIR, 'admin/media-management.html')
        if os.path.exists(media_path):
            return send_file(media_path)
        return "Media management page not found", 404
    except Exception as e:
        logger.error(f"Media page error: {e}")
        return str(e), 500

# ========== РОУТ ДЛЯ СТРАНИЦЫ УПРАВЛЕНИЯ КАТЕГОРИЯМИ ==========
@app.route('/admin/categories')
@app.route('/admin/categories/')
def admin_categories():
    """Страница управления категориями"""
    try:
        categories_path = os.path.join(STATIC_DIR, 'admin/categories-management.html')
        if os.path.exists(categories_path):
            return send_file(categories_path)
        return "Categories management page not found", 404
    except Exception as e:
        logger.error(f"Categories page error: {e}")
        return str(e), 500

# ========== API ДЛЯ МАГАЗИНА ==========
@app.route('/api/health')
def health_check():
    """Проверка здоровья API"""
    return jsonify({
        'status': 'ok',
        'service': 'MA Furniture API (File Storage)',
        'timestamp': datetime.now().isoformat(),
        'products_dir': PRODUCTS_DIR,
        'products_count': len(get_all_products()),
        'storage_type': 'file_based'
    })

@app.route('/debug/storage')
def debug_storage():
    """Отладка хранилища товаров"""
    try:
        products_count = len(get_all_products())
        sections = load_sections()
        
        return jsonify({
            'status': 'ok',
            'products_count': products_count,
            'sections_count': len(sections),
            'products_dir': PRODUCTS_DIR,
            'products_dir_exists': os.path.exists(PRODUCTS_DIR),
            'sample_products': get_all_products()[:3] if products_count > 0 else []
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['GET'])
def get_products():
    """Получение списка товаров с фильтрацией"""
    try:
        category = request.args.get('category', 'all')
        section = request.args.get('section', '')
        status = request.args.get('status', 'active')
        search = request.args.get('search', '')
        
        all_products = get_all_products()
        
        # Фильтрация
        filtered_products = []
        for product in all_products:
            # Фильтр по статусу
            if status and product.get('status') != status:
                continue
            
            # Фильтр по категории
            if category != 'all' and product.get('category') != category:
                continue
            
            # Фильтр по разделу
            if section and product.get('section') != section:
                continue
            
            # Поиск
            if search:
                search_lower = search.lower()
                name = product.get('name', '').lower()
                desc = product.get('description', '').lower()
                if search_lower not in name and search_lower not in desc:
                    continue
            
            filtered_products.append(product)
        
        return jsonify({
            'success': True,
            'products': filtered_products,
            'total': len(filtered_products)
        })
        
    except Exception as e:
        logger.error(f"Ошибка получения товаров: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Получение информации о конкретном товаре"""
    try:
        product = get_product_by_id(product_id)
        
        if not product:
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
        return jsonify({'success': True, 'product': product})
        
    except Exception as e:
        logger.error(f"Ошибка получения товара: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sections', methods=['GET'])
def get_sections():
    """Получение списка разделов"""
    try:
        sections = load_sections()
        return jsonify({'success': True, 'sections': sections})
        
    except Exception as e:
        logger.error(f"Ошибка получения разделов: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========== API ДЛЯ АДМИНКИ ==========
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Авторизация администратора"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Заполните все поля'}), 400
        
        # Простая проверка (для теста)
        if username == 'admin' and password == 'admin123':
            return jsonify({
                'success': True,
                'admin': {'username': 'admin', 'role': 'admin'},
                'session_token': str(uuid.uuid4()),
                'message': 'Авторизация успешна'
            })
        else:
            return jsonify({'success': False, 'error': 'Неверный логин или пароль'}), 401
        
    except Exception as e:
        logger.error(f"Ошибка авторизации: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/verify')
def verify_admin():
    """Проверка токена администратора"""
    token = request.headers.get('Authorization')
    if token:
        # Упрощенная проверка для теста
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Требуется авторизация'}), 401

@app.route('/api/admin/products', methods=['GET'])
def admin_get_products():
    """Получение всех товаров для админки"""
    try:
        products = get_all_products()
        return jsonify({'success': True, 'products': products})
        
    except Exception as e:
        logger.error(f"Ошибка получения товаров: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/products', methods=['POST'])
def admin_create_product():
    """Создание нового товара"""
    try:
        data = request.get_json()
        
        # Валидация обязательных полей
        required_fields = ['name', 'price', 'description']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({'success': False, 'error': f'Поле {field} обязательно'}), 400
        
        # Сохраняем товар
        product_id = save_product(data)
        
        if not product_id:
            return jsonify({'success': False, 'error': 'Ошибка сохранения'}), 500
        
        return jsonify({
            'success': True,
            'product_id': product_id,
            'message': 'Товар успешно создан'
        })
        
    except Exception as e:
        logger.error(f"Ошибка создания товара: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/products/<int:product_id>', methods=['PUT'])
def admin_update_product(product_id):
    """Обновление товара"""
    try:
        data = request.get_json()
        
        # Получаем существующий товар
        existing = get_product_by_id(product_id)
        if not existing:
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
        # Обновляем поля
        for key, value in data.items():
            existing[key] = value
        
        # Обновляем timestamp
        existing['updated_at'] = datetime.now().isoformat()
        
        # Сохраняем
        save_product(existing)
        
        return jsonify({
            'success': True,
            'message': 'Товар успешно обновлен'
        })
        
    except Exception as e:
        logger.error(f"Ошибка обновления товара: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/products/<int:product_id>', methods=['DELETE'])
def admin_delete_product(product_id):
    """Удаление товара"""
    try:
        if delete_product(product_id):
            return jsonify({
                'success': True,
                'message': 'Товар успешно удален'
            })
        else:
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
    except Exception as e:
        logger.error(f"Ошибка удаления товара: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    """Получение статистики"""
    try:
        products = get_all_products()
        active_count = len([p for p in products if p.get('status') == 'active'])
        
        return jsonify({
            'success': True,
            'products_count': len(products),
            'active_products': active_count
        })
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_product_color_variants(product_data):
    """Получить цветовые варианты из структуры товара"""
    if 'color_variants' in product_data and product_data['color_variants']:
        return product_data['color_variants']
    
    # Если товар в старом формате, создаем первый вариант
    return [{
        'variant_id': product_data.get('code', f"ID{product_data['id']}"),
        'color_name': product_data.get('color_name', 'Основной'),
        'color_hex': product_data.get('color_hex', '#2C2C2C'),
        'suffix': '',
        'price': product_data.get('price', 0),
        'old_price': product_data.get('old_price'),
        'stock': product_data.get('stock', 0),
        'images': product_data.get('images', []),
        'is_original': True,
        'order': 1
    }]

@app.route('/api/products/<int:product_id>/colors', methods=['GET'])
def get_product_colors(product_id):
    """Получение цветовых вариантов товара"""
    try:
        product = get_product_by_id(product_id)
        if not product:
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
        variants = get_product_color_variants(product)
        
        return jsonify({
            'success': True,
            'product_id': product_id,
            'variants': variants,
            'base_name': product.get('name', ''),
            'base_code': product.get('code', '')
        })
        
    except Exception as e:
        logger.error(f"Ошибка получения цветов: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/products/<int:product_id>/color-variant', methods=['POST'])
def add_color_variant(product_id):
    """Добавление нового цветового варианта к товару"""
    try:
        # Проверка авторизации (у вас уже есть)
        
        product = get_product_by_id(product_id)
        if not product:
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
        data = request.get_json()
        
        # Получаем текущие варианты
        if 'color_variants' not in product:
            product['color_variants'] = []
        
        # Максимум 5 вариантов (1 оригинал + 4 копии)
        if len(product['color_variants']) >= 5:
            return jsonify({'success': False, 'error': 'Максимум 5 цветовых вариантов'}), 400
        
        # Генерация variant_id
        base_code = product.get('code', f"ID{product_id}")
        new_index = len([v for v in product['color_variants'] if not v.get('is_original', False)]) + 1
        variant_id = f"{base_code}/{new_index}"
        
        # Новый вариант
        new_variant = {
            'variant_id': variant_id,
            'color_name': data['color_name'],
            'color_hex': data['color_hex'],
            'suffix': f" - {data['color_name']}",
            'price': data.get('price', product.get('price', 0)),
            'old_price': data.get('old_price'),
            'stock': data.get('stock', 0),
            'images': data.get('images', []),
            'is_original': False,
            'order': len(product['color_variants']) + 1
        }
        
        product['color_variants'].append(new_variant)
        product['updated_at'] = datetime.now().isoformat()
        
        # Сохраняем товар
        filepath = os.path.join(PRODUCTS_DIR, f"{product_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(product, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'variant': new_variant,
            'message': 'Цветовой вариант добавлен'
        })
        
    except Exception as e:
        logger.error(f"Ошибка добавления цвета: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========== ЗАГРУЗКА ФАЙЛОВ ==========
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Загрузка файла на сервер"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Файл не загружен'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Файл не выбран'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Недопустимый формат файла'}), 400
        
        # Генерируем уникальное имя файла
        original_name = secure_filename(file.filename)
        filename = generate_filename(original_name)
        
        # Сохраняем файл
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # URL для доступа к файлу
        file_url = f"/static/uploads/products/{filename}"
        
        logger.info(f"Файл загружен: {filename}")
        
        return jsonify({
            'success': True,
            'filename': filename,
            'original_name': original_name,
            'url': file_url,
            'size': os.path.getsize(file_path)
        })
        
    except Exception as e:
        logger.error(f"Ошибка загрузки файла: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/upload/delete', methods=['POST'])
def delete_file():
    """Удаление файла"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'success': False, 'error': 'Имя файла не указано'}), 400
        
        safe_filename = secure_filename(filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Файл не найден'}), 404
        
        os.remove(file_path)
        
        logger.info(f"Файл удален: {safe_filename}")
        
        return jsonify({'success': True, 'message': 'Файл удален'})
        
    except Exception as e:
        logger.error(f"Ошибка удаления файла: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========== СТАТИЧЕСКИЕ ФАЙЛЫ ==========
@app.route('/static/<path:filename>')
def serve_static(filename):
    """Отдача статических файлов"""
    try:
        return send_from_directory(STATIC_DIR, filename)
    except Exception as e:
        logger.error(f"Ошибка отдачи статического файла: {e}")
        return str(e), 404

@app.route('/uploads/products/<filename>')
def serve_uploaded_file(filename):
    """Отдача загруженных файлов"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ========== ОБРАБОТКА ОШИБОК ==========
@app.errorhandler(404)
def not_found_error(error):
    """Обработка 404 ошибок"""
    logger.warning(f"404 Not Found: {request.path}")
    
    if request.path == '/favicon.ico':
        return '', 204
    
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Ресурс не найден'}), 404
    
    try:
        index_path = os.path.join(STATIC_DIR, 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
        return jsonify({'success': False, 'error': 'Ресурс не найден'}), 404
    except Exception as e:
        logger.error(f"Ошибка в 404 handler: {e}")
        return jsonify({'success': False, 'error': 'Ресурс не найден'}), 404

# ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========
if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("Starting Flask development server...")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
else:
    print("\n" + "=" * 60)
    print("MA Furniture File Storage initialized")
    print("=" * 60)
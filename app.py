# app.py
import os
import json
import logging
import sqlite3
import sys
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file, make_response
from flask_cors import CORS
import hashlib
import uuid
from werkzeug.utils import secure_filename

# ========== НАСТРОЙКА ПУТЕЙ ==========
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Отладочная информация
print("=" * 60)
print("MA FURNITURE - DEBUG INFO")
print("=" * 60)
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"BASE_DIR: {BASE_DIR}")
print(f"\nFiles in BASE_DIR:")
for item in sorted(os.listdir(BASE_DIR)):
    print(f"  - {item}")

# Определяем правильные пути (исправлено!)
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOAD_FOLDER = os.path.join(STATIC_DIR, 'uploads/products')
TEMP_FOLDER = os.path.join(STATIC_DIR, 'uploads/temp')
DB_PATH = os.path.join(BASE_DIR, 'data/ma_furniture.db')

print(f"\nSTATIC_DIR: {STATIC_DIR}")
print(f"STATIC_DIR exists: {os.path.exists(STATIC_DIR)}")
if os.path.exists(STATIC_DIR):
    print(f"Files in STATIC_DIR:")
    for item in sorted(os.listdir(STATIC_DIR)):
        print(f"  - {item}")
else:
    print(f"WARNING: STATIC_DIR does not exist!")

print(f"\nUPLOAD_FOLDER: {UPLOAD_FOLDER}")
print(f"DB_PATH: {DB_PATH}")
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

# Создаем необходимые папки
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_filename(original_name):
    """Генерация уникального имени файла"""
    timestamp = int(datetime.now().timestamp())
    random_str = hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:8]
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    return f"{timestamp}_{random_str}.{ext}"

def get_db_connection():
    """Создание подключения к базе данных"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Инициализация базы данных"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Таблица товаров
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT,
            category TEXT,
            section TEXT,
            price INTEGER NOT NULL,
            old_price INTEGER,
            badge TEXT,
            recommended BOOLEAN DEFAULT 0,
            description TEXT,
            specifications TEXT,
            status TEXT DEFAULT 'active',
            stock INTEGER DEFAULT 0,
            images TEXT,  -- JSON массив путей к изображениям
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Таблица разделов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            active BOOLEAN DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Таблица заказов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            customer_address TEXT,
            customer_comment TEXT,
            items TEXT NOT NULL,  -- JSON массив товаров
            total_amount INTEGER NOT NULL,
            status TEXT DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Таблица администраторов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создаем дефолтного администратора если его нет
    cursor.execute("SELECT COUNT(*) as count FROM admins")
    if cursor.fetchone()['count'] == 0:
        default_password = hashlib.sha256('admin123'.encode()).hexdigest()
        cursor.execute(
            "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
            ('admin', default_password)
        )
    
    # Создаем дефолтные разделы если их нет
    cursor.execute("SELECT COUNT(*) as count FROM sections")
    if cursor.fetchone()['count'] == 0:
        default_sections = [
            ('pantographs', 'Пантографы', 'Электрические пантографы для гардеробных', 1, 1),
            ('wardrobes', 'Гардеробные системы', 'Полноценные гардеробные системы', 1, 2),
            ('shoeracks', 'Обувницы', 'Обувницы и системы хранения обуви', 1, 3)
        ]
        cursor.executemany(
            "INSERT INTO sections (code, name, description, active, display_order) VALUES (?, ?, ?, ?, ?)",
            default_sections
        )
    
    conn.commit()
    conn.close()
    logger.info("База данных инициализирована")

# Инициализируем базу данных при запуске
init_database()

# ========== FAVICON ==========
@app.route('/favicon.ico')
def favicon():
    """Отдача favicon.ico"""
    try:
        # Пробуем найти favicon.ico
        favicon_paths = [
            os.path.join(STATIC_DIR, 'favicon.ico'),
            os.path.join(STATIC_DIR, 'images/favicon.ico'),
            os.path.join(BASE_DIR, 'favicon.ico'),
        ]
        
        for path in favicon_paths:
            if os.path.exists(path):
                logger.info(f"Serving favicon from: {path}")
                return send_file(path, mimetype='image/x-icon')
        
        # Если favicon не найден, возвращаем пустой ответ
        return '', 204
        
    except Exception as e:
        logger.error(f"Ошибка загрузки favicon: {e}")
        return '', 204

# ========== МАРШРУТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ==========
@app.route('/')
def index():
    """Главная страница магазина"""
    logger.info(f"GET / - Serving index.html")
    try:
        index_path = os.path.join(STATIC_DIR, 'index.html')
        if os.path.exists(index_path):
            logger.info(f"Found index.html at: {index_path}")
            return send_file(index_path)
        else:
            logger.warning(f"index.html NOT FOUND at {index_path}")
            # Возвращаем простую страницу
            return '''
            <!DOCTYPE html>
            <html>
            <head>
                <title>MA Furniture - Мебельная фабрика</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    h1 { color: #333; }
                    .status { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 20px; }
                    .api-link { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                    .api-link:hover { background: #0056b3; }
                    .warning { color: #ff9800; background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px; }
                </style>
            </head>
            <body>
                <h1>MA Furniture</h1>
                <div class="status">✅ Backend успешно запущен!</div>
                <div class="warning">index.html не найден. Загрузите статические файлы.</div>
                <p>API endpoints:</p>
                <a class="api-link" href="/api/health">/api/health</a>
                <a class="api-link" href="/api/products">/api/products</a>
                <a class="api-link" href="/api/sections">/api/sections</a>
                <a class="api-link" href="/admin">Админка</a>
            </body>
            </html>
            '''
    except Exception as e:
        logger.error(f"Ошибка загрузки index.html: {e}")
        return f'Error loading index.html: {str(e)}', 500

@app.route('/shop')
def shop():
    """Страница каталога"""
    logger.info(f"GET /shop")
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
    logger.info(f"GET /piece")
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
    """Корень админки"""
    logger.info(f"GET /admin")
    try:
        admin_login_path = os.path.join(STATIC_DIR, 'admin/admin-login.html')
        if os.path.exists(admin_login_path):
            return send_file(admin_login_path)
        return "Admin panel not found", 404
    except Exception as e:
        logger.error(f"Ошибка загрузки админки: {e}")
        return str(e), 500

@app.route('/admin/<path:filename>')
def admin_static(filename):
    """Статические файлы админки"""
    try:
        admin_path = os.path.join(STATIC_DIR, 'admin')
        return send_from_directory(admin_path, filename)
    except Exception as e:
        logger.error(f"Ошибка отдачи статики админки: {e}")
        return str(e), 404

# ========== API ДЛЯ МАГАЗИНА ==========
@app.route('/api/health')
def health_check():
    """Проверка здоровья API"""
    return jsonify({
        'status': 'ok',
        'service': 'MA Furniture API',
        'timestamp': datetime.now().isoformat(),
        'static_dir': STATIC_DIR,
        'static_exists': os.path.exists(STATIC_DIR)
    })

@app.route('/api/products', methods=['GET'])
def get_products():
    """Получение списка товаров с фильтрацией"""
    try:
        category = request.args.get('category', 'all')
        section = request.args.get('section', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 15))
        search = request.args.get('search', '')
        status = request.args.get('status', 'active')
        
        offset = (page - 1) * per_page
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Базовый запрос
        query = "SELECT * FROM products WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if category != 'all':
            query += " AND category = ?"
            params.append(category)
        
        if section:
            query += " AND section = ?"
            params.append(section)
        
        if search:
            query += " AND (name LIKE ? OR description LIKE ? OR code LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
        
        # Получаем общее количество
        count_query = f"SELECT COUNT(*) as total FROM ({query})"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        # Получаем данные для страницы
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([per_page, offset])
        
        cursor.execute(query, params)
        products = [dict(row) for row in cursor.fetchall()]
        
        # Парсим JSON поля
        for product in products:
            if product.get('images'):
                try:
                    product['images'] = json.loads(product['images'])
                except:
                    product['images'] = []
            else:
                product['images'] = []
        
        conn.close()
        
        return jsonify({
            'success': True,
            'products': products,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        logger.error(f"Ошибка получения товаров: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Получение информации о конкретном товаре"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        product = cursor.fetchone()
        
        if not product:
            conn.close()
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
        product_dict = dict(product)
        
        # Парсим JSON поля
        if product_dict.get('images'):
            try:
                product_dict['images'] = json.loads(product_dict['images'])
            except:
                product_dict['images'] = []
        else:
            product_dict['images'] = []
        
        conn.close()
        
        return jsonify({'success': True, 'product': product_dict})
        
    except Exception as e:
        logger.error(f"Ошибка получения товара: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sections', methods=['GET'])
def get_sections():
    """Получение списка разделов"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM sections WHERE active = 1 ORDER BY display_order")
        sections = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({'success': True, 'sections': sections})
        
    except Exception as e:
        logger.error(f"Ошибка получения разделов: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Создание нового заказа"""
    try:
        data = request.get_json()
        
        # Валидация
        required_fields = ['customer_name', 'customer_phone', 'items']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Поле {field} обязательно'}), 400
        
        # Генерация номера заказа
        order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Подсчет общей суммы
        total_amount = 0
        for item in data['items']:
            total_amount += item.get('price', 0) * item.get('quantity', 1)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO orders (
                order_number, customer_name, customer_phone, customer_email,
                customer_address, customer_comment, items, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            order_number,
            data['customer_name'],
            data['customer_phone'],
            data.get('customer_email', ''),
            data.get('customer_address', ''),
            data.get('customer_comment', ''),
            json.dumps(data['items'], ensure_ascii=False),
            total_amount
        ))
        
        order_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        logger.info(f"Создан заказ #{order_number}")
        
        return jsonify({
            'success': True,
            'order_id': order_id,
            'order_number': order_number,
            'message': 'Заказ успешно создан'
        })
        
    except Exception as e:
        logger.error(f"Ошибка создания заказа: {e}")
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
        
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM admins WHERE username = ? AND password_hash = ?",
            (username, password_hash)
        )
        admin = cursor.fetchone()
        
        if not admin:
            conn.close()
            return jsonify({'success': False, 'error': 'Неверный логин или пароль'}), 401
        
        # Обновляем время последнего входа
        cursor.execute(
            "UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
            (admin['id'],)
        )
        conn.commit()
        
        admin_data = dict(admin)
        admin_data.pop('password_hash', None)  # Не отправляем хэш пароля
        
        # Создаем сессию
        session_token = str(uuid.uuid4())
        
        conn.close()
        
        logger.info(f"Admin logged in: {username}")
        
        return jsonify({
            'success': True,
            'admin': admin_data,
            'session_token': session_token,
            'message': 'Авторизация успешна'
        })
        
    except Exception as e:
        logger.error(f"Ошибка авторизации: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/verify')
def verify_admin():
    """Проверка токена администратора"""
    token = request.headers.get('Authorization')
    if token and token.startswith('Bearer '):
        # Здесь должна быть логика проверки токена
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Требуется авторизация'}), 401

@app.route('/api/admin/products', methods=['GET'])
def admin_get_products():
    """Получение всех товаров для админки"""
    try:
        # Проверка авторизации
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': 'Требуется авторизация'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM products ORDER BY id DESC")
        products = [dict(row) for row in cursor.fetchall()]
        
        # Парсим JSON поля
        for product in products:
            if product.get('images'):
                try:
                    product['images'] = json.loads(product['images'])
                except:
                    product['images'] = []
            else:
                product['images'] = []
        
        conn.close()
        
        return jsonify({'success': True, 'products': products})
        
    except Exception as e:
        logger.error(f"Ошибка получения товаров: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/products', methods=['POST'])
def admin_create_product():
    """Создание нового товара"""
    try:
        # Проверка авторизации
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': 'Требуется авторизация'}), 401
        
        data = request.get_json()
        
        # Валидация обязательных полей
        required_fields = ['name', 'price', 'description']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({'success': False, 'error': f'Поле {field} обязательно'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Преобразуем изображения в JSON
        images_json = json.dumps(data.get('images', []), ensure_ascii=False)
        
        cursor.execute('''
            INSERT INTO products (
                name, code, category, section, price, old_price,
                badge, recommended, description, specifications,
                status, stock, images
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('code', ''),
            data.get('category', ''),
            data.get('section', ''),
            int(data['price']),
            data.get('old_price'),
            data.get('badge'),
            bool(data.get('recommended', False)),
            data['description'],
            data.get('specifications', ''),
            data.get('status', 'active'),
            int(data.get('stock', 0)),
            images_json
        ))
        
        product_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        logger.info(f"Создан товар #{product_id}: {data['name']}")
        
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
        # Проверка авторизации
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': 'Требуется авторизация'}), 401
        
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем существование товара
        cursor.execute("SELECT id FROM products WHERE id = ?", (product_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
        # Преобразуем изображения в JSON
        images_json = json.dumps(data.get('images', []), ensure_ascii=False)
        
        cursor.execute('''
            UPDATE products SET
                name = ?, code = ?, category = ?, section = ?,
                price = ?, old_price = ?, badge = ?, recommended = ?,
                description = ?, specifications = ?, status = ?,
                stock = ?, images = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('name', ''),
            data.get('code', ''),
            data.get('category', ''),
            data.get('section', ''),
            int(data.get('price', 0)),
            data.get('old_price'),
            data.get('badge'),
            bool(data.get('recommended', False)),
            data.get('description', ''),
            data.get('specifications', ''),
            data.get('status', 'active'),
            int(data.get('stock', 0)),
            images_json,
            product_id
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Обновлен товар #{product_id}")
        
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
        # Проверка авторизации
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': 'Требуется авторизация'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'error': 'Товар не найден'}), 404
        
        conn.commit()
        conn.close()
        
        logger.info(f"Удален товар #{product_id}")
        
        return jsonify({
            'success': True,
            'message': 'Товар успешно удален'
        })
        
    except Exception as e:
        logger.error(f"Ошибка удаления товара: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    """Получение статистики"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as count FROM products WHERE status = 'active'")
        products_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM orders")
        orders_count = cursor.fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'products_count': products_count,
            'orders_count': orders_count
        })
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========== ЗАГРУЗКА ФАЙЛОВ ==========
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Загрузка файла на сервер"""
    try:
        # Проверка авторизации для админки
        if request.headers.get('X-Admin-Request'):
            token = request.headers.get('Authorization')
            if not token:
                return jsonify({'success': False, 'error': 'Требуется авторизация'}), 401
        
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
        
        # Проверяем, что файл находится в папке uploads
        safe_filename = secure_filename(filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Файл не найден'}), 404
        
        # Удаляем файл
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
    
    # Для favicon возвращаем 204
    if request.path == '/favicon.ico':
        return '', 204
    
    # Для API запросов возвращаем JSON
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Ресурс не найден'}), 404
    
    # Пробуем отдать index.html для SPA роутинга
    try:
        index_path = os.path.join(STATIC_DIR, 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
        return f"Page not found and index.html not found at {index_path}", 404
    except Exception as e:
        logger.error(f"Ошибка в 404 handler: {e}")
        return jsonify({'success': False, 'error': 'Ресурс не найден'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Обработка 500 ошибок"""
    logger.error(f"500 Internal Server Error: {error}")
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Внутренняя ошибка сервера'}), 500
    return "Internal server error", 500

# ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========
if __name__ == '__main__':
    # Для разработки
    print("\n" + "=" * 60)
    print("Starting Flask development server...")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
else:
    # Для production (WSGI)
    print("\n" + "=" * 60)
    print("MA Furniture WSGI application initialized")
    print("=" * 60)
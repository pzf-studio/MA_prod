# app.py - Упрощенная версия без фабрики приложений
from flask import Flask, jsonify, send_from_directory, send_file, request, redirect, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import base64
import time
import json
import logging
from werkzeug.utils import secure_filename
from datetime import datetime
import shutil

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'ma-furniture-admin-secret-key-2024'
    
    # Определяем корневую директорию для данных
    if os.path.exists('/data'):
        DATA_ROOT = '/data'
    else:
        DATA_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    
    # SQLite в правильной папке
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATA_ROOT}/ma_furniture.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Папки для загрузок
    UPLOAD_FOLDER = os.path.join(DATA_ROOT, 'uploads')
    BACKUP_FOLDER = os.path.join(DATA_ROOT, 'backups')
    STATIC_UPLOAD_FOLDER = os.path.join(DATA_ROOT, 'static_uploads')
    
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    STATIC_FOLDER = 'static'
    
    # Админские учетные данные
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME') or 'admin'
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'admin123'
    
    # Telegram бот
    TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')

# Создаем приложение
app = Flask(__name__, static_folder='static', static_url_path='')
app.config.from_object(Config)

# Инициализация расширений
db = SQLAlchemy(app)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

# Модели
class Section(db.Model):
    __tablename__ = 'sections'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), 
                          onupdate=db.func.current_timestamp())
    
    products = db.relationship('Product', backref='section_ref', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'active': self.active,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'product_count': self.products.count()
        }

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Integer, nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'))
    images = db.Column(db.Text)
    badge = db.Column(db.String(50))
    active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), 
                          onupdate=db.func.current_timestamp())
    
    def to_dict(self):
        images = []
        if self.images:
            try:
                images = json.loads(self.images)
            except:
                images = [self.images]
        
        section_name = None
        section_code = None
        if self.section_ref:
            section_name = self.section_ref.name
            section_code = self.section_ref.code
        
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'section': section_code,
            'section_name': section_name,
            'section_id': self.section_id,
            'images': images,
            'badge': self.badge,
            'active': self.active,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(200), nullable=False)
    customer_phone = db.Column(db.String(50), nullable=False)
    customer_email = db.Column(db.String(100))
    customer_address = db.Column(db.Text)
    customer_comment = db.Column(db.Text)
    items = db.Column(db.Text, nullable=False)
    total = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending')
    telegram_sent = db.Column(db.Boolean, default=False)
    fallback_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), 
                          onupdate=db.func.current_timestamp())
    
    def to_dict(self):
        items = []
        if self.items:
            try:
                items = json.loads(self.items)
            except:
                items = []
        
        return {
            'id': self.id,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'customer_email': self.customer_email,
            'customer_address': self.customer_address,
            'customer_comment': self.customer_comment,
            'items': items,
            'items_count': len(items) if isinstance(items, list) else 0,
            'total': self.total,
            'status': self.status,
            'telegram_sent': self.telegram_sent,
            'fallback_used': self.fallback_used,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# Создаем необходимые директории
def init_directories():
    directories = [
        app.config['DATA_ROOT'],
        app.config['UPLOAD_FOLDER'],
        app.config['BACKUP_FOLDER'],
        app.config['STATIC_UPLOAD_FOLDER']
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            logger.info(f"✅ Создана директория {directory}")
    
    # Создаем симлинк из static/uploads
    static_uploads_symlink = os.path.join(app.static_folder, 'uploads')
    static_uploads_target = app.config['STATIC_UPLOAD_FOLDER']
    
    if not os.path.exists(static_uploads_symlink):
        try:
            os.symlink(static_uploads_target, static_uploads_symlink)
            logger.info(f"✅ Создан симлинк {static_uploads_symlink} -> {static_uploads_target}")
        except Exception as e:
            logger.warning(f"⚠️ Не удалось создать симлинк: {e}")
            if not os.path.exists(static_uploads_symlink):
                os.makedirs(static_uploads_symlink, exist_ok=True)

# Инициализируем директории
init_directories()

# Middleware для проверки авторизации админки
def check_admin_auth():
    # Разрешаем доступ к публичным API
    if request.path in ['/api/health', '/api/', '/api/auth/login', '/api/auth/verify', 
                       '/api/db/check', '/api/db/init']:
        return True
    
    # Разрешаем публичный доступ к товарам и разделам
    if request.path in ['/api/products', '/api/sections', '/api/products/active', 
                       '/api/sections/active'] and request.method == 'GET':
        return True
    
    # Разрешаем публичный доступ к конкретному товару
    if request.path.startswith('/api/products/') and request.method == 'GET':
        try:
            parts = request.path.split('/')
            if len(parts) >= 4 and parts[1] == 'api' and parts[2] == 'products':
                product_id = parts[3]
                if product_id.isdigit():
                    return True
        except:
            pass
    
    # Разрешаем публичный доступ к созданию заказов
    if request.path == '/api/orders' and request.method == 'POST':
        return True
    
    # Разрешаем доступ к статическим файлам
    if request.path.startswith('/static/') or request.path.startswith('/css/') or \
       request.path.startswith('/js/') or request.path.startswith('/images/'):
        return True
    
    # Разрешаем доступ к HTML страницам
    if request.path.endswith('.html'):
        if request.path.startswith('/admin/'):
            if request.path == '/admin/login.html':
                return True
        else:
            return True
    
    # Для всех остальных админских маршрутов проверяем авторизацию
    if (request.path.startswith('/admin') or 
        request.path.startswith('/api/upload') or
        request.path.startswith('/api/storage') or
        request.path.startswith('/api/settings') or
        request.path.startswith('/api/system') or
        request.path.startswith('/api/db/backup') or
        (request.path.startswith('/api/orders') and request.method != 'POST') or
        (request.path.startswith('/api/products') and request.method in ['POST', 'PUT', 'DELETE']) or
        (request.path.startswith('/api/sections') and request.method in ['POST', 'PUT', 'DELETE'])):
        
        # Проверяем куки
        admin_token = request.cookies.get('admin_token')
        if admin_token:
            try:
                decoded = base64.b64decode(admin_token).decode()
                username, timestamp = decoded.split(':')
                if float(timestamp) > time.time() - 86400:
                    return True
            except:
                pass
        
        # Проверяем заголовок Authorization
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                decoded = base64.b64decode(token).decode()
                username, timestamp = decoded.split(':')
                if float(timestamp) > time.time() - 86400:
                    return True
            except:
                pass
        
        return False
    
    return True

@app.before_request
def before_request():
    if not check_admin_auth():
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Unauthorized', 'redirect': '/admin/login.html'}), 401
        return redirect('/admin/login.html')

# API для авторизации
@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "*")
        return response
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Необходимо указать логин и пароль'}), 400
        
        if username == app.config['ADMIN_USERNAME'] and password == app.config['ADMIN_PASSWORD']:
            token_data = f"{username}:{time.time()}"
            token = base64.b64encode(token_data.encode()).decode()
            
            response = jsonify({
                'success': True,
                'token': token,
                'user': {'username': username},
                'message': 'Вход выполнен успешно'
            })
            
            response.set_cookie(
                'admin_token', 
                token, 
                max_age=86400, 
                httponly=True, 
                samesite='Lax',
                secure=False
            )
            
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
            
            return response
        
        return jsonify({'success': False, 'error': 'Неверный логин или пароль'}), 401
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    response = jsonify({'success': True, 'message': 'Logged out'})
    response.delete_cookie('admin_token')
    return response

@app.route('/api/auth/verify', methods=['GET', 'OPTIONS'])
def verify_token():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "*")
        return response
    
    admin_token = request.cookies.get('admin_token')
    if admin_token:
        try:
            decoded = base64.b64decode(admin_token).decode()
            username, timestamp = decoded.split(':')
            if float(timestamp) > time.time() - 86400:
                return jsonify({'valid': True, 'user': {'username': username}})
        except:
            pass
    
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            decoded = base64.b64decode(token).decode()
            username, timestamp = decoded.split(':')
            if float(timestamp) > time.time() - 86400:
                return jsonify({'valid': True, 'user': {'username': username}})
        except:
            pass
    
    return jsonify({'valid': False}), 401

# API для товаров
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        active_only = request.args.get('active', '').lower() == 'true'
        limit = request.args.get('limit', type=int)
        
        query = Product.query
        
        if active_only:
            query = query.filter_by(active=True)
        
        query = query.order_by(Product.display_order.asc(), Product.created_at.desc())
        
        if limit:
            products = query.limit(limit).all()
        else:
            products = query.all()
        
        return jsonify([p.to_dict() for p in products])
    except Exception as e:
        logger.error(f"Get products error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/active', methods=['GET'])
def get_active_products():
    try:
        products = Product.query.filter_by(active=True)\
                      .order_by(Product.display_order.asc(), Product.created_at.desc())\
                      .all()
        return jsonify([p.to_dict() for p in products])
    except Exception as e:
        logger.error(f"Get active products error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        return jsonify(product.to_dict())
    except Exception as e:
        logger.error(f"Get product error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['name', 'price', 'section_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        product = Product(
            name=data['name'],
            price=data['price'],
            section_id=data['section_id'],
            description=data.get('description'),
            images=json.dumps(data.get('images', [])),
            badge=data.get('badge'),
            active=data.get('active', True),
            display_order=data.get('display_order', 0)
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'product': product.to_dict(),
            'message': 'Товар создан успешно'
        })
    except Exception as e:
        logger.error(f"Create product error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        if 'name' in data:
            product.name = data['name']
        if 'price' in data:
            product.price = data['price']
        if 'section_id' in data:
            product.section_id = data['section_id']
        if 'description' in data:
            product.description = data['description']
        if 'images' in data:
            product.images = json.dumps(data['images'])
        if 'badge' in data:
            product.badge = data['badge']
        if 'active' in data:
            product.active = data['active']
        if 'display_order' in data:
            product.display_order = data['display_order']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'product': product.to_dict(),
            'message': 'Товар обновлен успешно'
        })
    except Exception as e:
        logger.error(f"Update product error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Товар удален успешно'
        })
    except Exception as e:
        logger.error(f"Delete product error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>/active', methods=['PUT'])
def toggle_product_active(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        if 'active' in data:
            product.active = data['active']
            db.session.commit()
            
            return jsonify({
                'success': True,
                'active': product.active,
                'message': 'Статус товара обновлен'
            })
        else:
            return jsonify({'error': 'Missing active field'}), 400
    except Exception as e:
        logger.error(f"Toggle product active error: {e}")
        return jsonify({'error': str(e)}), 500

# API для разделов
@app.route('/api/sections', methods=['GET'])
def get_sections():
    try:
        active_only = request.args.get('active', '').lower() == 'true'
        
        query = Section.query
        
        if active_only:
            query = query.filter_by(active=True)
        
        query = query.order_by(Section.display_order.asc(), Section.created_at.asc())
        
        sections = query.all()
        return jsonify([s.to_dict() for s in sections])
    except Exception as e:
        logger.error(f"Get sections error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sections/active', methods=['GET'])
def get_active_sections():
    try:
        sections = Section.query.filter_by(active=True)\
                      .order_by(Section.display_order.asc(), Section.created_at.asc())\
                      .all()
        return jsonify([s.to_dict() for s in sections])
    except Exception as e:
        logger.error(f"Get active sections error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sections/<int:section_id>', methods=['GET'])
def get_section(section_id):
    try:
        section = Section.query.get_or_404(section_id)
        return jsonify(section.to_dict())
    except Exception as e:
        logger.error(f"Get section error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sections', methods=['POST'])
def create_section():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['name', 'code']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        existing = Section.query.filter_by(code=data['code']).first()
        if existing:
            return jsonify({'error': 'Раздел с таким кодом уже существует'}), 400
        
        section = Section(
            name=data['name'],
            code=data['code'],
            active=data.get('active', True),
            display_order=data.get('display_order', 0)
        )
        
        db.session.add(section)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'section': section.to_dict(),
            'message': 'Раздел создан успешно'
        })
    except Exception as e:
        logger.error(f"Create section error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sections/<int:section_id>', methods=['PUT'])
def update_section(section_id):
    try:
        section = Section.query.get_or_404(section_id)
        data = request.get_json()
        
        if 'code' in data and data['code'] != section.code:
            existing = Section.query.filter_by(code=data['code']).first()
            if existing:
                return jsonify({'error': 'Раздел с таким кодом уже существует'}), 400
        
        if 'name' in data:
            section.name = data['name']
        if 'code' in data:
            section.code = data['code']
        if 'active' in data:
            section.active = data['active']
        if 'display_order' in data:
            section.display_order = data['display_order']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'section': section.to_dict(),
            'message': 'Раздел обновлен успешно'
        })
    except Exception as e:
        logger.error(f"Update section error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sections/<int:section_id>', methods=['DELETE'])
def delete_section(section_id):
    try:
        section = Section.query.get_or_404(section_id)
        
        Product.query.filter_by(section_id=section_id).update({'section_id': None})
        
        db.session.delete(section)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Раздел удален успешно'
        })
    except Exception as e:
        logger.error(f"Delete section error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sections/<int:section_id>/active', methods=['PUT'])
def toggle_section_active(section_id):
    try:
        section = Section.query.get_or_404(section_id)
        data = request.get_json()
        
        if 'active' in data:
            section.active = data['active']
            db.session.commit()
            
            return jsonify({
                'success': True,
                'active': section.active,
                'message': 'Статус раздела обновлен'
            })
        else:
            return jsonify({'error': 'Missing active field'}), 400
    except Exception as e:
        logger.error(f"Toggle section active error: {e}")
        return jsonify({'error': str(e)}), 500

# API для заказов
@app.route('/api/orders', methods=['GET'])
def get_orders():
    try:
        limit = request.args.get('limit', type=int)
        query = Order.query.order_by(Order.created_at.desc())
        
        if limit:
            orders = query.limit(limit).all()
        else:
            orders = query.all()
        
        return jsonify([order.to_dict() for order in orders])
    except Exception as e:
        logger.error(f"Get orders error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    try:
        order = Order.query.get_or_404(order_id)
        return jsonify(order.to_dict())
    except Exception as e:
        logger.error(f"Get order error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['customer_name', 'customer_phone', 'items', 'total']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        order = Order(
            customer_name=data['customer_name'],
            customer_phone=data['customer_phone'],
            customer_email=data.get('customer_email'),
            customer_address=data.get('customer_address'),
            customer_comment=data.get('customer_comment'),
            items=json.dumps(data['items']),
            total=data['total'],
            status='pending'
        )
        
        db.session.add(order)
        db.session.commit()
        
        # Telegram отправка (упрощенно)
        telegram_sent = False
        fallback_used = False
        
        response = {
            'success': True,
            'order_id': order.id,
            'telegram_sent': telegram_sent,
            'fallback_used': fallback_used,
            'message': 'Заказ создан успешно'
        }
        
        if fallback_used:
            response['message'] = 'Заказ создан, но не удалось отправить в Telegram'
            response['fallback_available'] = True
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Create order error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>/complete', methods=['PUT'])
def complete_order(order_id):
    try:
        order = Order.query.get_or_404(order_id)
        order.status = 'completed'
        db.session.commit()
        return jsonify({'success': True, 'message': 'Order marked as completed'})
    except Exception as e:
        logger.error(f"Complete order error: {e}")
        return jsonify({'error': str(e)}), 500

# API для загрузки изображений
@app.route('/api/upload/images', methods=['POST'])
def upload_images():
    try:
        if 'images' not in request.files:
            return jsonify({'error': 'No images provided'}), 400
        
        files = request.files.getlist('images')
        uploaded_images = []
        
        for file in files:
            if file.filename == '':
                continue
                
            if file and file.filename:
                timestamp = int(time.time())
                original_name = secure_filename(file.filename)
                filename = f"{timestamp}_{original_name}"
                
                upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(upload_path)
                
                static_upload_path = os.path.join(app.config['STATIC_UPLOAD_FOLDER'], filename)
                shutil.copy2(upload_path, static_upload_path)
                
                file_url = f"/static/uploads/{filename}"
                uploaded_images.append({
                    'filename': filename,
                    'url': file_url,
                    'path': upload_path,
                    'size': os.path.getsize(upload_path)
                })
        
        return jsonify({
            'success': True,
            'images': uploaded_images,
            'count': len(uploaded_images),
            'upload_folder': app.config['UPLOAD_FOLDER']
        })
    except Exception as e:
        logger.error(f"Upload images error: {e}")
        return jsonify({'error': str(e)}), 500

# API для настроек
@app.route('/api/settings', methods=['GET'])
def get_settings():
    try:
        return jsonify({
            'admin_username': app.config['ADMIN_USERNAME'],
            'telegram_bot_token': '***' if app.config['TELEGRAM_BOT_TOKEN'] else '',
            'telegram_chat_id': '***' if app.config['TELEGRAM_CHAT_ID'] else '',
            'site_title': 'MA Furniture',
            'upload_folder': app.config['UPLOAD_FOLDER'],
            'database_path': f"{app.config['DATA_ROOT']}/ma_furniture.db",
            'backup_folder': app.config['BACKUP_FOLDER']
        })
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    try:
        data = request.get_json()
        
        return jsonify({
            'success': True, 
            'message': 'Настройки обновлены',
            'settings': data
        })
    except Exception as e:
        logger.error(f"Update settings error: {e}")
        return jsonify({'error': str(e)}), 500

# API для информации о хранилище
@app.route('/api/storage', methods=['GET'])
def get_storage_info():
    try:
        uploads_dir = app.config['UPLOAD_FOLDER']
        db_path = f"{app.config['DATA_ROOT']}/ma_furniture.db"
        backup_dir = app.config['BACKUP_FOLDER']
        
        uploads_size = 0
        uploads_count = 0
        if os.path.exists(uploads_dir):
            for root, dirs, files in os.walk(uploads_dir):
                for file in files:
                    filepath = os.path.join(root, file)
                    uploads_size += os.path.getsize(filepath)
                    uploads_count += 1
        
        backups_size = 0
        backups_count = 0
        if os.path.exists(backup_dir):
            for root, dirs, files in os.walk(backup_dir):
                for file in files:
                    filepath = os.path.join(root, file)
                    backups_size += os.path.getsize(filepath)
                    backups_count += 1
        
        db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
        
        total_size = uploads_size + backups_size + db_size
        
        def format_bytes(bytes_num):
            if bytes_num == 0:
                return '0 Bytes'
            k = 1024
            sizes = ['Bytes', 'KB', 'MB', 'GB']
            i = int((len(str(bytes_num)) - 1) / 3)
            if i >= len(sizes):
                i = len(sizes) - 1
            return f"{bytes_num / (k ** i):.2f} {sizes[i]}"
        
        return jsonify({
            'used_space': total_size,
            'formatted_used_space': format_bytes(total_size),
            'uploads_size': uploads_size,
            'formatted_uploads_size': format_bytes(uploads_size),
            'uploads_count': uploads_count,
            'backups_size': backups_size,
            'formatted_backups_size': format_bytes(backups_size),
            'backups_count': backups_count,
            'database_size': db_size,
            'formatted_database_size': format_bytes(db_size),
            'total_space': 1024 * 1024 * 1024,
            'formatted_total_space': '1.00 GB',
            'file_count': uploads_count + backups_count,
            'paths': {
                'uploads': uploads_dir,
                'database': db_path,
                'backups': backup_dir,
                'static_uploads': app.config['STATIC_UPLOAD_FOLDER']
            }
        })
    except Exception as e:
        logger.error(f"Get storage info error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/cleanup', methods=['POST'])
def cleanup_storage():
    try:
        uploads_dir = app.config['UPLOAD_FOLDER']
        backup_dir = app.config['BACKUP_FOLDER']
        deleted_count = 0
        freed_space = 0
        
        if os.path.exists(uploads_dir):
            cutoff_time = time.time() - (30 * 24 * 3600)
            
            for filename in os.listdir(uploads_dir):
                filepath = os.path.join(uploads_dir, filename)
                if os.path.isfile(filepath):
                    file_time = os.path.getmtime(filepath)
                    if file_time < cutoff_time:
                        file_size = os.path.getsize(filepath)
                        os.remove(filepath)
                        
                        static_path = os.path.join(app.config['STATIC_UPLOAD_FOLDER'], filename)
                        if os.path.exists(static_path):
                            os.remove(static_path)
                        
                        deleted_count += 1
                        freed_space += file_size
        
        if os.path.exists(backup_dir):
            backup_files = []
            for filename in os.listdir(backup_dir):
                filepath = os.path.join(backup_dir, filename)
                if os.path.isfile(filepath) and filename.endswith('.db'):
                    backup_files.append((filepath, os.path.getmtime(filepath)))
            
            backup_files.sort(key=lambda x: x[1], reverse=True)
            
            for filepath, _ in backup_files[5:]:
                file_size = os.path.getsize(filepath)
                os.remove(filepath)
                deleted_count += 1
                freed_space += file_size
        
        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'freed_space': freed_space,
            'message': f'Удалено {deleted_count} файлов, освобождено {freed_space} байт'
        })
    except Exception as e:
        logger.error(f"Cleanup storage error: {e}")
        return jsonify({'error': str(e)}), 500

# API для системной информации
@app.route('/api/system/info', methods=['GET'])
def system_info():
    try:
        import sys
        import platform
        
        return jsonify({
            'api_version': '2.0.0',
            'database': 'SQLite',
            'db_path': f"{app.config['DATA_ROOT']}/ma_furniture.db",
            'server': 'Flask',
            'flask_version': '2.3.2',
            'paths': {
                'uploads': app.config['UPLOAD_FOLDER'],
                'backups': app.config['BACKUP_FOLDER'],
                'static_uploads': app.config['STATIC_UPLOAD_FOLDER'],
                'database': f"{app.config['DATA_ROOT']}/ma_furniture.db"
            },
            'python_version': sys.version,
            'platform': platform.platform(),
            'server_time
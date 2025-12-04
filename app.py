# app.py - ИСПРАВЛЕННАЯ ВЕРСИЯ С РАБОЧЕЙ АВТОРИЗАЦИЕЙ
from flask import Flask, jsonify, send_from_directory, send_file, request, redirect, make_response
from flask_cors import CORS
import os
import base64
import time
import json
from config import Config
from database.db import db
from routes.products import products_bp
from routes.sections import sections_bp
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)
    
    # Инициализация расширений
    db.init_app(app)
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
    
    # Простые учетные данные для админки
    ADMIN_CREDENTIALS = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    # Middleware для проверки авторизации админки
    def check_admin_auth():
        # Разрешаем доступ к публичным API
        public_paths = [
            '/api/health',
            '/api/',
            '/api/auth/login',
            '/api/auth/verify',
            '/api/db/check',
            '/api/db/init'
        ]
        
        # Проверяем публичные пути
        if request.path in public_paths:
            return True
        
        # Разрешаем доступ к товарам и разделам (публичные GET запросы)
        if request.path in ['/api/products', '/api/sections', '/api/products/active', '/api/sections/active']:
            return True
        
        # Проверяем GET запрос к конкретному товару
        if request.path.startswith('/api/products/') and request.method == 'GET':
            try:
                parts = request.path.split('/')
                if len(parts) == 4 and parts[1] == 'api' and parts[2] == 'products':
                    int(parts[3])  # Проверяем, что это число
                    return True
            except (ValueError, IndexError):
                pass
        
        # Разрешаем доступ к статическим файлам
        if request.path.startswith('/static/') or request.path.startswith('/css/') or \
           request.path.startswith('/js/') or request.path.startswith('/images/'):
            return True
        
        # Разрешаем доступ к HTML страницам
        if request.path.endswith('.html') and not request.path.startswith('/admin/'):
            return True
        
        # Для всех админских маршрутов проверяем авторизацию
        if request.path.startswith('/admin') or request.path.startswith('/api/admin'):
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
            # Для AJAX запросов возвращаем JSON ошибку
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized', 'redirect': '/admin/login.html'}), 401
            # Для обычных запросов редиректим на страницу входа
            return redirect('/admin/login.html')
    
    # API для авторизации
    @app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
    def login():
        if request.method == 'OPTIONS':
            # Обработка preflight запросов CORS
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
            
            if username == ADMIN_CREDENTIALS['username'] and password == ADMIN_CREDENTIALS['password']:
                # Создаем простой токен
                token_data = f"{username}:{time.time()}"
                token = base64.b64encode(token_data.encode()).decode()
                
                response = jsonify({
                    'success': True,
                    'token': token,
                    'user': {'username': username},
                    'message': 'Вход выполнен успешно'
                })
                
                # Устанавливаем куки
                response.set_cookie(
                    'admin_token', 
                    token, 
                    max_age=86400, 
                    httponly=True, 
                    samesite='Lax',
                    secure=False  # Для разработки
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
        
        # Проверяем куки
        admin_token = request.cookies.get('admin_token')
        if admin_token:
            try:
                decoded = base64.b64decode(admin_token).decode()
                username, timestamp = decoded.split(':')
                if float(timestamp) > time.time() - 86400:
                    return jsonify({'valid': True, 'user': {'username': username}})
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
                    return jsonify({'valid': True, 'user': {'username': username}})
            except:
                pass
        
        return jsonify({'valid': False}), 401
    
    # Регистрация blueprint'ов
    app.register_blueprint(products_bp, url_prefix='/api')
    app.register_blueprint(sections_bp, url_prefix='/api')
    
    # Создание папки для загрузок
    os.makedirs('static/uploads', exist_ok=True)
    
    # Проверка подключения к базе данных
    @app.route('/api/db/check', methods=['GET'])
    def check_db():
        try:
            db.session.execute('SELECT 1')
            return jsonify({
                'status': 'ok', 
                'message': 'Database connection successful',
                'database': 'PostgreSQL',
                'connected': True
            })
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            return jsonify({
                'status': 'error', 
                'message': str(e),
                'database': 'PostgreSQL',
                'connected': False
            }), 500
    
    # Инициализация базы данных
    @app.route('/api/db/init', methods=['GET'])
    def init_database():
        try:
            from models.section import Section
            from models.product import Product
            
            db.create_all()
            
            sections_count = Section.query.count()
            if sections_count == 0:
                basic_sections = [
                    {'name': 'Кровати', 'code': 'beds', 'active': True},
                    {'name': 'Диваны', 'code': 'sofas', 'active': True},
                    {'name': 'Столы', 'code': 'tables', 'active': True}
                ]
                
                for section_data in basic_sections:
                    section = Section(**section_data)
                    db.session.add(section)
                
                db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Database initialized',
                'sections': Section.query.count(),
                'products': Product.query.count()
            })
            
        except Exception as e:
            logger.error(f"DB init error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # Основные HTML страницы
    @app.route('/')
    def serve_index():
        return send_file('static/index.html')
    
    @app.route('/shop.html')
    def serve_shop():
        return send_file('static/shop.html')
    
    @app.route('/piece.html')
    def serve_piece():
        return send_file('static/piece.html')
    
    # Админка
    @app.route('/admin/')
    def serve_admin_root():
        return send_from_directory('static/admin', 'admin.html')
    
    @app.route('/admin/login.html')
    def serve_admin_login():
        return send_from_directory('static/admin', 'login.html')
    
    @app.route('/admin/<path:filename>')
    def serve_admin_files(filename):
        return send_from_directory('static/admin', filename)
    
    # Статические файлы
    @app.route('/css/<path:filename>')
    def serve_css_files(filename):
        return send_from_directory('static/css', filename)
    
    @app.route('/js/<path:filename>')
    def serve_js_files(filename):
        return send_from_directory('static/js', filename)
    
    @app.route('/images/<path:filename>')
    def serve_image_files(filename):
        return send_from_directory('static/images', filename)
    
    @app.route('/static/uploads/<path:filename>')
    def serve_upload_files(filename):
        return send_from_directory('static/uploads', filename)
    
    # API маршруты
    @app.route('/api/health', methods=['GET'])
    def health():
        try:
            db.session.execute('SELECT 1')
            db_status = 'connected'
        except:
            db_status = 'disconnected'
        
        return jsonify({
            "status": "healthy", 
            "message": "MA Furniture API работает",
            "server": "Flask",
            "database": db_status,
            "timestamp": time.time()
        })
    
    @app.route('/api/', methods=['GET'])
    def api_info():
        return jsonify({
            "message": "MA Furniture API", 
            "version": "2.0.0",
            "environment": "production"
        })
    
    # Обработка ошибок
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({'error': 'Method not allowed'}), 405
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"500 error: {error}")
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    with app.app_context():
        try:
            db.create_all()
            print("✅ База данных инициализирована")
        except Exception as e:
            print(f"⚠️ Ошибка БД: {e}")
    
    print("🔐 Админка: admin / admin123")
    print("🏥 Health check: /api/health")
    print("🚀 Запуск Flask...")
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
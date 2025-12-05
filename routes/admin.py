# routes/admin.py
from flask import Blueprint, request, jsonify, current_app
from database.db import db
from models.product import Product
from models.section import Section
from models.order import Order
import os
import shutil
import time
from werkzeug.utils import secure_filename
import json
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

# Настройки
@admin_bp.route('/settings', methods=['GET'])
def get_settings():
    return jsonify({
        'admin_username': current_app.config.get('ADMIN_USERNAME', 'admin'),
        'telegram_bot_token': current_app.config.get('TELEGRAM_BOT_TOKEN', ''),
        'telegram_chat_id': current_app.config.get('TELEGRAM_CHAT_ID', ''),
        'site_title': 'MA Furniture'
    })

@admin_bp.route('/settings', methods=['PUT'])
def update_settings():
    data = request.get_json()
    
    # Здесь можно сохранить настройки в БД или файл конфигурации
    # Пока просто возвращаем успех
    
    return jsonify({'success': True, 'message': 'Settings updated'})

# Заказы
@admin_bp.route('/orders', methods=['GET'])
def get_orders():
    limit = request.args.get('limit', type=int)
    query = Order.query.order_by(Order.created_at.desc())
    
    if limit:
        orders = query.limit(limit).all()
    else:
        orders = query.all()
    
    return jsonify([order.to_dict() for order in orders])

@admin_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify(order.to_dict())

@admin_bp.route('/orders/<int:order_id>/complete', methods=['PUT'])
def complete_order(order_id):
    order = Order.query.get_or_404(order_id)
    order.status = 'completed'
    db.session.commit()
    return jsonify({'success': True, 'message': 'Order marked as completed'})

# Загрузка изображений
@admin_bp.route('/upload/images', methods=['POST'])
def upload_images():
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    uploaded_images = []
    
    for file in files:
        if file.filename == '':
            continue
            
        if file:
            filename = secure_filename(f"{int(time.time())}_{file.filename}")
            upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            
            file.save(upload_path)
            
            # Создаем URL для файла
            file_url = f"/static/uploads/{filename}"
            uploaded_images.append({
                'filename': filename,
                'url': file_url
            })
    
    return jsonify({
        'success': True,
        'images': uploaded_images,
        'count': len(uploaded_images)
    })

# Хранилище
@admin_bp.route('/storage', methods=['GET'])
def get_storage_info():
    uploads_dir = current_app.config['UPLOAD_FOLDER']
    db_path = '/data/ma_furniture.db'
    
    # Размер папки uploads
    uploads_size = 0
    if os.path.exists(uploads_dir):
        for root, dirs, files in os.walk(uploads_dir):
            for file in files:
                filepath = os.path.join(root, file)
                uploads_size += os.path.getsize(filepath)
    
    # Размер БД
    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    
    total_size = uploads_size + db_size
    
    return jsonify({
        'used_space': total_size,
        'uploads_size': uploads_size,
        'database_size': db_size,
        'total_space': 1024 * 1024 * 1024,  # 1GB
        'file_count': len(os.listdir(uploads_dir)) if os.path.exists(uploads_dir) else 0
    })

@admin_bp.route('/storage/cleanup', methods=['POST'])
def cleanup_storage():
    uploads_dir = current_app.config['UPLOAD_FOLDER']
    deleted_count = 0
    freed_space = 0
    
    if os.path.exists(uploads_dir):
        # Удаляем файлы старше 30 дней
        cutoff_time = time.time() - (30 * 24 * 3600)
        
        for filename in os.listdir(uploads_dir):
            filepath = os.path.join(uploads_dir, filename)
            if os.path.isfile(filepath):
                file_time = os.path.getmtime(filepath)
                if file_time < cutoff_time:
                    file_size = os.path.getsize(filepath)
                    os.remove(filepath)
                    deleted_count += 1
                    freed_space += file_size
    
    return jsonify({
        'success': True,
        'deleted_count': deleted_count,
        'freed_space': freed_space
    })

# Системная информация
@admin_bp.route('/system/info', methods=['GET'])
def system_info():
    from flask import current_app
    
    return jsonify({
        'api_version': '2.0.0',
        'database': 'SQLite',
        'db_path': '/data/ma_furniture.db',
        'server': 'Flask',
        'uploads_path': current_app.config['UPLOAD_FOLDER'],
        'python_version': os.sys.version,
        'flask_version': '2.3.2'
    })

# Резервное копирование БД
@admin_bp.route('/db/backup', methods=['POST'])
def backup_database():
    import sqlite3
    import shutil
    from datetime import datetime
    
    db_path = '/data/ma_furniture.db'
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f'/data/backup_ma_furniture_{timestamp}.db'
    
    # Копируем файл БД
    shutil.copy2(db_path, backup_path)
    
    return jsonify({
        'success': True,
        'filename': os.path.basename(backup_path),
        'size': os.path.getsize(backup_path),
        'timestamp': timestamp
    })
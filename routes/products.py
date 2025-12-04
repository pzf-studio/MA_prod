from flask import Blueprint, request, jsonify, current_app
import os
import json
from werkzeug.utils import secure_filename
from database.db import db
from models.product import Product

products_bp = Blueprint('products', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def save_images(files):
    saved_paths = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Добавляем timestamp для уникальности
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{int(db.func.current_timestamp())}{ext}"
            
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            saved_paths.append(f"/static/uploads/{filename}")
    
    return saved_paths

@products_bp.route('/products', methods=['GET'])
def get_products():
    try:
        products = Product.query.all()
        return jsonify([product.to_dict() for product in products])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        return jsonify(product.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products/active', methods=['GET'])
def get_active_products():
    try:
        products = Product.get_active_products()
        return jsonify([product.to_dict() for product in products])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/admin/products', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        
        # Валидация обязательных полей
        required_fields = ['name', 'price', 'section']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Поле {field} обязательно'}), 400
        
        # Создание продукта
        product = Product(
            name=data['name'],
            price=data['price'],
            section=data['section'],
            sku=data.get('sku'),
            stock=data.get('stock', 0),
            description=data.get('description'),
            features=json.dumps(data.get('features', [])),
            specifications=json.dumps(data.get('specifications', {})),
            images=json.dumps(data.get('images', [])),
            badge=data.get('badge'),
            active=data.get('active', True),
            featured=data.get('featured', False),
            multiple_colors=data.get('multiple_colors', False),
            color_variants=json.dumps(data.get('color_variants', []))
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify(product.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/admin/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        # Обновление полей
        update_fields = [
            'name', 'price', 'section', 'sku', 'stock', 'description',
            'badge', 'active', 'featured', 'multiple_colors'
        ]
        
        for field in update_fields:
            if field in data:
                setattr(product, field, data[field])
        
        # Обновление JSON полей
        if 'features' in data:
            product.features = json.dumps(data['features'])
        if 'specifications' in data:
            product.specifications = json.dumps(data['specifications'])
        if 'images' in data:
            product.images = json.dumps(data['images'])
        if 'color_variants' in data:
            product.color_variants = json.dumps(data['color_variants'])
        
        db.session.commit()
        
        return jsonify(product.to_dict())
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/admin/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({'message': 'Товар удален'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/admin/products/upload', methods=['POST'])
def upload_images():
    try:
        if 'images' not in request.files:
            return jsonify({'error': 'No images provided'}), 400
        
        files = request.files.getlist('images')
        saved_paths = save_images(files)
        
        return jsonify({'images': saved_paths})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
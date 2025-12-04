# models/product.py
from database.db import db
from datetime import datetime
import json

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    section = db.Column(db.String(50), nullable=False)
    sku = db.Column(db.String(100), unique=True)
    stock = db.Column(db.Integer, default=0, nullable=False)
    description = db.Column(db.Text)
    
    # JSON поля для гибкости
    features = db.Column(db.Text, default='[]')  # JSON массив особенностей
    specifications = db.Column(db.Text, default='{}')  # JSON объект характеристик
    images = db.Column(db.Text, default='[]')  # JSON массив путей к изображениям
    
    badge = db.Column(db.String(50))
    active = db.Column(db.Boolean, default=True, nullable=False)
    featured = db.Column(db.Boolean, default=False, nullable=False)
    
    # Система нескольких цветов
    multiple_colors = db.Column(db.Boolean, default=False, nullable=False)
    color_variants = db.Column(db.Text, default='[]')  # JSON массив вариантов цветов
    
    # Метаданные
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        try:
            features_data = json.loads(self.features) if self.features else []
        except:
            features_data = []
            
        try:
            specifications_data = json.loads(self.specifications) if self.specifications else {}
        except:
            specifications_data = {}
            
        try:
            images_data = json.loads(self.images) if self.images else []
        except:
            images_data = []
            
        try:
            color_variants_data = json.loads(self.color_variants) if self.color_variants else []
        except:
            color_variants_data = []
        
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'section': self.section,
            'sku': self.sku,
            'stock': self.stock,
            'description': self.description,
            'features': features_data,
            'specifications': specifications_data,
            'images': images_data,
            'badge': self.badge,
            'active': self.active,
            'featured': self.featured,
            'multiple_colors': self.multiple_colors,
            'color_variants': color_variants_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_active_products(cls):
        try:
            return cls.query.filter_by(active=True).all()
        except:
            return []
    
    @classmethod
    def get_by_section(cls, section_code):
        try:
            return cls.query.filter_by(section=section_code, active=True).all()
        except:
            return []
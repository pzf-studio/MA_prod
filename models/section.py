# models/section.py
from database.db import db
from sqlalchemy.orm import relationship

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
    
    products = relationship('Product', back_populates='section_rel', lazy='dynamic')
    
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

# models/product.py
from database.db import db
import json

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Integer, nullable=False)  # В копейках для точности
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'))
    images = db.Column(db.Text)  # JSON список изображений
    badge = db.Column(db.String(50))
    active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), 
                          onupdate=db.func.current_timestamp())
    
    section_rel = db.relationship('Section', back_populates='products')
    
    def to_dict(self):
        images = []
        if self.images:
            try:
                images = json.loads(self.images)
            except:
                images = [self.images]
        
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'section': self.section_rel.code if self.section_rel else None,
            'section_name': self.section_rel.name if self.section_rel else None,
            'section_id': self.section_id,
            'images': images,
            'badge': self.badge,
            'active': self.active,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
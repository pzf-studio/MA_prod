# models/section.py
from database.db import db
from datetime import datetime
import json

class Section(db.Model):
    __tablename__ = 'sections'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        from models.product import Product
        try:
            product_count = Product.query.filter_by(section=self.code, active=True).count()
        except:
            product_count = 0
        
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'active': self.active,
            'product_count': product_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_active_sections(cls):
        try:
            return cls.query.filter_by(active=True).all()
        except:
            return []
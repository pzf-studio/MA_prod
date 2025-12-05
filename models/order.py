# models/order.py
from database.db import db
import json

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(200), nullable=False)
    customer_phone = db.Column(db.String(50), nullable=False)
    customer_email = db.Column(db.String(100))
    customer_address = db.Column(db.Text)
    customer_comment = db.Column(db.Text)
    items = db.Column(db.Text, nullable=False)  # JSON список товаров
    total = db.Column(db.Integer, nullable=False)  # В копейках
    status = db.Column(db.String(50), default='pending')  # pending, completed, cancelled
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
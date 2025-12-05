# config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'ma-furniture-admin-secret-key-2024'
    SQLALCHEMY_DATABASE_URI = 'sqlite:////data/ma_furniture.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = '/data/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    STATIC_FOLDER = 'static'
    
    # Админские учетные данные
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME') or 'admin'
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'admin123'
    
    # Telegram бот (опционально)
    TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')
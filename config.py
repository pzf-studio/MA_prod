# config.py
import os

class Config:
    # Настройки базы данных PostgreSQL Amvera
    DB_USER = os.environ.get('DB_USER', 'mikhail')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'svGrts412')
    DB_HOST = os.environ.get('DB_HOST', 'amvera-mikhailast-cnpg-flask-rw')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_NAME = os.environ.get('DB_NAME', 'flaskDB')
    
    # Формируем строку подключения
    SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Папка для загрузок
    UPLOAD_FOLDER = 'static/uploads'
    
    # Секретный ключ
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
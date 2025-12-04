from flask import Blueprint, request, jsonify
import json
from database.db import db
from models.section import Section

sections_bp = Blueprint('sections', __name__)

@sections_bp.route('/sections', methods=['GET'])
def get_sections():
    try:
        sections = Section.query.all()
        return jsonify([section.to_dict() for section in sections])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sections_bp.route('/sections/active', methods=['GET'])
def get_active_sections():
    try:
        sections = Section.get_active_sections()
        return jsonify([section.to_dict() for section in sections])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sections_bp.route('/admin/sections', methods=['POST'])
def create_section():
    try:
        data = request.get_json()
        
        # Валидация
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Поля name и code обязательны'}), 400
        
        # Проверка уникальности кода
        if Section.query.filter_by(code=data['code']).first():
            return jsonify({'error': 'Раздел с таким кодом уже существует'}), 400
        
        section = Section(
            name=data['name'],
            code=data['code'],
            active=data.get('active', True)
        )
        
        db.session.add(section)
        db.session.commit()
        
        return jsonify(section.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sections_bp.route('/admin/sections/<int:section_id>', methods=['PUT'])
def update_section(section_id):
    try:
        section = Section.query.get_or_404(section_id)
        data = request.get_json()
        
        if 'name' in data:
            section.name = data['name']
        if 'code' in data:
            # Проверка уникальности кода (исключая текущий раздел)
            existing = Section.query.filter(
                Section.code == data['code'],
                Section.id != section_id
            ).first()
            if existing:
                return jsonify({'error': 'Раздел с таким кодом уже существует'}), 400
            section.code = data['code']
        if 'active' in data:
            section.active = data['active']
        
        db.session.commit()
        
        return jsonify(section.to_dict())
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sections_bp.route('/admin/sections/<int:section_id>', methods=['DELETE'])
def delete_section(section_id):
    try:
        section = Section.query.get_or_404(section_id)
        db.session.delete(section)
        db.session.commit()
        
        return jsonify({'message': 'Раздел удален'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
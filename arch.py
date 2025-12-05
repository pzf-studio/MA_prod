# arch.py - Архитектура проекта
import os
import json
from datetime import datetime
from pathlib import Path

class ProjectArchitecture:
    def __init__(self, root_path):
        self.root_path = Path(root_path)
        self.arch_data = {
            'generated': datetime.now().isoformat(),
            'root': str(self.root_path),
            'statistics': {
                'folders': 0,
                'files': 0,
                'total': 0
            },
            'structure': []
        }
    
    def scan(self):
        """Сканирует структуру проекта"""
        print(f"📁 Сканирование: {self.root_path}")
        
        for root, dirs, files in os.walk(self.root_path):
            # Пропускаем некоторые системные папки
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['__pycache__', 'venv', 'env']]
            
            rel_path = Path(root).relative_to(self.root_path)
            if rel_path == Path('.'):
                continue
            
            # Добавляем папку
            folder_entry = {
                'type': 'folder',
                'name': str(rel_path),
                'path': str(rel_path),
                'size': self._get_folder_size(root),
                'items': []
            }
            
            # Добавляем файлы в папку
            for file in files:
                if file.startswith('.'):
                    continue
                    
                file_path = Path(root) / file
                file_size = file_path.stat().st_size
                
                file_entry = {
                    'type': 'file',
                    'name': file,
                    'path': str(rel_path / file) if rel_path != Path('.') else file,
                    'size': file_size,
                    'formatted_size': self._format_size(file_size)
                }
                
                # Особые пути для SQLite файлов
                if file.endswith('.db') or file.endswith('.sqlite') or file.endswith('.sqlite3'):
                    if '/data/' in str(file_path) or '\\data\\' in str(file_path):
                        file_entry['storage'] = 'persistent:/data'
                    else:
                        file_entry['storage'] = 'WARNING: not in /data!'
                        file_entry['warning'] = 'File should be in /data for persistence'
                
                folder_entry['items'].append(file_entry)
                self.arch_data['statistics']['files'] += 1
            
            self.arch_data['structure'].append(folder_entry)
            self.arch_data['statistics']['folders'] += 1
        
        self.arch_data['statistics']['total'] = (
            self.arch_data['statistics']['folders'] + 
            self.arch_data['statistics']['files']
        )
    
    def _get_folder_size(self, folder_path):
        """Вычисляет размер папки"""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(folder_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if os.path.exists(fp):
                    total_size += os.path.getsize(fp)
        return total_size
    
    def _format_size(self, size_bytes):
        """Форматирует размер в читаемый вид"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def generate_report(self):
        """Генерирует текстовый отчет"""
        report = []
        report.append("=" * 80)
        report.append("🏗️  АРХИТЕКТУРА ПРОЕКТА")
        report.append("=" * 80)
        report.append(f"📅 Сгенерировано: {self.arch_data['generated']}")
        report.append(f"📁 Корневая директория: {self.arch_data['root']}")
        report.append("")
        
        # Статистика
        stats = self.arch_data['statistics']
        report.append("📊 СТАТИСТИКА:")
        report.append(f"   📁 Папок: {stats['folders']}")
        report.append(f"   📄 Файлов: {stats['files']}")
        report.append(f"   📦 Всего: {stats['total']} элементов")
        report.append("")
        
        # Структура
        report.append("📂 СТРУКТУРА ПРОЕКТА:")
        
        # Проверяем наличие файлов в /data
        data_files = []
        for folder in self.arch_data['structure']:
            for item in folder.get('items', []):
                if item.get('storage') == 'persistent:/data':
                    data_files.append(item)
                elif item.get('storage') == 'WARNING: not in /data!':
                    report.append(f"⚠️  ВНИМАНИЕ: {item['path']} не в /data!")
        
        if data_files:
            report.append("✅ Файлы в постоянном хранилище /data:")
            for file in data_files:
                report.append(f"   📄 {file['path']} ({file['formatted_size']})")
        
        report.append("")
        
        # Дерево структуры
        report.append("🌳 ДЕРЕВО ФАЙЛОВ:")
        for folder in sorted(self.arch_data['structure'], key=lambda x: x['name']):
            if folder['items']:
                report.append(f"└── 📁 {folder['name']}/")
                for item in sorted(folder['items'], key=lambda x: x['name']):
                    icon = "📄"
                    if item.get('storage') == 'persistent:/data':
                        icon = "💾"
                    elif item.get('storage') == 'WARNING: not in /data!':
                        icon = "⚠️ "
                    
                    report.append(f"    ├── {icon} {item['name']} ({item['formatted_size']})")
        
        return "\n".join(report)
    
    def check_data_storage(self):
        """Проверяет, что файлы БД находятся в /data"""
        warnings = []
        for folder in self.arch_data['structure']:
            for item in folder.get('items', []):
                if item['name'].endswith(('.db', '.sqlite', '.sqlite3')):
                    path_lower = item['path'].lower()
                    if '/data/' not in path_lower.replace('\\', '/'):
                        warnings.append({
                            'file': item['path'],
                            'issue': 'SQLite файл не в /data',
                            'recommendation': f"Переместите в /data/{item['name']}"
                        })
        
        return warnings
    
    def save_report(self, output_file='arch.txt'):
        """Сохраняет отчет в файл"""
        report = self.generate_report()
        
        # Также сохраняем в /data для персистентности
        data_path = '/data/arch_report.txt'
        try:
            with open(data_path, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"✅ Отчет сохранен в {data_path}")
        except:
            print(f"⚠️ Не удалось сохранить в {data_path}")
        
        # Сохраняем в текущей директории
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Отчет сохранен в {output_file}")
        
        # Проверяем файлы БД
        warnings = self.check_data_storage()
        if warnings:
            print("\n⚠️  ВНИМАНИЕ: Файлы БД не в /data!")
            for warning in warnings:
                print(f"   • {warning['file']}: {warning['issue']}")
                print(f"     Рекомендация: {warning['recommendation']}")

def main():
    # Определяем корневую директорию проекта
    root_path = os.path.dirname(os.path.abspath(__file__))
    
    # Создаем и запускаем сканер
    arch = ProjectArchitecture(root_path)
    arch.scan()
    arch.save_report()
    
    # Выводим отчет в консоль
    print("\n" + "=" * 80)
    print("📋 ОТЧЕТ О ПРОВЕРКЕ ХРАНЕНИЯ ДАННЫХ")
    print("=" * 80)
    
    # Проверяем наличие /data
    data_path = '/data'
    if os.path.exists(data_path):
        print(f"✅ Директория /data существует")
        
        # Сканируем содержимое /data
        if os.listdir(data_path):
            print(f"📁 Содержимое /data:")
            for item in os.listdir(data_path):
                item_path = os.path.join(data_path, item)
                if os.path.isfile(item_path):
                    size = os.path.getsize(item_path)
                    print(f"   📄 {item} ({size} байт)")
                else:
                    print(f"   📁 {item}/")
        else:
            print(f"📁 Директория /data пуста")
    else:
        print(f"⚠️  Директория /data не существует!")
        print(f"   Для локальной разработки создайте её командой: mkdir /data")
    
    print("=" * 80)

if __name__ == '__main__':
    main()
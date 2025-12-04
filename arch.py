import os
from pathlib import Path
from datetime import datetime

def generate_project_architecture(start_path='.', max_depth=None, ignore_dirs=None, 
                                output_file='arch.txt', include_stats=False):
    """
    Создает или обновляет файл с древовидной структурой проекта
    """
    if ignore_dirs is None:
        ignore_dirs = {'.git', '__pycache__', '.pytest_cache', 'venv', 'env', 'node_modules', '.idea', '.vscode'}
    
    start_path = Path(start_path)
    output_lines = []
    file_count = 0
    dir_count = 0
    
    def _build_tree(path, prefix="", depth=0, is_last=False):
        nonlocal file_count, dir_count
        
        if max_depth and depth > max_depth:
            return
        
        # Пропускаем игнорируемые директории
        if path.name in ignore_dirs or path.name.startswith('.'):
            return
        
        # Определяем иконку и тип
        if path.is_dir():
            icon = "📁"
            dir_count += 1
        else:
            icon = "📄"
            file_count += 1
        
        # Формируем строку
        connector = "└── " if is_last else "├── "
        line = f"{prefix}{connector}{icon} {path.name}"
        
        # Добавляем информацию о размере для файлов
        if path.is_file():
            size = path.stat().st_size
            size_str = _format_size(size)
            line += f" ({size_str})"
        
        output_lines.append(line)
        
        if path.is_dir():
            items = sorted(list(path.iterdir()))
            # Фильтруем игнорируемые элементы
            items = [item for item in items if item.name not in ignore_dirs and not item.name.startswith('.')]
            
            for i, item in enumerate(items):
                is_last_item = i == len(items) - 1
                new_prefix = prefix + ("    " if is_last else "│   ")
                _build_tree(item, new_prefix, depth + 1, is_last_item)
    
    def _format_size(size):
        """Форматирует размер файла в читаемый вид"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    # Строим дерево
    _build_tree(start_path, is_last=True)
    
    # Создаем заголовок
    header = [
        "=" * 80,
        "🏗️  АРХИТЕКТУРА ПРОЕКТА",
        "=" * 80,
        f"📅 Сгенерировано: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"📁 Корневая директория: {start_path.absolute()}",
        ""
    ]
    
    # Добавляем статистику если нужно
    if include_stats:
        stats = [
            "",
            "📊 СТАТИСТИКА:",
            f"   📁 Папок: {dir_count}",
            f"   📄 Файлов: {file_count}",
            f"   📦 Всего: {dir_count + file_count} элементов",
            ""
        ]
        header.extend(stats)
    
    # Объединяем все строки
    content = "\n".join(header + output_lines)
    
    # Записываем в файл
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Архитектура проекта сохранена в файл: {output_file}")
        if include_stats:
            print(f"📊 Статистика: {dir_count} папок, {file_count} файлов")
    except Exception as e:
        print(f"❌ Ошибка при записи файла: {e}")
    
    return content

def print_project_tree(start_path='.', max_depth=None, ignore_dirs=None):
    """
    Выводит древовидную структуру проекта в консоль
    """
    content = generate_project_architecture(start_path, max_depth, ignore_dirs, 
                                          output_file=None, include_stats=False)
    print(content)

# Дополнительная функция для быстрого вызова
def update_architecture(max_depth=4):
    """
    Быстрое обновление архитектуры проекта с настройками по умолчанию
    """
    generate_project_architecture('.', max_depth=max_depth, include_stats=True)

# Использование
if __name__ == "__main__":
    # Создаем/обновляем файл arch.txt
    update_architecture(max_depth=4)
    
    # Также можно вывести в консоль
    # print_project_tree('.', max_depth=3)
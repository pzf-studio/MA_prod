import os
from pathlib import Path

def get_project_structure(root_dir='.', max_depth=5, output_file='structure.txt'):
    """
    Создает структуру проекта и сохраняет в файл
    
    Args:
        root_dir (str): Корневая директория проекта
        max_depth (int): Максимальная глубина вложенности
        output_file (str): Имя выходного файла
    """
    
    # Папки и файлы для игнорирования
    IGNORE_DIRS = {'.git', '.venv', '.vscode', '__pycache__', 'node_modules'}
    IGNORE_FILES = {'.gitignore', '.gitattributes', '.env', '.env.local'}
    
    # Преобразуем root_dir в Path объект
    root_path = Path(root_dir).resolve()
    
    # Проверяем существование директории
    if not root_path.exists() or not root_path.is_dir():
        print(f"Ошибка: Директория '{root_dir}' не существует")
        return
    
    # Создаем структуру
    structure_lines = []
    
    def build_tree(directory, prefix='', depth=0):
        if depth > max_depth:
            return
        
        try:
            # Получаем содержимое директории и сортируем
            items = sorted(os.listdir(directory), key=lambda x: (not os.path.isdir(os.path.join(directory, x)), x.lower()))
            
            for index, item in enumerate(items):
                item_path = os.path.join(directory, item)
                is_last = index == len(items) - 1
                
                # Пропускаем игнорируемые элементы
                if item in IGNORE_DIRS and os.path.isdir(item_path):
                    continue
                if item in IGNORE_FILES and os.path.isfile(item_path):
                    continue
                
                # Определяем символы для отображения
                connector = '└── ' if is_last else '├── '
                icon = '📁 ' if os.path.isdir(item_path) else '📄 '
                
                # Добавляем текущий элемент
                structure_lines.append(f"{prefix}{connector}{icon}{item}")
                
                # Если это директория, рекурсивно обрабатываем её содержимое
                if os.path.isdir(item_path):
                    extension = '    ' if is_last else '│   '
                    build_tree(item_path, prefix + extension, depth + 1)
                    
        except PermissionError:
            structure_lines.append(f"{prefix}└── 📁 [Доступ запрещен]")
        except Exception as e:
            structure_lines.append(f"{prefix}└── ❗ [Ошибка: {str(e)}]")
    
    # Собираем структуру
    structure_lines.append(f"📁 {root_path.name}/")
    build_tree(root_path)
    
    # Записываем в файл (перезаписываем если существует)
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(structure_lines))
        print(f"Структура проекта успешно сохранена в файл '{output_file}'")
        
        # Выводим структуру в консоль для наглядности
        print("\nСтруктура проекта:")
        print('\n'.join(structure_lines))
        
    except Exception as e:
        print(f"Ошибка при записи файла: {e}")

if __name__ == "__main__":
    # Получаем структуру текущей директории
    get_project_structure()
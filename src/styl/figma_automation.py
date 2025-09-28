"""
Automatyzacja procesu eksportu z Figma
Integruje wszystkie komponenty w jeden system
"""
import os
import json
import time
from pathlib import Path
from .figma_plugins_manager import FigmaPluginsManager
from .advanced_figma_converter import AdvancedFigmaConverter

class FigmaAutomation:
    """Główna klasa automatyzacji Figma"""
    
    def __init__(self, config_file="styl/figma_config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        self.plugins_manager = FigmaPluginsManager(self.config.get('figma_token'))
        self.converter = AdvancedFigmaConverter()
        
    def load_config(self):
        """Ładuje konfigurację z pliku JSON"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            return self.create_default_config()
    
    def create_default_config(self):
        """Tworzy domyślną konfigurację"""
        config = {
            "figma_token": "",
            "file_key": "",
            "components": {
                "buttons": ["main-button", "secondary-button", "success-button"],
                "inputs": ["input-field", "textarea-field"],
                "cards": ["result-card", "info-card"],
                "labels": ["form-label", "header-title", "subtitle"]
            },
            "export_settings": {
                "auto_convert": True,
                "create_pyqt5_functions": True,
                "add_animations": True,
                "responsive_layout": True
            },
            "output_directories": {
                "css": "styl/exported/",
                "pyqt5": "styl/pyqt5_components/",
                "templates": "styl/templates/"
            }
        }
        
        # Zapisz domyślną konfigurację
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        
        return config
    
    def setup_directories(self):
        """Tworzy potrzebne katalogi"""
        for dir_name in self.config['output_directories'].values():
            os.makedirs(dir_name, exist_ok=True)
        print("✅ Utworzono katalogi eksportu")
    
    def export_all_components(self):
        """Eksportuje wszystkie komponenty z Figma"""
        print("🚀 Rozpoczynam eksport wszystkich komponentów...")
        
        # Utwórz katalogi
        self.setup_directories()
        
        # Eksportuj każdy typ komponentu
        for component_type, component_names in self.config['components'].items():
            print(f"📦 Eksportuję {component_type}: {component_names}")
            
            for component_name in component_names:
                self.export_single_component(component_name, component_type)
                time.sleep(0.5)  # Pauza między eksportami
        
        print("✅ Zakończono eksport wszystkich komponentów")
    
    def export_single_component(self, component_name, component_type):
        """Eksportuje pojedynczy komponent"""
        try:
            # Eksportuj z Figma API
            success = self.plugins_manager.export_component_from_figma(
                file_key=self.config['file_key'],
                node_id=self.get_node_id(component_name),
                component_name=component_name
            )
            
            if success and self.config['export_settings']['auto_convert']:
                # Automatycznie konwertuj na PyQt5
                self.convert_to_pyqt5(component_name, component_type)
            
            return success
            
        except Exception as e:
            print(f"❌ Błąd eksportu komponentu {component_name}: {e}")
            return False
    
    def get_node_id(self, component_name):
        """Zwraca ID węzła dla komponentu (do implementacji)"""
        # W rzeczywistej implementacji, ID węzłów byłyby w konfiguracji
        node_mapping = {
            "main-button": "1:23",
            "secondary-button": "1:24", 
            "input-field": "1:25",
            "result-card": "1:26"
        }
        return node_mapping.get(component_name, "1:23")
    
    def convert_to_pyqt5(self, component_name, component_type):
        """Konwertuje wyeksportowany CSS na funkcje PyQt5"""
        css_file = f"styl/exported_{component_name.lower().replace(' ', '_')}.css"
        pyqt5_file = f"styl/pyqt5_components/{component_name.lower().replace(' ', '_')}.py"
        
        if not os.path.exists(css_file):
            print(f"⚠️ Brak pliku CSS: {css_file}")
            return
        
        # Wczytaj CSS
        with open(css_file, 'r', encoding='utf-8') as f:
            css_content = f.read()
        
        # Konwertuj na PyQt5
        pyqt5_style = self.converter.create_advanced_style(component_name, css_content)
        
        # Generuj funkcję PyQt5
        pyqt5_function = self.generate_pyqt5_function(component_name, component_type, pyqt5_style)
        
        # Zapisz funkcję
        with open(pyqt5_file, 'w', encoding='utf-8') as f:
            f.write(pyqt5_function)
        
        print(f"✅ Utworzono funkcję PyQt5: {pyqt5_file}")
    
    def generate_pyqt5_function(self, component_name, component_type, style):
        """Generuje funkcję PyQt5 dla komponentu"""
        function_name = f"create_{component_name.lower().replace('-', '_')}"
        
        # Mapowanie typów na klasy PyQt5
        widget_classes = {
            "buttons": "QPushButton",
            "inputs": "QLineEdit", 
            "cards": "QWidget",
            "labels": "QLabel"
        }
        
        widget_class = widget_classes.get(component_type, "QWidget")
        
        function_code = f'''"""
Komponent {component_name} wyeksportowany z Figma
Automatycznie wygenerowany przez FigmaAutomation
"""
from PyQt5.QtWidgets import {widget_class}
from PyQt5.QtCore import Qt

def {function_name}(text="", parent=None):
    """Tworzy komponent {component_name} z stylami Figma"""
    widget = {widget_class}(text, parent)
    widget.setStyleSheet("""
{style}
    """)
    
    # Dodaj animację jeśli włączona
    if True:  # self.config['export_settings']['add_animations']
        from .advanced_figma_converter import AdvancedFigmaConverter
        converter = AdvancedFigmaConverter()
        converter.create_animated_widget(widget, "fadeIn", 300)
    
    return widget

# Przykład użycia:
# button = {function_name}("Kliknij mnie")
'''
        
        return function_code
    
    def create_master_import_file(self):
        """Tworzy główny plik importu wszystkich komponentów"""
        import_file = "styl/figma_components.py"
        
        # Znajdź wszystkie wygenerowane pliki
        pyqt5_dir = self.config['output_directories']['pyqt5']
        component_files = []
        
        if os.path.exists(pyqt5_dir):
            for file in os.listdir(pyqt5_dir):
                if file.endswith('.py'):
                    component_files.append(file[:-3])  # Usuń .py
        
        # Generuj importy
        imports = []
        for component_file in component_files:
            imports.append(f"from .pyqt5_components.{component_file} import *")
        
        # Generuj główny plik
        master_content = f'''"""
Główny plik importu komponentów Figma
Automatycznie wygenerowany przez FigmaAutomation
"""
{chr(10).join(imports)}

# Lista dostępnych komponentów
AVAILABLE_COMPONENTS = {component_files}

def get_component(component_name):
    """Zwraca funkcję tworzącą komponent o podanej nazwie"""
    component_map = {{
        # Automatycznie wygenerowane mapowanie
    }}
    
    return component_map.get(component_name, None)
'''
        
        with open(import_file, 'w', encoding='utf-8') as f:
            f.write(master_content)
        
        print(f"✅ Utworzono główny plik importu: {import_file}")
    
    def run_full_automation(self):
        """Uruchamia pełną automatyzację"""
        print("🎨 Uruchamiam pełną automatyzację Figma → PyQt5")
        
        # 1. Eksportuj wszystkie komponenty
        self.export_all_components()
        
        # 2. Utwórz główny plik importu
        self.create_master_import_file()
        
        # 3. Wygeneruj raport
        self.generate_report()
        
        print("🎉 Automatyzacja zakończona pomyślnie!")
    
    def generate_report(self):
        """Generuje raport z automatyzacji"""
        report_file = "styl/automation_report.md"
        
        # Policz wyeksportowane pliki
        css_count = len([f for f in os.listdir("styl/exported/") if f.endswith('.css')]) if os.path.exists("styl/exported/") else 0
        pyqt5_count = len([f for f in os.listdir("styl/pyqt5_components/") if f.endswith('.py')]) if os.path.exists("styl/pyqt5_components/") else 0
        
        report_content = f'''# 📊 Raport automatyzacji Figma

## ✅ Zakończone zadania:
- Wyeksportowano {css_count} plików CSS
- Wygenerowano {pyqt5_count} funkcji PyQt5
- Utworzono główny plik importu

## 📁 Struktura plików:
```
styl/
├── exported/           # Pliki CSS z Figma
├── pyqt5_components/   # Funkcje PyQt5
├── figma_components.py # Główny plik importu
└── automation_report.md # Ten raport
```

## 🚀 Jak używać:
```python
from src.styl.figma_components import *

# Tworzenie komponentów
button = create_main_button("Kliknij mnie")
input_field = create_input_field("Wprowadź tekst")
card = create_result_card()
```

## ⚙️ Konfiguracja:
Edytuj plik `styl/figma_config.json` aby dostosować eksport.
'''
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"✅ Wygenerowano raport: {report_file}")

# Przykład użycia
def run_figma_automation():
    """Uruchamia automatyzację Figma"""
    automation = FigmaAutomation()
    automation.run_full_automation()

if __name__ == "__main__":
    run_figma_automation()

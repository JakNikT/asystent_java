"""
Integracja stylów Figma z PyQt5
Funkcje pomocnicze do konwersji stylów CSS na PyQt5
"""
import os
from PyQt5.QtWidgets import QWidget, QPushButton, QLineEdit, QLabel, QTextEdit
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

def load_figma_styles():
    """Ładuje style CSS z pliku figma_styles.css"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        css_file = os.path.join(current_dir, 'figma_styles.css')
        
        with open(css_file, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print("⚠️ Plik figma_styles.css nie został znaleziony")
        return ""
    except Exception as e:
        print(f"❌ Błąd podczas ładowania stylów Figma: {e}")
        return ""

def css_to_pyqt5_style(css_class_name, css_content):
    """
    Konwertuje style CSS na format PyQt5
    Przykład: css_to_pyqt5_style("main-button", css_content)
    """
    lines = css_content.split('\n')
    in_class = False
    styles = []
    
    for line in lines:
        line = line.strip()
        
        # Sprawdź czy zaczyna się klasa
        if line.startswith(f".{css_class_name}"):
            in_class = True
            continue
        elif line.startswith('.') and in_class:
            # Nowa klasa - koniec poprzedniej
            break
        elif in_class and line and not line.startswith('/*'):
            # Dodaj style
            if ':' in line and not line.startswith('}'):
                styles.append(line)
    
    # Konwertuj na PyQt5 format
    pyqt5_style = ""
    for style in styles:
        if ':' in style:
            prop, value = style.split(':', 1)
            prop = prop.strip()
            value = value.strip().rstrip(';')
            
            # Mapowanie właściwości CSS na PyQt5
            if prop == 'background-color':
                pyqt5_style += f"background-color: {value}; "
            elif prop == 'color':
                pyqt5_style += f"color: {value}; "
            elif prop == 'border':
                pyqt5_style += f"border: {value}; "
            elif prop == 'border-radius':
                pyqt5_style += f"border-radius: {value}; "
            elif prop == 'padding':
                pyqt5_style += f"padding: {value}; "
            elif prop == 'font-family':
                # PyQt5 używa font-family w cudzysłowach
                pyqt5_style += f"font-family: '{value}'; "
            elif prop == 'font-weight':
                # Konwertuj font-weight na liczby
                weight_map = {
                    'normal': '400',
                    'bold': '700',
                    '500': '500',
                    '600': '600'
                }
                weight = weight_map.get(value, value)
                pyqt5_style += f"font-weight: {weight}; "
            elif prop == 'font-size':
                pyqt5_style += f"font-size: {value}; "
            elif prop == 'cursor':
                # PyQt5 nie obsługuje cursor w stylach
                pass
            elif prop == 'transition':
                # PyQt5 nie obsługuje transition
                pass
            elif prop == 'box-shadow':
                # PyQt5 nie obsługuje box-shadow bezpośrednio
                pass
            elif prop == 'width':
                pyqt5_style += f"min-width: {value}; "
            elif prop == 'height':
                pyqt5_style += f"min-height: {value}; "
    
    return pyqt5_style

def apply_figma_button_style(button, style_name="main-button"):
    """Stosuje style Figma do przycisku PyQt5"""
    css_content = load_figma_styles()
    if not css_content:
        return
    
    pyqt5_style = css_to_pyqt5_style(style_name, css_content)
    if pyqt5_style:
        button.setStyleSheet(pyqt5_style)

def apply_figma_input_style(input_field, style_name="input-field"):
    """Stosuje style Figma do pola input PyQt5"""
    css_content = load_figma_styles()
    if not css_content:
        return
    
    pyqt5_style = css_to_pyqt5_style(style_name, css_content)
    if pyqt5_style:
        input_field.setStyleSheet(pyqt5_style)

def apply_figma_label_style(label, style_name="form-label"):
    """Stosuje style Figma do etykiety PyQt5"""
    css_content = load_figma_styles()
    if not css_content:
        return
    
    pyqt5_style = css_to_pyqt5_style(style_name, css_content)
    if pyqt5_style:
        label.setStyleSheet(pyqt5_style)

def apply_figma_card_style(widget, style_name="result-card"):
    """Stosuje style Figma do karty PyQt5"""
    css_content = load_figma_styles()
    if not css_content:
        return
    
    pyqt5_style = css_to_pyqt5_style(style_name, css_content)
    if pyqt5_style:
        widget.setStyleSheet(pyqt5_style)

def create_figma_button(text, style_name="main-button", parent=None):
    """Tworzy przycisk z stylami Figma"""
    button = QPushButton(text, parent)
    apply_figma_button_style(button, style_name)
    return button

def create_figma_input(placeholder="", style_name="input-field", parent=None):
    """Tworzy pole input z stylami Figma"""
    input_field = QLineEdit(parent)
    input_field.setPlaceholderText(placeholder)
    apply_figma_input_style(input_field, style_name)
    return input_field

def create_figma_label(text, style_name="form-label", parent=None):
    """Tworzy etykietę z stylami Figma"""
    label = QLabel(text, parent)
    apply_figma_label_style(label, style_name)
    return label

def create_figma_card(parent=None, style_name="result-card"):
    """Tworzy kartę z stylami Figma"""
    card = QWidget(parent)
    apply_figma_card_style(card, style_name)
    return card

# Style zgodne z projektem Figma
FIGMA_BUTTON_STYLES = {
    "primary": """
        QPushButton {
            background-color: #194576;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 16px;
            font-family: 'Inter', sans-serif;
            font-weight: 900;
            font-size: 10px;
            font-style: italic;
            min-height: 35px;
        }
        QPushButton:hover {
            background-color: #2C699F;
        }
        QPushButton:pressed {
            background-color: #386BB2;
        }
    """,
    
    "secondary": """
        QPushButton {
            background-color: #194576;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 16px;
            font-family: 'Inter', sans-serif;
            font-weight: 900;
            font-size: 10px;
            font-style: italic;
            min-height: 35px;
        }
        QPushButton:hover {
            background-color: #2C699F;
        }
    """,
    
    "success": """
        QPushButton {
            background-color: #194576;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 16px;
            font-family: 'Inter', sans-serif;
            font-weight: 900;
            font-size: 10px;
            font-style: italic;
            min-height: 35px;
        }
        QPushButton:hover {
            background-color: #2C699F;
        }
    """,
    
    "warning": """
        QPushButton {
            background-color: #194576;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 16px;
            font-family: 'Inter', sans-serif;
            font-weight: 900;
            font-size: 10px;
            font-style: italic;
            min-height: 35px;
        }
        QPushButton:hover {
            background-color: #2C699F;
        }
    """,
    
    "error": """
        QPushButton {
            background-color: #194576;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 16px;
            font-family: 'Inter', sans-serif;
            font-weight: 900;
            font-size: 10px;
            font-style: italic;
            min-height: 35px;
        }
        QPushButton:hover {
            background-color: #2C699F;
        }
    """
}

FIGMA_INPUT_STYLES = {
    "default": """
        QLineEdit {
            background-color: #194576;
            border: 1px solid #386BB2;
            border-radius: 5px;
            padding: 8px 12px;
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 900;
            font-style: italic;
            color: white;
            min-height: 29px;
        }
        QLineEdit:focus {
            border-color: #2C699F;
            background-color: #2C699F;
        }
        QLineEdit::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }
    """,
    
    "error": """
        QLineEdit {
            background-color: #194576;
            border: 1px solid #FF3B30;
            border-radius: 5px;
            padding: 8px 12px;
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 900;
            font-style: italic;
            color: white;
            min-height: 29px;
        }
        QLineEdit:focus {
            border-color: #FF3B30;
            background-color: #2C699F;
        }
    """
}

def get_figma_button_style(style_type="primary"):
    """Zwraca gotowy styl przycisku Figma"""
    return FIGMA_BUTTON_STYLES.get(style_type, FIGMA_BUTTON_STYLES["primary"])

def get_figma_input_style(style_type="default"):
    """Zwraca gotowy styl pola input Figma"""
    return FIGMA_INPUT_STYLES.get(style_type, FIGMA_INPUT_STYLES["default"])

# === NOWE KOMPONENTY FIGMA ===

def create_figma_checkbox(text, style_name="checkbox", parent=None):
    """Tworzy checkbox z stylami Figma"""
    from PyQt5.QtWidgets import QCheckBox
    checkbox = QCheckBox(text, parent)
    
    checkbox_style = """
        QCheckBox {
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: white;
            spacing: 8px;
        }
        QCheckBox::indicator {
            width: 16px;
            height: 16px;
            border: 2px solid #386BB2;
            border-radius: 3px;
            background-color: #194576;
        }
        QCheckBox::indicator:checked {
            background-color: #2C699F;
            border-color: #2C699F;
        }
        QCheckBox::indicator:hover {
            border-color: #A6C2EF;
        }
    """
    checkbox.setStyleSheet(checkbox_style)
    return checkbox

def create_figma_radio_button(text, style_name="radio", parent=None):
    """Tworzy radio button z stylami Figma"""
    from PyQt5.QtWidgets import QRadioButton
    radio = QRadioButton(text, parent)
    
    radio_style = """
        QRadioButton {
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: white;
            spacing: 8px;
        }
        QRadioButton::indicator {
            width: 16px;
            height: 16px;
            border: 2px solid #386BB2;
            border-radius: 8px;
            background-color: #194576;
        }
        QRadioButton::indicator:checked {
            background-color: #2C699F;
            border-color: #2C699F;
        }
        QRadioButton::indicator:hover {
            border-color: #A6C2EF;
        }
    """
    radio.setStyleSheet(radio_style)
    return radio

def create_figma_slider(style_name="slider", parent=None):
    """Tworzy slider z stylami Figma"""
    from PyQt5.QtWidgets import QSlider
    from PyQt5.QtCore import Qt
    
    slider = QSlider(Qt.Horizontal, parent)
    
    slider_style = """
        QSlider::groove:horizontal {
            border: 1px solid #386BB2;
            height: 6px;
            background: #194576;
            border-radius: 3px;
        }
        QSlider::handle:horizontal {
            background: #2C699F;
            border: 2px solid #A6C2EF;
            width: 18px;
            height: 18px;
            border-radius: 9px;
            margin: -6px 0;
        }
        QSlider::handle:horizontal:hover {
            background: #A6C2EF;
            border-color: #2C699F;
        }
    """
    slider.setStyleSheet(slider_style)
    return slider

def create_figma_progress_bar(style_name="progress", parent=None):
    """Tworzy progress bar z stylami Figma"""
    from PyQt5.QtWidgets import QProgressBar
    
    progress = QProgressBar(parent)
    
    progress_style = """
        QProgressBar {
            border: 1px solid #386BB2;
            border-radius: 5px;
            background-color: #194576;
            text-align: center;
            color: white;
            font-family: 'Inter', sans-serif;
            font-weight: 500;
        }
        QProgressBar::chunk {
            background-color: #2C699F;
            border-radius: 4px;
        }
    """
    progress.setStyleSheet(progress_style)
    return progress

def create_figma_tab_widget(style_name="tabs", parent=None):
    """Tworzy tab widget z stylami Figma"""
    from PyQt5.QtWidgets import QTabWidget
    
    tabs = QTabWidget(parent)
    
    tabs_style = """
        QTabWidget::pane {
            border: 1px solid #386BB2;
            border-radius: 5px;
            background-color: #194576;
        }
        QTabBar::tab {
            background-color: #2C699F;
            color: white;
            padding: 8px 16px;
            margin-right: 2px;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            font-family: 'Inter', sans-serif;
            font-weight: 500;
        }
        QTabBar::tab:selected {
            background-color: #194576;
            border-bottom: 2px solid #A6C2EF;
        }
        QTabBar::tab:hover {
            background-color: #A6C2EF;
        }
    """
    tabs.setStyleSheet(tabs_style)
    return tabs

def create_figma_list_widget(style_name="list", parent=None):
    """Tworzy list widget z stylami Figma"""
    from PyQt5.QtWidgets import QListWidget
    
    list_widget = QListWidget(parent)
    
    list_style = """
        QListWidget {
            background-color: #194576;
            border: 1px solid #386BB2;
            border-radius: 5px;
            color: white;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
        }
        QListWidget::item {
            padding: 8px 12px;
            border-bottom: 1px solid #2C699F;
        }
        QListWidget::item:selected {
            background-color: #2C699F;
        }
        QListWidget::item:hover {
            background-color: #A6C2EF;
        }
    """
    list_widget.setStyleSheet(list_style)
    return list_widget

def create_figma_combo_box(style_name="combo", parent=None):
    """Tworzy combo box z stylami Figma"""
    from PyQt5.QtWidgets import QComboBox
    
    combo = QComboBox(parent)
    
    combo_style = """
        QComboBox {
            background-color: #194576;
            border: 1px solid #386BB2;
            border-radius: 5px;
            padding: 8px 12px;
            color: white;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            min-width: 100px;
        }
        QComboBox::drop-down {
            border: none;
            width: 20px;
        }
        QComboBox::down-arrow {
            image: none;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid white;
            margin-right: 5px;
        }
        QComboBox QAbstractItemView {
            background-color: #194576;
            border: 1px solid #386BB2;
            border-radius: 5px;
            color: white;
            selection-background-color: #2C699F;
        }
    """
    combo.setStyleSheet(combo_style)
    return combo

# === LAYOUT HELPERS ===

def create_figma_form_layout(parent=None):
    """Tworzy form layout z stylami Figma"""
    from PyQt5.QtWidgets import QFormLayout
    
    layout = QFormLayout(parent)
    layout.setSpacing(12)
    layout.setContentsMargins(20, 20, 20, 20)
    return layout

def create_figma_grid_layout(parent=None):
    """Tworzy grid layout z stylami Figma"""
    from PyQt5.QtWidgets import QGridLayout
    
    layout = QGridLayout(parent)
    layout.setSpacing(10)
    layout.setContentsMargins(20, 20, 20, 20)
    return layout

def create_figma_hbox_layout(parent=None):
    """Tworzy horizontal box layout z stylami Figma"""
    from PyQt5.QtWidgets import QHBoxLayout
    
    layout = QHBoxLayout(parent)
    layout.setSpacing(10)
    layout.setContentsMargins(20, 20, 20, 20)
    return layout

def create_figma_vbox_layout(parent=None):
    """Tworzy vertical box layout z stylami Figma"""
    from PyQt5.QtWidgets import QVBoxLayout
    
    layout = QVBoxLayout(parent)
    layout.setSpacing(10)
    layout.setContentsMargins(20, 20, 20, 20)
    return layout
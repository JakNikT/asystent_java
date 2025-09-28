"""
Moduł motywu kolorów aplikacji
Definiuje kolory i style dla interfejsu użytkownika
"""
from PyQt5.QtGui import QColor

class ModernTheme:
    """Nowoczesny motyw kolorów - zgodny z designem z Figma"""
    
    # Główne kolory - zgodne z Figma
    PRIMARY = QColor(30, 60, 120)            # Ciemny niebieski (logo i nagłówki)
    SECONDARY = QColor(173, 216, 230)        # Jasny niebieski (panele formularza)
    TERTIARY = QColor(135, 206, 235)         # Średni niebieski (ramki)
    
    # Akcenty - zgodne z Figma
    ACCENT = QColor(255, 255, 255)           # Biały (tekst na ciemnym tle)
    ACCENT_HOVER = QColor(240, 248, 255)     # Bardzo jasny niebieski (hover)
    ACCENT_LIGHT = QColor(200, 220, 255)     # Jaśniejszy niebieski (aktywne elementy)
    
    # Kolory funkcjonalne - kontrastowe na niebieskim tle
    SUCCESS = QColor(34, 197, 94)            # Zielony (sukces)
    WARNING = QColor(245, 158, 11)           # Pomarańczowy (ostrzeżenie)
    ERROR = QColor(239, 68, 68)              # Czerwony (błąd)
    INFO = QColor(59, 130, 246)              # Niebieski (informacja)
    
    # Tekst - zgodny z Figma
    TEXT_PRIMARY = QColor(30, 60, 120)       # Ciemny niebieski (główny tekst)
    TEXT_SECONDARY = QColor(100, 116, 139)   # Szary (drugorzędny tekst)
    TEXT_WHITE = QColor(255, 255, 255)       # Biały (tekst na ciemnym tle)

def get_application_stylesheet():
    """Zwraca główny arkusz stylów aplikacji - zgodny z Figma"""
    return f"""
        QMainWindow {{
            background-color: {ModernTheme.SECONDARY.name()};
        }}
        QGroupBox {{
            font-weight: bold;
            border: 2px solid {ModernTheme.TERTIARY.name()};
            border-radius: 10px;
            margin-top: 10px;
            padding-top: 10px;
            background-color: {ModernTheme.SECONDARY.name()};
        }}
        QGroupBox::title {{
            subcontrol-origin: margin;
            left: 10px;
            padding: 0 5px 0 5px;
            color: {ModernTheme.TEXT_PRIMARY.name()};
        }}
        QLineEdit, QComboBox {{
            border: 2px solid {ModernTheme.TERTIARY.name()};
            border-radius: 8px;
            padding: 8px;
            background-color: white;
            font-size: 12px;
            color: {ModernTheme.TEXT_PRIMARY.name()};
        }}
        QLineEdit:focus, QComboBox:focus {{
            border-color: {ModernTheme.PRIMARY.name()};
        }}
        QRadioButton {{
            font-size: 12px;
            color: {ModernTheme.TEXT_PRIMARY.name()};
            padding: 2px;
        }}
        QRadioButton::indicator {{
            width: 16px;
            height: 16px;
        }}
        QRadioButton::indicator::unchecked {{
            border: 2px solid {ModernTheme.TERTIARY.name()};
            border-radius: 8px;
            background-color: white;
        }}
        QRadioButton::indicator::checked {{
            border: 2px solid {ModernTheme.PRIMARY.name()};
            border-radius: 8px;
            background-color: {ModernTheme.PRIMARY.name()};
        }}
        QTextEdit {{
            border: 2px solid {ModernTheme.TERTIARY.name()};
            border-radius: 8px;
            background-color: white;
            font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
            color: {ModernTheme.TEXT_PRIMARY.name()};
        }}
        QLabel {{
            color: {ModernTheme.TEXT_PRIMARY.name()};
            font-size: 12px;
        }}
    """

def get_button_style(color, hover_color=None):
    """Zwraca styl dla przycisku z określonym kolorem"""
    if hover_color is None:
        hover_color = color.darker(120)
    
    return f"""
        QPushButton {{
            background-color: {color.name()};
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
        }}
        QPushButton:hover {{
            background-color: {hover_color.name()};
        }}
    """

def get_results_text_style():
    """Zwraca styl dla pola wyników"""
    return f"""
        QTextEdit {{
            background-color: {ModernTheme.PRIMARY.name()};
            border: 2px solid {ModernTheme.TERTIARY.name()};
            border-radius: 8px;
            padding: 10px;
            font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
            font-size: 13px;
            line-height: 1.3;
            font-weight: 500;
        }}
    """

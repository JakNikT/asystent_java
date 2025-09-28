"""
Zaawansowany konwerter Figma → PyQt5
Rozszerzona wersja z obsługą zaawansowanych stylów CSS
"""
import os
import re
import json
from PyQt5.QtWidgets import *
from PyQt5.QtCore import Qt, QPropertyAnimation, QEasingCurve
from PyQt5.QtGui import QFont, QColor, QPalette, QLinearGradient, QBrush

class AdvancedFigmaConverter:
    """Zaawansowany konwerter stylów Figma na PyQt5"""
    
    def __init__(self):
        self.css_variables = {}
        self.animation_cache = {}
        
    def load_css_variables(self, css_content):
        """Ładuje zmienne CSS z :root"""
        root_match = re.search(r':root\s*\{([^}]+)\}', css_content, re.DOTALL)
        if root_match:
            variables_text = root_match.group(1)
            for line in variables_text.split('\n'):
                if '--' in line and ':' in line:
                    var_name, var_value = line.split(':', 1)
                    var_name = var_name.strip().replace('--', '')
                    var_value = var_value.strip().rstrip(';')
                    self.css_variables[var_name] = var_value
    
    def resolve_css_variable(self, value):
        """Rozwiązuje zmienne CSS"""
        if value.startswith('var('):
            var_name = value[4:-1]  # Usuń var( i )
            return self.css_variables.get(var_name, value)
        return value
    
    def convert_box_shadow(self, shadow_value):
        """Konwertuje box-shadow na PyQt5 border"""
        # Przykład: "0px 2px 8px rgba(0,0,0,0.1)"
        shadow_match = re.match(r'(\d+)px\s+(\d+)px\s+(\d+)px\s+(.+)', shadow_value)
        if shadow_match:
            offset_x, offset_y, blur, color = shadow_match.groups()
            # PyQt5 nie obsługuje bezpośrednio box-shadow, ale można symulować
            return f"border: 1px solid {color};"
        return ""
    
    def convert_gradient(self, gradient_value):
        """Konwertuje gradient na PyQt5"""
        if 'linear-gradient' in gradient_value:
            # Przykład: "linear-gradient(45deg, #ff0000, #0000ff)"
            gradient_match = re.match(r'linear-gradient\(([^,]+),\s*([^,]+),\s*([^)]+)\)', gradient_value)
            if gradient_match:
                angle, color1, color2 = gradient_match.groups()
                return f"background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 {color1}, stop:1 {color2});"
        return f"background: {gradient_value};"
    
    def convert_flexbox(self, display_value, flex_properties):
        """Konwertuje właściwości flexbox na PyQt5 layout"""
        if display_value == 'flex':
            layout_type = "QHBoxLayout" if flex_properties.get('flex-direction') == 'row' else "QVBoxLayout"
            return {
                'layout_type': layout_type,
                'alignment': self.get_flex_alignment(flex_properties)
            }
        return None
    
    def get_flex_alignment(self, flex_properties):
        """Konwertuje justify-content i align-items na PyQt5 alignment"""
        justify = flex_properties.get('justify-content', 'flex-start')
        align = flex_properties.get('align-items', 'stretch')
        
        alignment_map = {
            'flex-start': Qt.AlignLeft | Qt.AlignTop,
            'flex-end': Qt.AlignRight | Qt.AlignBottom,
            'center': Qt.AlignCenter,
            'space-between': Qt.AlignJustify,
            'space-around': Qt.AlignJustify
        }
        
        return alignment_map.get(justify, Qt.AlignLeft | Qt.AlignTop)
    
    def convert_animation(self, animation_value):
        """Konwertuje CSS animation na PyQt5 QPropertyAnimation"""
        # Przykład: "fadeIn 0.3s ease-in-out"
        anim_match = re.match(r'(\w+)\s+(\d+(?:\.\d+)?)s\s+(\w+)', animation_value)
        if anim_match:
            name, duration, easing = anim_match.groups()
            return {
                'duration': float(duration) * 1000,  # Konwertuj na ms
                'easing': self.get_easing_curve(easing)
            }
        return None
    
    def get_easing_curve(self, easing_name):
        """Mapuje CSS easing na QEasingCurve"""
        easing_map = {
            'ease': QEasingCurve.InOutQuad,
            'ease-in': QEasingCurve.InQuad,
            'ease-out': QEasingCurve.OutQuad,
            'ease-in-out': QEasingCurve.InOutQuad,
            'linear': QEasingCurve.Linear
        }
        return easing_map.get(easing_name, QEasingCurve.InOutQuad)
    
    def create_advanced_style(self, css_class_name, css_content):
        """Tworzy zaawansowany styl PyQt5 z obsługą wszystkich właściwości CSS"""
        # Załaduj zmienne CSS
        self.load_css_variables(css_content)
        
        # Znajdź klasę CSS
        class_pattern = rf'\.{re.escape(css_class_name)}\s*\{{([^}}]+)\}}'
        class_match = re.search(class_pattern, css_content, re.DOTALL)
        
        if not class_match:
            return ""
        
        class_content = class_match.group(1)
        properties = {}
        
        # Parsuj właściwości CSS
        for line in class_content.split('\n'):
            line = line.strip()
            if ':' in line and not line.startswith('/*'):
                prop, value = line.split(':', 1)
                prop = prop.strip()
                value = value.strip().rstrip(';')
                value = self.resolve_css_variable(value)
                properties[prop] = value
        
        # Konwertuj na PyQt5
        pyqt5_style = ""
        
        # Background
        if 'background-color' in properties:
            pyqt5_style += f"background-color: {properties['background-color']}; "
        elif 'background' in properties:
            if 'linear-gradient' in properties['background']:
                pyqt5_style += self.convert_gradient(properties['background']) + " "
            else:
                pyqt5_style += f"background: {properties['background']}; "
        
        # Text properties
        if 'color' in properties:
            pyqt5_style += f"color: {properties['color']}; "
        
        if 'font-family' in properties:
            font_family = properties['font-family'].replace("'", "").replace('"', '')
            pyqt5_style += f"font-family: '{font_family}'; "
        
        if 'font-size' in properties:
            pyqt5_style += f"font-size: {properties['font-size']}; "
        
        if 'font-weight' in properties:
            weight_map = {'normal': '400', 'bold': '700', '500': '500', '600': '600'}
            weight = weight_map.get(properties['font-weight'], properties['font-weight'])
            pyqt5_style += f"font-weight: {weight}; "
        
        if 'font-style' in properties:
            pyqt5_style += f"font-style: {properties['font-style']}; "
        
        # Border
        if 'border' in properties:
            pyqt5_style += f"border: {properties['border']}; "
        elif 'border-radius' in properties:
            pyqt5_style += f"border-radius: {properties['border-radius']}; "
        
        # Padding
        if 'padding' in properties:
            pyqt5_style += f"padding: {properties['padding']}; "
        
        # Box shadow (symulacja)
        if 'box-shadow' in properties:
            shadow_style = self.convert_box_shadow(properties['box-shadow'])
            pyqt5_style += shadow_style + " "
        
        # Dimensions
        if 'width' in properties:
            pyqt5_style += f"min-width: {properties['width']}; "
        
        if 'height' in properties:
            pyqt5_style += f"min-height: {properties['height']}; "
        
        # Position
        if 'position' in properties:
            if properties['position'] == 'absolute':
                pyqt5_style += "position: absolute; "
        
        # Cursor (ignorowane w PyQt5)
        # Transition (ignorowane w PyQt5)
        
        return pyqt5_style.strip()
    
    def create_animated_widget(self, widget, animation_type="fadeIn", duration=300):
        """Dodaje animację do widgetu"""
        if animation_type == "fadeIn":
            widget.setWindowOpacity(0)
            self.fade_animation = QPropertyAnimation(widget, b"windowOpacity")
            self.fade_animation.setDuration(duration)
            self.fade_animation.setStartValue(0)
            self.fade_animation.setEndValue(1)
            self.fade_animation.setEasingCurve(QEasingCurve.InOutQuad)
            self.fade_animation.start()
    
    def create_responsive_layout(self, parent_widget, layout_config):
        """Tworzy responsywny layout na podstawie konfiguracji"""
        if layout_config.get('type') == 'flex':
            if layout_config.get('direction') == 'row':
                layout = QHBoxLayout()
            else:
                layout = QVBoxLayout()
            
            layout.setAlignment(layout_config.get('alignment', Qt.AlignLeft | Qt.AlignTop))
            layout.setSpacing(layout_config.get('spacing', 0))
            layout.setContentsMargins(*layout_config.get('margins', [0, 0, 0, 0]))
            
            parent_widget.setLayout(layout)
            return layout
        
        return None

# Przykład użycia
def create_advanced_figma_button(text, style_name="main-button", parent=None):
    """Tworzy zaawansowany przycisk z animacją"""
    converter = AdvancedFigmaConverter()
    
    # Załaduj style CSS
    css_content = converter.load_css_variables(open('styl/figma_styles.css', 'r').read())
    
    button = QPushButton(text, parent)
    style = converter.create_advanced_style(style_name, css_content)
    button.setStyleSheet(style)
    
    # Dodaj animację
    converter.create_animated_widget(button, "fadeIn", 300)
    
    return button

"""
Menedżer pluginów Figma
Automatyzuje eksport z różnych pluginów Figma
"""
import os
import json
import subprocess
import requests
from pathlib import Path

class FigmaPluginsManager:
    """Menedżer pluginów Figma do automatycznego eksportu"""
    
    def __init__(self, figma_token=None):
        self.figma_token = figma_token
        self.supported_plugins = {
            'figma_to_html': {
                'name': 'Figma to HTML',
                'export_format': 'html',
                'file_extension': '.html'
            },
            'figma_to_react': {
                'name': 'Figma to React', 
                'export_format': 'react',
                'file_extension': '.jsx'
            },
            'figma_to_css': {
                'name': 'Figma to CSS',
                'export_format': 'css',
                'file_extension': '.css'
            },
            'figma_to_code': {
                'name': 'Figma to Code',
                'export_format': 'universal',
                'file_extension': '.html'
            }
        }
    
    def export_from_figma_api(self, file_key, node_id, plugin_type='figma_to_css'):
        """Eksportuje dane bezpośrednio z Figma API"""
        if not self.figma_token:
            print("❌ Brak tokenu Figma API")
            return None
        
        url = f"https://api.figma.com/v1/files/{file_key}/nodes"
        params = {
            'ids': node_id,
            'depth': 1
        }
        headers = {
            'X-Figma-Token': self.figma_token
        }
        
        try:
            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Błąd API Figma: {e}")
            return None
    
    def parse_figma_node(self, node_data):
        """Parsuje dane z Figma API i konwertuje na style CSS"""
        if 'nodes' not in node_data:
            return None
        
        node = list(node_data['nodes'].values())[0]['document']
        styles = self.extract_styles_from_node(node)
        return styles
    
    def extract_styles_from_node(self, node):
        """Wyciąga style z węzła Figma"""
        styles = {}
        
        if 'fills' in node:
            fills = node['fills']
            if fills and len(fills) > 0:
                fill = fills[0]
                if fill['type'] == 'SOLID':
                    styles['background-color'] = self.figma_color_to_hex(fill['color'])
        
        if 'strokes' in node:
            strokes = node['strokes']
            if strokes and len(strokes) > 0:
                stroke = strokes[0]
                if stroke['type'] == 'SOLID':
                    styles['border-color'] = self.figma_color_to_hex(stroke['color'])
                    styles['border-width'] = f"{node.get('strokeWeight', 1)}px"
                    styles['border-style'] = 'solid'
        
        if 'cornerRadius' in node:
            styles['border-radius'] = f"{node['cornerRadius']}px"
        
        if 'paddingLeft' in node:
            padding_values = [
                node.get('paddingTop', 0),
                node.get('paddingRight', 0), 
                node.get('paddingBottom', 0),
                node.get('paddingLeft', 0)
            ]
            styles['padding'] = f"{padding_values[0]}px {padding_values[1]}px {padding_values[2]}px {padding_values[3]}px"
        
        # Typography
        if 'style' in node:
            text_style = node['style']
            if 'fontFamily' in text_style:
                styles['font-family'] = f"'{text_style['fontFamily']}'"
            if 'fontSize' in text_style:
                styles['font-size'] = f"{text_style['fontSize']}px"
            if 'fontWeight' in text_style:
                styles['font-weight'] = str(text_style['fontWeight'])
            if 'textAlignHorizontal' in text_style:
                align_map = {
                    'LEFT': 'left',
                    'CENTER': 'center', 
                    'RIGHT': 'right',
                    'JUSTIFIED': 'justify'
                }
                styles['text-align'] = align_map.get(text_style['textAlignHorizontal'], 'left')
        
        return styles
    
    def figma_color_to_hex(self, color):
        """Konwertuje kolor Figma (0-1) na hex"""
        r = int(color['r'] * 255)
        g = int(color['g'] * 255)
        b = int(color['b'] * 255)
        return f"#{r:02x}{g:02x}{b:02x}"
    
    def generate_css_class(self, node_name, styles):
        """Generuje klasę CSS z stylów"""
        css_class = f".{node_name.lower().replace(' ', '-')} {{\n"
        
        for property_name, value in styles.items():
            css_class += f"    {property_name}: {value};\n"
        
        css_class += "}\n"
        return css_class
    
    def export_component_from_figma(self, file_key, node_id, component_name):
        """Eksportuje komponent z Figma i zapisuje jako CSS"""
        # Pobierz dane z Figma API
        node_data = self.export_from_figma_api(file_key, node_id)
        if not node_data:
            return False
        
        # Parsuj style
        styles = self.parse_figma_node(node_data)
        if not styles:
            return False
        
        # Generuj CSS
        css_class = self.generate_css_class(component_name, styles)
        
        # Zapisz do pliku
        css_file = f"styl/exported_{component_name.lower().replace(' ', '_')}.css"
        with open(css_file, 'w', encoding='utf-8') as f:
            f.write(f"/* Komponent {component_name} wyeksportowany z Figma */\n")
            f.write(css_class)
        
        print(f"✅ Wyeksportowano komponent '{component_name}' do {css_file}")
        return True
    
    def batch_export_components(self, components_config):
        """Eksportuje wiele komponentów na raz"""
        results = []
        
        for component in components_config:
            file_key = component['file_key']
            node_id = component['node_id']
            name = component['name']
            
            print(f"🔄 Eksportuję komponent: {name}")
            success = self.export_component_from_figma(file_key, node_id, name)
            results.append({
                'name': name,
                'success': success
            })
        
        return results
    
    def create_plugin_export_script(self):
        """Tworzy skrypt do automatycznego eksportu z pluginów Figma"""
        script_content = '''
# Skrypt automatycznego eksportu z Figma
# Uruchom w Figma po zainstalowaniu pluginów

# Lista komponentów do eksportu
COMPONENTS = [
    "main-button",
    "input-field", 
    "result-card",
    "form-label",
    "header-title"
]

# Funkcja eksportu
function exportComponents() {
    COMPONENTS.forEach(componentName => {
        // Znajdź komponent w Figma
        const component = figma.getNodeById(componentName);
        if (component) {
            // Eksportuj przez plugin
            figma.ui.postMessage({
                type: 'export',
                component: componentName,
                data: component
            });
        }
    });
}

// Uruchom eksport
exportComponents();
'''
        
        with open('styl/figma_export_script.js', 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        print("✅ Utworzono skrypt eksportu: styl/figma_export_script.js")

# Przykład konfiguracji komponentów
EXAMPLE_COMPONENTS_CONFIG = [
    {
        'name': 'Main Button',
        'file_key': 'YOUR_FIGMA_FILE_KEY',
        'node_id': '1:23'  # ID węzła w Figma
    },
    {
        'name': 'Input Field',
        'file_key': 'YOUR_FIGMA_FILE_KEY', 
        'node_id': '1:24'
    }
]

# Przykład użycia
def setup_figma_export():
    """Konfiguruje automatyczny eksport z Figma"""
    manager = FigmaPluginsManager(figma_token="YOUR_FIGMA_TOKEN")
    
    # Eksportuj pojedynczy komponent
    manager.export_component_from_figma(
        file_key="YOUR_FILE_KEY",
        node_id="1:23",
        component_name="Main Button"
    )
    
    # Eksportuj wiele komponentów
    results = manager.batch_export_components(EXAMPLE_COMPONENTS_CONFIG)
    
    # Utwórz skrypt eksportu
    manager.create_plugin_export_script()
    
    return results

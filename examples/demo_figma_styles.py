"""
Demo aplikacji z stylami Figma
Pokazuje jak używać stylów wyeksportowanych z Figma w aplikacji PyQt5
"""
import sys
import os
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QPushButton, QLineEdit, 
                             QTextEdit, QGroupBox, QFrame)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from styl.figma_integration import (create_figma_button, create_figma_input, 
                                   create_figma_label, create_figma_card,
                                   get_figma_button_style, get_figma_input_style)

class FigmaDemoApp(QMainWindow):
    """Demo aplikacji z stylami Figma"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("🎨 Demo Stylów Figma - Aplikacja Nart")
        self.setGeometry(100, 100, 1000, 700)
        self.setup_ui()
        
    def setup_ui(self):
        """Konfiguruje interfejs demo"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Główny layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setSpacing(20)
        main_layout.setContentsMargins(20, 20, 20, 20)
        
        # Nagłówek
        header = self.create_header()
        main_layout.addWidget(header)
        
        # Formularz
        form_section = self.create_form_section()
        main_layout.addWidget(form_section)
        
        # Przyciski
        buttons_section = self.create_buttons_section()
        main_layout.addWidget(buttons_section)
        
        # Karty wyników
        results_section = self.create_results_section()
        main_layout.addWidget(results_section)
        
    def create_header(self):
        """Tworzy nagłówek z logo"""
        header_frame = QFrame()
        header_frame.setStyleSheet("""
            QFrame {
                background-color: #007AFF;
                border-radius: 12px;
                padding: 20px;
            }
        """)
        
        layout = QHBoxLayout(header_frame)
        
        # Logo
        logo_label = QLabel("⛷️")
        logo_label.setFont(QFont("Segoe UI", 48))
        logo_label.setStyleSheet("""
            QLabel {
                background-color: white;
                border-radius: 50px;
                padding: 10px;
                min-width: 80px;
                max-width: 80px;
                min-height: 80px;
                max-height: 80px;
            }
        """)
        logo_label.setAlignment(Qt.AlignCenter)
        
        # Tekst
        title_label = QLabel("NARTY POZNAŃ")
        title_label.setFont(QFont("Inter", 24, QFont.Bold))
        title_label.setStyleSheet("color: white;")
        
        subtitle_label = QLabel("Asystent Doboru Nart v6.0")
        subtitle_label.setFont(QFont("Inter", 14))
        subtitle_label.setStyleSheet("color: rgba(255,255,255,0.8);")
        
        text_layout = QVBoxLayout()
        text_layout.addWidget(title_label)
        text_layout.addWidget(subtitle_label)
        
        layout.addWidget(logo_label)
        layout.addLayout(text_layout)
        layout.addStretch()
        
        return header_frame
        
    def create_form_section(self):
        """Tworzy sekcję formularza"""
        group = QGroupBox("📝 Dane Klienta")
        group.setFont(QFont("Inter", 16, QFont.Bold))
        group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 2px solid #E5E5EA;
                border-radius: 12px;
                margin-top: 10px;
                padding-top: 15px;
                background-color: #F8F9FA;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 15px;
                padding: 0 10px 0 10px;
                color: #007AFF;
            }
        """)
        
        layout = QVBoxLayout(group)
        layout.setSpacing(15)
        
        # Wzrost
        wzrost_layout = QHBoxLayout()
        wzrost_label = create_figma_label("📏 Wzrost (cm):")
        wzrost_input = create_figma_input("Wprowadź wzrost...")
        wzrost_input.setFixedWidth(200)
        wzrost_layout.addWidget(wzrost_label)
        wzrost_layout.addWidget(wzrost_input)
        wzrost_layout.addStretch()
        
        # Waga
        waga_layout = QHBoxLayout()
        waga_label = create_figma_label("⚖️ Waga (kg):")
        waga_input = create_figma_input("Wprowadź wagę...")
        waga_input.setFixedWidth(200)
        waga_layout.addWidget(waga_label)
        waga_layout.addWidget(waga_input)
        waga_layout.addStretch()
        
        # Poziom
        poziom_layout = QHBoxLayout()
        poziom_label = create_figma_label("🎯 Poziom (1-6):")
        poziom_input = create_figma_input("1-6")
        poziom_input.setFixedWidth(100)
        poziom_layout.addWidget(poziom_label)
        poziom_layout.addWidget(poziom_input)
        poziom_layout.addStretch()
        
        # Płeć
        plec_layout = QHBoxLayout()
        plec_label = create_figma_label("👤 Płeć:")
        plec_input = create_figma_input("M/K/U")
        plec_input.setFixedWidth(100)
        plec_layout.addWidget(plec_label)
        plec_layout.addWidget(plec_input)
        plec_layout.addStretch()
        
        layout.addLayout(wzrost_layout)
        layout.addLayout(waga_layout)
        layout.addLayout(poziom_layout)
        layout.addLayout(plec_layout)
        
        return group
        
    def create_buttons_section(self):
        """Tworzy sekcję przycisków"""
        group = QGroupBox("🎛️ Akcje")
        group.setFont(QFont("Inter", 16, QFont.Bold))
        group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 2px solid #E5E5EA;
                border-radius: 12px;
                margin-top: 10px;
                padding-top: 15px;
                background-color: #F8F9FA;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 15px;
                padding: 0 10px 0 10px;
                color: #007AFF;
            }
        """)
        
        layout = QVBoxLayout(group)
        
        # Pierwszy rząd przycisków
        row1 = QHBoxLayout()
        row1.addWidget(create_figma_button("🔍 Znajdź Narty", "success"))
        row1.addWidget(create_figma_button("🗑️ Wyczyść", "warning"))
        row1.addStretch()
        
        # Drugi rząd przycisków
        row2 = QHBoxLayout()
        row2.addWidget(create_figma_button("📋 Przeglądaj", "primary"))
        row2.addWidget(create_figma_button("📅 Rezerwacje", "secondary"))
        row2.addStretch()
        
        layout.addLayout(row1)
        layout.addLayout(row2)
        
        return group
        
    def create_results_section(self):
        """Tworzy sekcję wyników"""
        group = QGroupBox("🔍 Wyniki Doboru")
        group.setFont(QFont("Inter", 16, QFont.Bold))
        group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 2px solid #007AFF;
                border-radius: 12px;
                margin-top: 10px;
                padding-top: 15px;
                background-color: #007AFF;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 15px;
                padding: 0 10px 0 10px;
                color: white;
            }
        """)
        
        layout = QVBoxLayout(group)
        
        # Karty wyników
        cards_layout = QHBoxLayout()
        
        # Karta 1 - Idealne dopasowanie
        card1 = create_figma_card()
        card1.setFixedSize(300, 150)
        card1_layout = QVBoxLayout(card1)
        card1_layout.setContentsMargins(20, 20, 20, 20)
        
        title1 = QLabel("✅ IDEALNE DOPASOWANIE")
        title1.setFont(QFont("Inter", 14, QFont.Bold))
        title1.setStyleSheet("color: #34C759; margin-bottom: 10px;")
        
        desc1 = QLabel("Rossignol Hero Elite\n165 cm\nPoziom: 4-5")
        desc1.setFont(QFont("Inter", 12))
        desc1.setStyleSheet("color: #666; line-height: 1.4;")
        
        card1_layout.addWidget(title1)
        card1_layout.addWidget(desc1)
        card1_layout.addStretch()
        
        # Karta 2 - Alternatywa
        card2 = create_figma_card()
        card2.setFixedSize(300, 150)
        card2_layout = QVBoxLayout(card2)
        card2_layout.setContentsMargins(20, 20, 20, 20)
        
        title2 = QLabel("⚠️ ALTERNATYWA")
        title2.setFont(QFont("Inter", 14, QFont.Bold))
        title2.setStyleSheet("color: #FF9500; margin-bottom: 10px;")
        
        desc2 = QLabel("Atomic Vantage 90\n170 cm\nPoziom: 3-4")
        desc2.setFont(QFont("Inter", 12))
        desc2.setStyleSheet("color: #666; line-height: 1.4;")
        
        card2_layout.addWidget(title2)
        card2_layout.addWidget(desc2)
        card2_layout.addStretch()
        
        # Karta 3 - Poziom za niski
        card3 = create_figma_card()
        card3.setFixedSize(300, 150)
        card3_layout = QVBoxLayout(card3)
        card3_layout.setContentsMargins(20, 20, 20, 20)
        
        title3 = QLabel("🟡 POZIOM ZA NISKI")
        title3.setFont(QFont("Inter", 14, QFont.Bold))
        title3.setStyleSheet("color: #FFCC00; margin-bottom: 10px;")
        
        desc3 = QLabel("Salomon QST 106\n175 cm\nPoziom: 5-6")
        desc3.setFont(QFont("Inter", 12))
        desc3.setStyleSheet("color: #666; line-height: 1.4;")
        
        card3_layout.addWidget(title3)
        card3_layout.addWidget(desc3)
        card3_layout.addStretch()
        
        cards_layout.addWidget(card1)
        cards_layout.addWidget(card2)
        cards_layout.addWidget(card3)
        
        layout.addLayout(cards_layout)
        
        return group

def main():
    """Uruchamia demo aplikacji"""
    app = QApplication(sys.argv)
    
    # Ustawienia aplikacji
    app.setApplicationName("Demo Stylów Figma")
    app.setApplicationVersion("1.0")
    
    # Ustaw font Inter (jeśli dostępny)
    font = QFont("Inter", 10)
    app.setFont(font)
    
    # Stwórz i pokaż okno
    window = FigmaDemoApp()
    window.show()
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()

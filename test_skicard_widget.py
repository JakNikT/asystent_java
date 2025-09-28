#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test klasy SkiCardWidget - izolowany test przed integracją
"""

import sys
import os
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QPushButton, QTextBrowser,
                             QFrame, QGroupBox, QScrollArea, QGridLayout)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

class SkiCardWidget(QFrame):
    """Widget karty nart - na podstawie test_karty_nart.py"""
    
    def __init__(self, narta_info, klient_data, parent=None):
        super().__init__(parent)
        self.narta_info = narta_info
        self.klient_data = klient_data
        self.setup_ui()
    
    def setup_ui(self):
        """Tworzy UI karty nart"""
        # ========== GŁÓWNA KARTA NART (467x131px) ==========
        self.setObjectName("karta_nart")
        self.setFixedSize(467, 131)  # 467x131px
        self.setStyleSheet("""
            QFrame#karta_nart {
                background: #194576;
                border-radius: 20px;
                border: none;
            }
        """)
        
        # Pobierz dane
        dane = self.narta_info.get('dane', {})
        
        marka = dane.get('MARKA', 'N/A')
        model = dane.get('MODEL', 'N/A')
        dlugosc = dane.get('DLUGOSC', 'N/A')
        poziom = dane.get('POZIOM', 'N/A')
        plec = dane.get('PLEC', 'N/A')
        waga_min = dane.get('WAGA_MIN', 'N/A')
        waga_max = dane.get('WAGA_MAX', 'N/A')
        wzrost_min = dane.get('WZROST_MIN', 'N/A')
        wzrost_max = dane.get('WZROST_MAX', 'N/A')
        
        # Dane klienta
        klient_wzrost = self.klient_data.get('wzrost', 'N/A')
        klient_waga = self.klient_data.get('waga', 'N/A')
        klient_poziom = self.klient_data.get('poziom', 'N/A')
        klient_plec = self.klient_data.get('plec', 'N/A')
        
        # ========== NAZWA NART (404x30px, pozycja 32,7) ==========
        nazwa_nart = QLabel(f"{marka} {model} ({dlugosc}cm)")
        nazwa_nart.setObjectName("nazwa_nart")
        nazwa_nart.setFixedSize(404, 30)  # 404x30px
        nazwa_nart.move(32, 7)  # left: 32px, top: 7px względem karta_nart
        nazwa_nart.setParent(self)
        nazwa_nart.setAlignment(Qt.AlignCenter)
        nazwa_nart.setStyleSheet("""
            QLabel#nazwa_nart {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 15px;
                color: #012B5A;
                font-size: 14px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        # ========== POLE INFORMACJI O NARTACH (200x19px, pozycja 10,43) ==========
        info_narty_pole = QLabel("🟩1 🟩2 🟩3 🟩4 🟩5 🟩6")
        info_narty_pole.setObjectName("info_narty_pole")
        info_narty_pole.setFixedSize(200, 19)  # 200x19px
        info_narty_pole.move(10, 43)  # left: 10px, top: 43px względem karta_nart
        info_narty_pole.setParent(self)
        info_narty_pole.setAlignment(Qt.AlignCenter)
        info_narty_pole.setStyleSheet("""
            QLabel#info_narty_pole {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 2px 5px;
            }
        """)
        
        # ========== IKONKA KALENDARZA (25x19px, pozycja 215,43) ==========
        kalendarz_ikonka = QLabel("📅")
        kalendarz_ikonka.setObjectName("kalendarz_ikonka")
        kalendarz_ikonka.setFixedSize(25, 19)  # 25x19px
        kalendarz_ikonka.move(215, 43)  # left: 215px, top: 43px względem karta_nart
        kalendarz_ikonka.setParent(self)
        kalendarz_ikonka.setAlignment(Qt.AlignCenter)
        kalendarz_ikonka.setStyleSheet("""
            QLabel#kalendarz_ikonka {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 14px;
                font-weight: bold;
                padding: 2px 5px;
            }
        """)
        
        # ========== NAPIS PRZEZNACZENIA (pozycja 13,65) - NAD DOPASOWANIEM ==========
        przeznaczenie = dane.get('PRZEZNACZENIE', 'N/A')
        if przeznaczenie != 'N/A':
            przeznaczenie_text = f"Przeznaczenie:\n{przeznaczenie}"
        else:
            przeznaczenie_text = "Przeznaczenie:\nUniwersalne"
            
        przeznaczenie_label = QLabel(przeznaczenie_text)
        przeznaczenie_label.setObjectName("przeznaczenie_label")
        przeznaczenie_label.move(13, 65)  # left: 13px, top: 65px względem karta_nart (nad dopasowaniem)
        przeznaczenie_label.setParent(self)
        przeznaczenie_label.setStyleSheet("""
            QLabel#przeznaczenie_label {
                color: #B3B1B1;
                font-family: 'ADLaM Display', 'Segoe UI', 'Arial', sans-serif;
                font-size: 16px;
                font-weight: 400;
                background-color: transparent;
                border: none;
                padding: 0px;
            }
        """)
        
        # ========== DOPASOWANIE W % (pozycja 13,108) - LEWY DOLNY RÓG ==========
        dopasowanie = self.narta_info.get('dopasowanie', 0)
        dopasowanie_text = f"Dopasowanie: {dopasowanie}%"
        dopasowanie_label = QLabel(dopasowanie_text)
        dopasowanie_label.setObjectName("dopasowanie_label")
        dopasowanie_label.move(13, 108)  # left: 13px, top: 108px względem karta_nart (lewy dolny róg)
        dopasowanie_label.setParent(self)
        dopasowanie_label.setStyleSheet("""
            QLabel#dopasowanie_label {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI', 'Arial', sans-serif;
                font-size: 14px;
                font-weight: bold;
                background-color: transparent;
                border: none;
                padding: 0px;
            }
        """)
        
        # ========== NAPIS "WAGA:" (pozycja 240,45) ==========
        waga_label = QLabel("Waga:")
        waga_label.setObjectName("waga_label")
        waga_label.setFixedSize(90, 15)  # 90x15px
        waga_label.move(240, 45)  # left: 240px, top: 45px względem karta_nart
        waga_label.setParent(self)
        waga_label.setAlignment(Qt.AlignCenter)
        waga_label.setStyleSheet("""
            QLabel#waga_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
                padding: 0px;
            }
        """)
        
        # ========== POLE WAGI (90x18px, pozycja 240,60) ==========
        waga_text = f"{waga_min}-{waga_max}/{klient_waga}"
        waga_pole = QLabel(waga_text)
        waga_pole.setObjectName("waga_pole")
        waga_pole.setFixedSize(90, 18)  # 90x18px
        waga_pole.move(240, 60)  # left: 240px, top: 60px względem karta_nart
        waga_pole.setParent(self)
        waga_pole.setAlignment(Qt.AlignCenter)
        waga_pole.setStyleSheet("""
            QLabel#waga_pole {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }
        """)
        
        # ========== NAPIS "POZIOM:" (pozycja 357,45) ==========
        poziom_label = QLabel("Poziom:")
        poziom_label.setObjectName("poziom_label")
        poziom_label.setFixedSize(65, 15)  # 65x15px
        poziom_label.move(357, 45)  # left: 357px, top: 45px względem karta_nart
        poziom_label.setParent(self)
        poziom_label.setAlignment(Qt.AlignCenter)
        poziom_label.setStyleSheet("""
            QLabel#poziom_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
                padding: 0px;
            }
        """)
        
        # ========== POLE POZIOMU (65x18px, pozycja 357,60) ==========
        poziom_text = f"{poziom}/{klient_poziom}"
        poziom_pole = QLabel(poziom_text)
        poziom_pole.setObjectName("poziom_pole")
        poziom_pole.setFixedSize(65, 18)  # 65x18px
        poziom_pole.move(357, 60)  # left: 357px, top: 60px względem karta_nart
        poziom_pole.setParent(self)
        poziom_pole.setAlignment(Qt.AlignCenter)
        poziom_pole.setStyleSheet("""
            QLabel#poziom_pole {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }
        """)
        
        # ========== NAPIS "WZROST" (pozycja 220,86) ==========
        wzrost_label = QLabel("Wzrost")
        wzrost_label.setObjectName("wzrost_label")
        wzrost_label.setFixedSize(110, 15)  # 110x15px
        wzrost_label.move(220, 86)  # left: 220px, top: 86px względem karta_nart
        wzrost_label.setParent(self)
        wzrost_label.setAlignment(Qt.AlignCenter)
        wzrost_label.setStyleSheet("""
            QLabel#wzrost_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
                padding: 0px;
            }
        """)
        
        # ========== POLE WZROSTU (110x18px, pozycja 220,101) ==========
        wzrost_text = f"{wzrost_min}-{wzrost_max}/{klient_wzrost} cm"
        wzrost_pole = QLabel(wzrost_text)
        wzrost_pole.setObjectName("wzrost_pole")
        wzrost_pole.setFixedSize(110, 18)  # 110x18px
        wzrost_pole.move(220, 101)  # left: 220px, top: 101px względem karta_nart
        wzrost_pole.setParent(self)
        wzrost_pole.setAlignment(Qt.AlignCenter)
        wzrost_pole.setStyleSheet("""
            QLabel#wzrost_pole {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }
        """)
        
        # ========== NAPIS "PŁEĆ:" (pozycja 344,86) ==========
        plec_label = QLabel("Płeć:")
        plec_label.setObjectName("plec_label")
        plec_label.setFixedSize(110, 15)  # 110x15px
        plec_label.move(344, 86)  # left: 344px, top: 86px względem karta_nart
        plec_label.setParent(self)
        plec_label.setAlignment(Qt.AlignCenter)
        plec_label.setStyleSheet("""
            QLabel#plec_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
                padding: 0px;
            }
        """)
        
        # ========== POLE PŁCI (110x18px, pozycja 344,101) ==========
        plec_text = f"{plec}/{klient_plec}"
        plec_pole = QLabel(plec_text)
        plec_pole.setObjectName("plec_pole")
        plec_pole.setFixedSize(110, 18)  # 110x18px
        plec_pole.move(344, 101)  # left: 344px, top: 101px względem karta_nart
        plec_pole.setParent(self)
        plec_pole.setAlignment(Qt.AlignCenter)
        plec_pole.setStyleSheet("""
            QLabel#plec_pole {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }
        """)


class TestSkiCardWidget(QMainWindow):
    """Okno testowe dla klasy SkiCardWidget"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Test SkiCardWidget")
        self.setGeometry(100, 100, 1000, 600)
        
        # Centralny widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Główny layout
        main_layout = QVBoxLayout(central_widget)
        
        # Tytuł
        title = QLabel("🧪 TEST SKICARDWIDGET")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("font-size: 24px; font-weight: bold; color: #0b4da2; margin: 20px;")
        main_layout.addWidget(title)
        
        # Scroll area z siatką kart
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        
        # Kontener dla kart
        container = QWidget()
        grid_layout = QGridLayout(container)
        grid_layout.setSpacing(20)
        
        # Test danych
        test_data = [
            {
                'dane': {
                    'MARKA': 'Rossignol',
                    'MODEL': 'Hero Elite',
                    'DLUGOSC': '170',
                    'POZIOM': '5-6',
                    'PLEC': 'M',
                    'WAGA_MIN': '150',
                    'WAGA_MAX': '170',
                    'WZROST_MIN': '155',
                    'WZROST_MAX': '170',
                    'PRZEZNACZENIE': 'All-Mountain'
                },
                'dopasowanie': 95.5
            },
            {
                'dane': {
                    'MARKA': 'Salomon',
                    'MODEL': 'QST 99',
                    'DLUGOSC': '180',
                    'POZIOM': '3-4',
                    'PLEC': 'M',
                    'WAGA_MIN': '75',
                    'WAGA_MAX': '90',
                    'WZROST_MIN': '165',
                    'WZROST_MAX': '180',
                    'PRZEZNACZENIE': 'Freeride'
                },
                'dopasowanie': 78.2
            }
        ]
        
        klient_data = {
            'wzrost': '176',
            'waga': '75',
            'poziom': '4',
            'plec': 'M'
        }
        
        # Dodaj karty do siatki
        for idx, narta_info in enumerate(test_data):
            try:
                karta = SkiCardWidget(narta_info, klient_data)
                grid_layout.addWidget(karta, idx // 2, idx % 2)
                print(f"✅ Karta {idx+1} utworzona pomyślnie")
            except Exception as e:
                print(f"❌ Błąd tworzenia karty {idx+1}: {e}")
        
        scroll_area.setWidget(container)
        main_layout.addWidget(scroll_area)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TestSkiCardWidget()
    window.show()
    sys.exit(app.exec_())

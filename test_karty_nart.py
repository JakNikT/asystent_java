#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Testowy plik do testowania wyglądu kart nart
Kopia frame'a wyników z głównej aplikacji
"""

import sys
import os
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QPushButton, QTextBrowser,
                             QFrame, QGroupBox, QScrollArea)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

# Dodaj ścieżkę do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

class TestKartyNart(QMainWindow):
    """Okno testowe do testowania wyglądu kart nart"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Test Karty Nart - Wygląd")
        self.setGeometry(100, 100, 1200, 800)
        
        # Centralny widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Główny layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        # Tytuł
        title = QLabel("🧪 TEST WYGLĄDU KART NART")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("""
            font-size: 24px;
            font-weight: bold;
            color: #0b4da2;
            margin: 10px 0;
            padding: 15px;
            background: linear-gradient(135deg, #e8f4fd, #f0f8ff);
            border: 2px solid #0b4da2;
            border-radius: 10px;
        """)
        main_layout.addWidget(title)
        
        # Przyciski testowe
        button_layout = QHBoxLayout()
        
        self.btn_test_idealne = QPushButton("🎯 Test Idealne")
        self.btn_test_idealne.clicked.connect(self.test_idealne)
        self.btn_test_idealne.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                border: 2px solid #45a049;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 10px 20px;
                margin: 5px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        
        self.btn_test_poziom = QPushButton("🟡 Test Poziom Za Nisko")
        self.btn_test_poziom.clicked.connect(self.test_poziom_za_nisko)
        self.btn_test_poziom.setStyleSheet("""
            QPushButton {
                background-color: #FF9800;
                border: 2px solid #F57C00;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 10px 20px;
                margin: 5px;
            }
            QPushButton:hover {
                background-color: #F57C00;
            }
        """)
        
        self.btn_test_alternatywy = QPushButton("⚠️ Test Alternatywy")
        self.btn_test_alternatywy.clicked.connect(self.test_alternatywy)
        self.btn_test_alternatywy.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                border: 2px solid #1976D2;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 10px 20px;
                margin: 5px;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        
        self.btn_test_inna_plec = QPushButton("👥 Test Inna Płeć")
        self.btn_test_inna_plec.clicked.connect(self.test_inna_plec)
        self.btn_test_inna_plec.setStyleSheet("""
            QPushButton {
                background-color: #9C27B0;
                border: 2px solid #7B1FA2;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 10px 20px;
                margin: 5px;
            }
            QPushButton:hover {
                background-color: #7B1FA2;
            }
        """)
        
        self.btn_kopiuj_wzor = QPushButton("📋 Kopiuj Wzór")
        self.btn_kopiuj_wzor.clicked.connect(self.kopiuj_wzor)
        self.btn_kopiuj_wzor.setStyleSheet("""
            QPushButton {
                background-color: #FF5722;
                border: 2px solid #E64A19;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 10px 20px;
                margin: 5px;
            }
            QPushButton:hover {
                background-color: #E64A19;
            }
        """)
        
        button_layout.addWidget(self.btn_test_idealne)
        button_layout.addWidget(self.btn_test_poziom)
        button_layout.addWidget(self.btn_test_alternatywy)
        button_layout.addWidget(self.btn_test_inna_plec)
        button_layout.addWidget(self.btn_kopiuj_wzor)
        button_layout.addStretch()
        
        main_layout.addLayout(button_layout)
        
        # ========== KOPIA FRAME'A WYNIKÓW ==========
        # Frame wyniki (kopia z głównej aplikacji)
        wyniki_frame = self.create_wyniki_frame()
        main_layout.addWidget(wyniki_frame)
        
        # Karta nart jest już widoczna
    
    def create_wyniki_frame(self):
        """Tworzy frame wyników - dokładna kopia z głównej aplikacji"""
        # ========== FRAME WYNIKI (1100x669px) - DOKŁADNA KOPIA ==========
        wyniki = QFrame()
        wyniki.setObjectName("wyniki")
        wyniki.setFixedSize(1100, 669)  # 1100x669px - dokładnie jak w głównej aplikacji
        wyniki.setStyleSheet("""
            QFrame#wyniki {
                background-color: #386BB2;
                border: none;
            }
        """)
        
        # ========== POLE WYNIKÓW (1062x625px, pozycja 19,44) - DOKŁADNA KOPIA ==========
        wyniki_pole = QFrame()
        wyniki_pole.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border-top-left-radius: 0px;
                border-top-right-radius: 20px;
                border-bottom-right-radius: 20px;
                border-bottom-left-radius: 20px;
                border: none;
            }
        """)
        wyniki_pole.setFixedSize(1062, 625)  # 1062x625px - dokładnie jak w głównej aplikacji
        wyniki_pole.move(19, 44)  # left: 19px, top: 44px - dokładnie jak w głównej aplikacji
        wyniki_pole.setParent(wyniki)
        
        # Layout dla pola wyników (flex-direction: row, align-items: flex-start)
        wyniki_layout = QHBoxLayout(wyniki_pole)
        wyniki_layout.setContentsMargins(8, 8, 8, 8)  # padding: 8px
        wyniki_layout.setSpacing(10)  # gap: 10px
        wyniki_layout.setAlignment(Qt.AlignTop)  # align-items: flex-start
        
        # ========== FRAME 6 (1046x605px) - DOKŁADNA KOPIA ==========
        frame6 = QFrame()
        frame6.setObjectName("frame6")
        frame6.setStyleSheet("""
            QFrame {
                background-color: #A6C2EF;
                border-radius: 20px;
                border: none;
            }
        """)
        frame6.setFixedSize(1046, 605)  # 1046x605px - dokładnie jak w głównej aplikacji
        
        # Dodaj layout do frame6
        frame6_layout = QVBoxLayout(frame6)
        frame6_layout.setContentsMargins(10, 10, 10, 10)
        frame6_layout.setSpacing(5)
        
        # Dodaj tytuł "Wyniki wyszukiwania"
        tytul_label = QLabel("Wyniki wyszukiwania")
        tytul_label.setStyleSheet("""
            QLabel {
                color: #012B5A;
                font-size: 18px;
                font-weight: bold;
                background-color: transparent;
                border: none;
                padding: 5px;
            }
        """)
        frame6_layout.addWidget(tytul_label)
        
        # ========== KARTA NART (467x131px, pozycja 36,32) - WZGLĘDEM FRAME 6 ==========
        karta_nart = QFrame()
        karta_nart.setObjectName("karta_nart")
        karta_nart.setFixedSize(467, 131)  # 467x131px
        karta_nart.move(36, 32)  # left: 36px, top: 32px względem frame 6
        karta_nart.setParent(frame6)
        karta_nart.setStyleSheet("""
            QFrame#karta_nart {
                background: #194576;
                border-radius: 20px;
                border: none;
            }
        """)
        
        # ========== NAZWA NART (404x30px, pozycja 32,7) - WZGLĘDEM KARTA NART ==========
        nazwa_nart = QLabel("Rossignol Hero Elite")
        nazwa_nart.setObjectName("nazwa_nart")
        nazwa_nart.setFixedSize(404, 30)  # 404x30px
        nazwa_nart.move(32, 7)  # left: 32px, top: 7px względem karta_nart
        nazwa_nart.setParent(karta_nart)
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
        
        # ========== POLE INFORMACJI O NARTACH (200x19px, pozycja 10,43) - WZGLĘDEM KARTA NART ==========
        # Przykładowe dane - w rzeczywistej aplikacji będą pobierane z bazy danych
        ilosc = 6  # Przykładowa liczba sztuk
        # Symulacja rezerwacji - sztuki 2 i 4 są zarezerwowane
        zarezerwowane = {2: "2025-01-15 - 2025-01-20", 4: "2025-01-18 - 2025-01-22"}
        
        # Stwórz kontener dla znaczków
        info_container = QFrame()
        info_container.setObjectName("info_container")
        info_container.setFixedSize(200, 19)  # 200x19px
        info_container.move(10, 43)  # left: 10px, top: 43px względem karta_nart
        info_container.setParent(karta_nart)
        info_container.setStyleSheet("""
            QFrame#info_container {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
            }
        """)
        
        # Stwórz layout poziomy dla znaczków
        from PyQt5.QtWidgets import QHBoxLayout
        layout = QHBoxLayout(info_container)
        layout.setContentsMargins(5, 2, 5, 2)
        layout.setSpacing(3)
        
        # Dodaj każdy znaczek jako osobny QLabel z tooltipem
        for i in range(1, ilosc + 1):
            if i in zarezerwowane:
                # Czerwony znaczek z tooltipem
                square = QLabel(f"🔴{i}")
                square.setToolTip(f"Zarezerwowana: {zarezerwowane[i]}")
                square.setStyleSheet("""
                    QLabel {
                        color: #012B5A;
                        font-size: 12px;
                        font-weight: bold;
                        background: transparent;
                        border: none;
                    }
                """)
            else:
                # Zielony znaczek
                square = QLabel(f"🟩{i}")
                square.setToolTip(f"Dostępna")
                square.setStyleSheet("""
                    QLabel {
                        color: #012B5A;
                        font-size: 12px;
                        font-weight: bold;
                        background: transparent;
                        border: none;
                    }
                """)
            
            layout.addWidget(square)
        
        # Dodaj rozciągnięcie na końcu
        layout.addStretch()
        
        # ========== IKONKA KALENDARZA (25x19px, pozycja 215,43) - WZGLĘDEM KARTA NART ==========
        kalendarz_ikonka = QLabel("📅")
        kalendarz_ikonka.setObjectName("kalendarz_ikonka")
        kalendarz_ikonka.setFixedSize(25, 19)  # 25x19px
        kalendarz_ikonka.move(215, 43)  # left: 215px, top: 43px względem karta_nart (przesunięte w lewo)
        kalendarz_ikonka.setParent(karta_nart)
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
        # TODO: Dodać funkcjonalność kliknięcia i okno z rezerwacjami
        
        # ========== NAPIS "WAGA:" (pozycja 285,45) - WZGLĘDEM KARTA NART ==========
        waga_label = QLabel("Waga:")
        waga_label.setObjectName("waga_label")
        waga_label.setFixedSize(90, 15)  # 90x15px - taka sama szerokość jak pole
        waga_label.move(240, 45)  # left: 240px, top: 45px względem karta_nart (wyśrodkowane nad polem wagi)
        waga_label.setParent(karta_nart)
        waga_label.setAlignment(Qt.AlignCenter)  # wyśrodkowanie tekstu
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
        
        # ========== POLE WAGI (90x18px, pozycja 240,60) - WZGLĘDEM KARTA NART ==========
        waga_pole = QLabel("150-170/165")
        waga_pole.setObjectName("waga_pole")
        waga_pole.setFixedSize(90, 18)  # 90x18px - rozszerzone
        waga_pole.move(240, 60)  # left: 240px, top: 60px względem karta_nart
        waga_pole.setParent(karta_nart)
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
        
        # ========== NAPIS "POZIOM:" (pozycja 357,45) - WZGLĘDEM KARTA NART ==========
        poziom_label = QLabel("Poziom:")
        poziom_label.setObjectName("poziom_label")
        poziom_label.setFixedSize(65, 15)  # 65x15px - taka sama szerokość jak pole
        poziom_label.move(357, 45)  # left: 357px, top: 45px względem karta_nart (wyśrodkowane nad polem poziomu)
        poziom_label.setParent(karta_nart)
        poziom_label.setAlignment(Qt.AlignCenter)  # wyśrodkowanie tekstu
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
        
        # ========== POLE POZIOMU (65x18px, pozycja 357,60) - WZGLĘDEM KARTA NART ==========
        poziom_pole = QLabel("5D/5D")
        poziom_pole.setObjectName("poziom_pole")
        poziom_pole.setFixedSize(65, 18)  # 65x18px
        poziom_pole.move(357, 60)  # left: 357px, top: 60px względem karta_nart
        poziom_pole.setParent(karta_nart)
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
        
        # ========== NAPIS "WZROST" (pozycja 220,86) - WZGLĘDEM KARTA NART ==========
        wzrost_label = QLabel("Wzrost")
        wzrost_label.setObjectName("wzrost_label")
        wzrost_label.setFixedSize(110, 15)  # 110x15px - taka sama szerokość jak pole
        wzrost_label.move(220, 86)  # left: 220px, top: 86px względem karta_nart (wyśrodkowane nad polem wzrostu)
        wzrost_label.setParent(karta_nart)
        wzrost_label.setAlignment(Qt.AlignCenter)  # wyśrodkowanie tekstu
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
        
        # ========== POLE WZROSTU (110x18px, pozycja 220,101) - WZGLĘDEM KARTA NART ==========
        wzrost_pole = QLabel("155-170/165 cm")
        wzrost_pole.setObjectName("wzrost_pole")
        wzrost_pole.setFixedSize(110, 18)  # 110x18px - jeszcze bardziej rozszerzone
        wzrost_pole.move(220, 101)  # left: 220px, top: 101px względem karta_nart
        wzrost_pole.setParent(karta_nart)
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
        
        # ========== NAPIS "PŁEĆ:" (pozycja 344,86) - WZGLĘDEM KARTA NART ==========
        plec_label = QLabel("Płeć:")
        plec_label.setObjectName("plec_label")
        plec_label.setFixedSize(110, 15)  # 110x15px - taka sama szerokość jak pole
        plec_label.move(344, 86)  # left: 344px, top: 86px względem karta_nart (wyśrodkowane nad polem płeć)
        plec_label.setParent(karta_nart)
        plec_label.setAlignment(Qt.AlignCenter)  # wyśrodkowanie tekstu
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
        
        # ========== POLE PŁCI (110x18px, pozycja 344,101) - WZGLĘDEM KARTA NART ==========
        plec_pole = QLabel("Damksa/Kobieta")
        plec_pole.setObjectName("plec_pole")
        plec_pole.setFixedSize(110, 18)  # 110x18px - rozszerzone
        plec_pole.move(344, 101)  # left: 344px, top: 101px względem karta_nart
        plec_pole.setParent(karta_nart)
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
        
        # ========== NAPIS PRZEZNACZENIA (pozycja 13,65) - WZGLĘDEM KARTA NART ==========
        przeznaczenie_label = QLabel("Przeznaczenie:\nSlalom/Cały dzień")
        przeznaczenie_label.setObjectName("przeznaczenie_label")
        przeznaczenie_label.move(13, 65)  # left: 13px, top: 65px względem karta_nart (wyżej)
        przeznaczenie_label.setParent(karta_nart)
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
        
        # ========== NAPIS DOPASOWANIA (pozycja 13,108) - WZGLĘDEM KARTA NART ==========
        dopasowanie_label = QLabel("Dopasowanie: 95,5%")
        dopasowanie_label.setObjectName("dopasowanie_label")
        dopasowanie_label.move(13, 108)  # left: 13px, top: 108px względem karta_nart (niżej)
        dopasowanie_label.setParent(karta_nart)
        dopasowanie_label.setStyleSheet("""
            QLabel#dopasowanie_label {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI', 'Arial', sans-serif;
                font-size: 14px;
                font-weight: 400;
                background-color: transparent;
                border: none;
                padding: 0px;
            }
        """)
        
        # ========== FRAME 8 (467x131px, pozycja 543,32) - DRUGA KARTA ==========
        frame8 = QFrame()
        frame8.setObjectName("frame8")
        frame8.setFixedSize(467, 131)  # 467x131px
        frame8.move(543, 32)  # left: 543px, top: 32px względem frame 6
        frame8.setParent(frame6)
        frame8.setStyleSheet("""
            QFrame#frame8 {
                background: #194576;
                border-radius: 20px;
                border: none;
            }
        """)
        
        # Dodaj Frame 6 do layoutu (flex: none, order: 0, flex-grow: 1)
        wyniki_layout.addWidget(frame6, 1)  # flex-grow: 1
        
        return wyniki
    
    def test_idealne(self):
        """Test jednej karty idealnego dopasowania - WZÓR DO KOPIOWANIA"""
        # JEDNA KARTA - WZÓR DO PROJEKTOWANIA
        idealne_data = [
            {
                'dane': {
                    'MARKA': 'Rossignol',
                    'MODEL': 'Hero Elite',
                    'DLUGOSC': '170',
                    'ILOSC': '4',  # 4 sztuki nart
                    'POZIOM': '5-6',
                    'PLEC': 'M',
                    'WAGA_MIN': '70',
                    'WAGA_MAX': '90',
                    'WZROST_MIN': '165',
                    'WZROST_MAX': '180',
                    'PRZEZNACZENIE': 'All-Mountain'
                },
                'dopasowanie': {'wspolczynnik': 95.5},
                'wspolczynnik_idealnosci': 95.5
            }
        ]
        
        html = self.build_results_html(idealne_data, [], [], [])
        self.results_widget.setHtml(html)
    
    def test_poziom_za_nisko(self):
        """Test kart poziom za nisko"""
        poziom_data = [
            {
                'dane': {
                    'MARKA': 'Salomon',
                    'MODEL': 'QST 99',
                    'DLUGOSC': '180',
                    'ILOSC': '2',  # 2 sztuki nart
                    'POZIOM': '3-4',
                    'PLEC': 'M',
                    'WAGA_MIN': '75',
                    'WAGA_MAX': '95',
                    'WZROST_MIN': '170',
                    'WZROST_MAX': '185',
                    'PRZEZNACZENIE': 'Freeride'
                },
                'dopasowanie': {'wspolczynnik': 78.2},
                'wspolczynnik_idealnosci': 78.2
            }
        ]
        
        html = self.build_results_html([], poziom_data, [], [])
        self.results_widget.setHtml(html)
    
    def test_alternatywy(self):
        """Test kart alternatyw"""
        alternatywy_data = [
            {
                'dane': {
                    'MARKA': 'Head',
                    'MODEL': 'Kore 93',
                    'DLUGOSC': '168',
                    'ILOSC': '3',  # 3 sztuki nart
                    'POZIOM': '5-6',
                    'PLEC': 'M',
                    'WAGA_MIN': '65',
                    'WAGA_MAX': '85',
                    'WZROST_MIN': '165',
                    'WZROST_MAX': '180',
                    'PRZEZNACZENIE': 'All-Mountain'
                },
                'dopasowanie': {'wspolczynnik': 65.4},
                'wspolczynnik_idealnosci': 65.4
            },
            {
                'dane': {
                    'MARKA': 'Volkl',
                    'MODEL': 'Mantra 102',
                    'DLUGOSC': '177',
                    'ILOSC': '1',  # 1 sztuka nart
                    'POZIOM': '6-7',
                    'PLEC': 'M',
                    'WAGA_MIN': '70',
                    'WAGA_MAX': '90',
                    'WZROST_MIN': '170',
                    'WZROST_MAX': '185',
                    'PRZEZNACZENIE': 'All-Mountain'
                },
                'dopasowanie': {'wspolczynnik': 58.7},
                'wspolczynnik_idealnosci': 58.7
            }
        ]
        
        html = self.build_results_html([], [], alternatywy_data, [])
        self.results_widget.setHtml(html)
    
    def test_inna_plec(self):
        """Test kart innej płci"""
        inna_plec_data = [
            {
                'dane': {
                    'MARKA': 'K2',
                    'MODEL': 'Mindbender 99Ti',
                    'DLUGOSC': '172',
                    'ILOSC': '5',  # 5 sztuk nart
                    'POZIOM': '5-6',
                    'PLEC': 'K',
                    'WAGA_MIN': '60',
                    'WAGA_MAX': '80',
                    'WZROST_MIN': '165',
                    'WZROST_MAX': '180',
                    'PRZEZNACZENIE': 'All-Mountain'
                },
                'dopasowanie': {'wspolczynnik': 45.2},
                'wspolczynnik_idealnosci': 45.2
            }
        ]
        
        html = self.build_results_html([], [], [], inna_plec_data)
        self.results_widget.setHtml(html)
    
    def kopiuj_wzor(self):
        """Kopiuje wzór karty do schowka i pokazuje instrukcje"""
        import pyperclip
        
        # Pobierz aktualny HTML z karty
        current_html = self.results_widget.toHtml()
        
        # Wyciągnij tylko HTML karty (bez nagłówka sekcji)
        if '<div style="border: 2px solid' in current_html:
            start = current_html.find('<div style="border: 2px solid')
            end = current_html.find('</div>', start) + 6
            card_html = current_html[start:end]
        else:
            card_html = current_html
        
        # Skopiuj do schowka
        pyperclip.copy(card_html)
        
        # Pokaż komunikat
        from PyQt5.QtWidgets import QMessageBox
        QMessageBox.information(self, "Wzór Skopiowany", 
                               "HTML karty został skopiowany do schowka!\n\n"
                               "Teraz możesz:\n"
                               "1. Wkleić go do głównej aplikacji\n"
                               "2. Użyć jako wzór do wszystkich kart\n"
                               "3. Zmodyfikować i przetestować")
    
    def build_results_html(self, idealne, poziom_za_nisko, alternatywy, inna_plec):
        """Buduje HTML wyników - kopia z głównej aplikacji"""
        html_parts = []
        
        # IDEALNE DOPASOWANIA
        if idealne:
            html_parts.append('<h3 style="color:#0b4da2; margin:15px 0 10px 0; font-size: 24px; font-weight: bold; padding: 12px 18px; background: linear-gradient(135deg, #e8f4fd, #f0f8ff); border-left: 5px solid #0b4da2; border-radius: 6px;">✅ IDEALNE DOPASOWANIA</h3>')
            html_parts.append(self._format_ski_group_as_table(idealne))
        
        # POZIOM ZA NISKO
        if poziom_za_nisko:
            html_parts.append('<h3 style="color:#1a73e8; margin:15px 0 10px 0; font-size: 24px; font-weight: bold; padding: 12px 18px; background: linear-gradient(135deg, #f0f8ff, #e8f4fd); border-left: 5px solid #1a73e8; border-radius: 6px;">🟡 POZIOM ZA NISKO</h3>')
            html_parts.append(self._format_ski_group_as_table(poziom_za_nisko))
        
        # ALTERNATYWY
        if alternatywy:
            html_parts.append('<h3 style="color:#0a5a9f; margin:15px 0 10px 0; font-size: 24px; font-weight: bold; padding: 12px 18px; background: linear-gradient(135deg, #f8f9fa, #e8f4fd); border-left: 5px solid #0a5a9f; border-radius: 6px;">⚠️ ALTERNATYWY</h3>')
            html_parts.append(self._format_ski_group_as_table(alternatywy))
        
        # INNA PŁEĆ
        if inna_plec:
            html_parts.append('<h3 style="color:#666; margin:15px 0 10px 0; font-size: 24px; font-weight: bold; padding: 12px 18px; background: linear-gradient(135deg, #f8f9fa, #f0f8ff); border-left: 5px solid #666; border-radius: 6px;">👥 INNA PŁEĆ</h3>')
            html_parts.append(self._format_ski_group_as_table(inna_plec))
        
        if not any([idealne, poziom_za_nisko, alternatywy, inna_plec]):
            html_parts.append('<p style="text-align:center; color:#666; font-style:italic;">Brak dopasowanych nart dla podanych kryteriów.</p>')
        
        return '<div style="font-family: Arial, Helvetica, sans-serif; font-size:18px; color:#012B5A; padding: 2px; max-width: 100%; margin: 0;">' + ''.join(html_parts) + '</div>'
    
    def _format_ski_group_as_table(self, narty):
        """Formatuje grupę nart jako tabelę HTML - kopia z głównej aplikacji"""
        if not narty:
            return ""
        
        html_parts = []
        html_parts.append('<table style="width: 100%; border-collapse: separate; border-spacing: 2px; margin: 2px 0; table-layout: fixed;">')
        
        # Grupuj narty po dwie
        for i in range(0, len(narty), 2):
            html_parts.append('<tr>')
            
            # Pierwsza narta w rzędzie
            html_parts.append('<td style="width: 50%; padding: 0; vertical-align: top;">')
            html_parts.append(self._format_single_ski_compact(narty[i]))
            html_parts.append('</td>')
            
            # Druga narta w rzędzie (jeśli istnieje)
            if i + 1 < len(narty):
                html_parts.append('<td style="width: 50%; padding: 0; vertical-align: top;">')
                html_parts.append(self._format_single_ski_compact(narty[i + 1]))
                html_parts.append('</td>')
            else:
                # Pusta komórka jeśli nieparzysta liczba nart
                html_parts.append('<td style="width: 50%; padding: 0;"></td>')
            
            html_parts.append('</tr>')
        
        html_parts.append('</table>')
        return ''.join(html_parts)
    
    def _format_single_ski_compact(self, narta_info):
        """Formatuje pojedynczą nartę w kompaktowej formie - kopia z głównej aplikacji"""
        try:
            dane = narta_info.get('dane', {})
            dopasowanie = narta_info.get('dopasowanie', {})
            wspolczynnik = narta_info.get('wspolczynnik_idealnosci', 0)
            
            # Podstawowe informacje
            marka = dane.get('MARKA', 'N/A')
            model = dane.get('MODEL', 'N/A')
            dlugosc = dane.get('DLUGOSC', 'N/A')
            poziom = dane.get('POZIOM', 'N/A')
            plec = dane.get('PLEC', 'N/A')
            waga_min = dane.get('WAGA_MIN', 'N/A')
            waga_max = dane.get('WAGA_MAX', 'N/A')
            wzrost_min = dane.get('WZROST_MIN', 'N/A')
            wzrost_max = dane.get('WZROST_MAX', 'N/A')
            przeznaczenie = dane.get('PRZEZNACZENIE', 'N/A')
            
            # Generuj znaczki dostępności na podstawie liczby sztuk
            ilosc = int(dane.get('ILOSC', 2))  # Domyślnie 2 jeśli brak danych
            # Symulacja rezerwacji - różne dla różnych nart
            if ilosc >= 3:
                zarezerwowane = [1]  # Pierwsza sztuka zarezerwowana
            elif ilosc >= 2:
                zarezerwowane = [2]  # Druga sztuka zarezerwowana
            else:
                zarezerwowane = []
            
            squares = []
            for i in range(1, ilosc + 1):
                if i in zarezerwowane:
                    squares.append(f'<span title="Zarezerwowana: 2025-01-15 - 2025-01-20" style="cursor: help;">🔴{i}</span>')
                else:
                    squares.append(f"🟩{i}")
            info_narty = " ".join(squares)
            
            # Kolor tła w zależności od poziomu dopasowania
            if wspolczynnik >= 90:
                bg_color = "#e8f4fd"  # Bardzo jasny niebieski
                border_color = "#0b4da2"
            elif wspolczynnik >= 70:
                bg_color = "#f0f8ff"  # Jasny niebieski
                border_color = "#1a73e8"
            else:
                bg_color = "#f8f9fa"  # Bardzo jasny szary
                border_color = "#666"
            
            # Formatowanie z równymi polami i nowym układem danych
            html = f'''
            <div style="border: 2px solid {border_color}; padding: 20px; margin: 8px; background: {bg_color}; border-radius: 10px; box-shadow: 0 3px 6px rgba(0,0,0,0.15); min-height: 200px; display: flex; flex-direction: column;">
                <div style="font-weight: bold; color: #0b4da2; font-size: 22px; margin-bottom: 12px;">
                    {marka} {model} ({dlugosc}cm)
                </div>
                
                <!-- INFORMACJE O DOSTĘPNOŚCI NART -->
                <div style="font-size: 14px; color: #012B5A; background: #A6C2EF; border: 1px solid #FFFFFF; border-radius: 9px; padding: 4px 8px; margin-bottom: 12px; text-align: center;">
                    <strong>Dostępne: {info_narty}</strong>
                </div>
                
                <!-- NOWY UKŁAD: Wzrost, Waga, Poziom, Płeć z równymi polami -->
                <div style="font-size: 16px; color: #333; margin: 8px 0; line-height: 1.5; flex-grow: 1;">
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; align-items: center;">
                        <span><strong>Wzrost:</strong> {wzrost_min}-{wzrost_max}cm</span>
                        <span style="color: #0b4da2; background: #e8f4fd; padding: 4px 8px; border-radius: 4px; font-size: 14px;">Klient: 170cm</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; align-items: center;">
                        <span><strong>Waga:</strong> {waga_min}-{waga_max}kg</span>
                        <span style="color: #0b4da2; background: #e8f4fd; padding: 4px 8px; border-radius: 4px; font-size: 14px;">Klient: 75kg</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; align-items: center;">
                        <span><strong>Poziom:</strong> {poziom}</span>
                        <span style="color: #0b4da2; background: #e8f4fd; padding: 4px 8px; border-radius: 4px; font-size: 14px;">Klient: 5</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; align-items: center;">
                        <span><strong>Płeć:</strong> {plec}</span>
                        <span style="color: #0b4da2; background: #e8f4fd; padding: 4px 8px; border-radius: 4px; font-size: 14px;">Klient: M</span>
                    </div>
                </div>
                
                <div style="font-size: 17px; color: #555; margin-top: auto; padding-top: 8px; border-top: 2px solid #ddd;">
                    <strong>{przeznaczenie}</strong> | <span style="color: #0b4da2; font-weight: bold;">Dopasowanie: {wspolczynnik:.1f}%</span>
                </div>
            </div>
            '''
            
            return html
            
        except Exception as e:
            return f'<div style="color: red; font-size: 14px;">Błąd: {e}</div>'

def main():
    """Główna funkcja uruchamiająca okno testowe"""
    app = QApplication(sys.argv)
    
    # Ustawienia aplikacji
    app.setApplicationName("Test Karty Nart")
    app.setApplicationVersion("1.0")
    
    # Stwórz i pokaż okno
    window = TestKartyNart()
    window.show()
    
    # Uruchom aplikację
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()


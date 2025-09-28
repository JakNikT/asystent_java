"""
Główne okno aplikacji Asystent Doboru Nart
Zawiera interfejs użytkownika i logikę obsługi zdarzeń
"""
import os
import sys
from html import escape as html_escape
from PyQt5.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QLabel, QPushButton, QLineEdit, QRadioButton, 
                             QTextEdit, QTextBrowser, QGroupBox, QMessageBox, QCalendarWidget, QDialog, QFrame,
                             QTableWidget, QTableWidgetItem, QComboBox)
from PyQt5.QtCore import Qt, QRegExp
from PyQt5.QtGui import QFont, QPixmap, QRegExpValidator

# Import modułów
from logika.dobieranie_nart import dobierz_narty
from dane.wczytywanie_danych import sprawdz_czy_narta_zarezerwowana
from styl.motyw_kolorow import ModernTheme, get_application_stylesheet, get_button_style, get_results_text_style
# from styl.figma_integration import (get_figma_button_style, get_figma_input_style, 
#                                    create_figma_button, create_figma_input, create_figma_label)
from narzedzia.konfiguracja_logowania import get_logger

logger = get_logger(__name__)

class DatePickerDialog(QDialog):
    """Dialog wyboru daty"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Wybierz datę")
        self.setModal(True)
        self.setFixedSize(300, 250)
        
        layout = QVBoxLayout(self)
        
        # Kalendarz
        self.calendar = QCalendarWidget()
        self.calendar.setGridVisible(True)
        layout.addWidget(self.calendar)
        
        # Przyciski
        btn_layout = QHBoxLayout()
        
        ok_btn = QPushButton("OK")
        ok_btn.clicked.connect(self.accept)
        ok_btn.setStyleSheet(get_button_style(ModernTheme.SUCCESS))
        
        cancel_btn = QPushButton("Anuluj")
        cancel_btn.clicked.connect(self.reject)
        cancel_btn.setStyleSheet(get_button_style(ModernTheme.ERROR))
        
        btn_layout.addWidget(ok_btn)
        btn_layout.addWidget(cancel_btn)
        layout.addLayout(btn_layout)
    
    def get_selected_date(self):
        return self.calendar.selectedDate()

class SkiApp(QMainWindow):
    """Główne okno aplikacji"""
    
    def ensure_frame6_layout(self):
        """Zwraca layout przypisany do frame6. Jeśli go nie ma — tworzy i ustawia nowy."""
        frame6 = self.findChild(QFrame, "frame6")
        if frame6 is None:
            logger.error("ensure_frame6_layout: Nie znaleziono frame6")
            return None

        layout = frame6.layout()
        if layout is None:
            # Tworzymy layout *bez* przekazywania parenta. Dopiero potem przypisujemy.
            layout = QVBoxLayout()
            layout.setContentsMargins(10, 10, 10, 10)
            layout.setSpacing(8)
            frame6.setLayout(layout)
            logger.info("Utworzono nowy layout dla frame6")
        else:
            logger.info("frame6 już ma layout — używam istniejącego")
        return layout

    def _format_list_html(self, items):
        """Prosta funkcja zamieniająca listę elementów na HTML <ul>. items może być listą stringów lub słowników."""
        if not items:
            return "<p><i>Brak</i></p>"
        
        safe_items = []
        for item in items:
            if isinstance(item, dict):
                # Sprawdź czy to struktura z kluczem 'dane' (wynik z dobierz_narty)
                if 'dane' in item:
                    # Format dla wyniku z dobierz_narty - dane są w kluczu 'dane'
                    dane = item['dane']
                    marka = dane.get('MARKA', 'N/A')
                    model = dane.get('MODEL', 'N/A')
                    dlugosc = dane.get('DLUGOSC', 'N/A')
                    text = f"<b>{html_escape(marka)} {html_escape(model)}</b> - {html_escape(str(dlugosc))}cm"
                else:
                    # Format dla bezpośredniego słownika z danymi narty
                    marka = item.get('MARKA', 'N/A')
                    model = item.get('MODEL', 'N/A')
                    dlugosc = item.get('DLUGOSC', 'N/A')
                    text = f"<b>{html_escape(marka)} {html_escape(model)}</b> - {html_escape(str(dlugosc))}cm"
            else:
                # Format dla zwykłego stringa
                text = html_escape(str(item))
            safe_items.append(f"<li>{text}</li>")
        
        return f"<ul style='margin:6px 0 12px 18px'>{''.join(safe_items)}</ul>"

    def build_results_html(self, idealne, poziom_za_nisko, alternatywy, inna_plec, rezerwacje_cache=None):
        """Buduje HTML wyników zgodnie z prompt.md"""
        html_parts = []
        
        # IDEALNE DOPASOWANIA
        if idealne:
            html_parts.append('<h3 style="color:#0b4da2; margin:10px 0 5px 0;">✅ IDEALNE DOPASOWANIA:</h3>')
            html_parts.append('<div style="border:1px solid #ccc; padding:10px; margin:5px 0; background:#f9f9f9;">')
            for narta in idealne:
                html_parts.append(self._format_single_ski_detailed(narta, rezerwacje_cache))
            html_parts.append('</div>')
        
        # POZIOM ZA NISKO
        if poziom_za_nisko:
            html_parts.append('<h3 style="color:#1a73e8; margin:10px 0 5px 0;">🟡 POZIOM ZA NISKO:</h3>')
            html_parts.append('<div style="border:1px solid #ccc; padding:10px; margin:5px 0; background:#f9f9f9;">')
            for narta in poziom_za_nisko:
                html_parts.append(self._format_single_ski_detailed(narta, rezerwacje_cache))
            html_parts.append('</div>')
        
        # ALTERNATYWY
        if alternatywy:
            html_parts.append('<h3 style="color:#0a5a9f; margin:10px 0 5px 0;">⚠️ ALTERNATYWY:</h3>')
            html_parts.append('<div style="border:1px solid #ccc; padding:10px; margin:5px 0; background:#f9f9f9;">')
            for narta in alternatywy:
                html_parts.append(self._format_single_ski_detailed(narta, rezerwacje_cache))
            html_parts.append('</div>')
        
        # INNA PŁEĆ
        if inna_plec:
            html_parts.append('<h3 style="color:#666; margin:10px 0 5px 0;">👥 INNA PŁEĆ:</h3>')
            html_parts.append('<div style="border:1px solid #ccc; padding:10px; margin:5px 0; background:#f9f9f9;">')
            for narta in inna_plec:
                html_parts.append(self._format_single_ski_detailed(narta, rezerwacje_cache))
            html_parts.append('</div>')
        
        if not any([idealne, poziom_za_nisko, alternatywy, inna_plec]):
            html_parts.append('<p style="text-align:center; color:#666; font-style:italic;">Brak dopasowanych nart dla podanych kryteriów.</p>')
        
        return '<div style="font-family: Arial, Helvetica, sans-serif; font-size:13px; color:#012B5A;">' + ''.join(html_parts) + '</div>'
    
    def _format_single_ski_detailed(self, narta_info, rezerwacje_cache=None):
        """Formatuje pojedynczą nartę zgodnie z prompt.md"""
        try:
            dane = narta_info.get('dane', {})
            dopasowanie = narta_info.get('dopasowanie', {})
            wspolczynnik = narta_info.get('wspolczynnik_idealnosci', 0)
            
            # Podstawowe informacje
            marka = dane.get('MARKA', 'N/A')
            model = dane.get('MODEL', 'N/A')
            dlugosc = dane.get('DLUGOSC', 'N/A')
            
            # Emoji na podstawie współczynnika
            if wspolczynnik >= 90:
                emoji = "🎯"
            elif wspolczynnik >= 80:
                emoji = "✅"
            elif wspolczynnik >= 70:
                emoji = "👍"
            elif wspolczynnik >= 60:
                emoji = "⚡"
            else:
                emoji = "📊"
            
            # Pobierz daty rezerwacji z formularza
            try:
                data_od = f"{self.od_rok.text()}-{self.od_miesiac.text().zfill(2)}-{self.od_dzien.text().zfill(2)}"
                data_do = f"{self.do_rok.text()}-{self.do_miesiac.text().zfill(2)}-{self.do_dzien.text().zfill(2)}"
            except:
                data_od = None
                data_do = None

            # Sprawdź dostępność
            dostepnosc = self._check_availability(marka, model, dlugosc, data_od, data_do, rezerwacje_cache)
            
            # Szczegółowe dopasowanie
            dopasowanie_text = self._format_dopasowanie_details(dopasowanie)
            
            # Informacje techniczne
            promien = "12.5"  # TODO: Dodać do bazy danych
            pod_butem = "85mm"  # TODO: Dodać do bazy danych
            
            html = f"""
            <div style="margin:10px 0; padding:10px; border:1px solid #ddd; background:white; border-radius:5px;">
                <div style="font-weight:bold; font-size:14px; margin-bottom:5px;">
                    ► {marka} {model} ({dlugosc} cm) {emoji} {wspolczynnik}%
                </div>
                <div style="margin:5px 0; font-size:12px;">
                    📦 Dostępność: {dostepnosc}
                </div>
                <div style="margin:5px 0; font-size:12px;">
                    📊 Dopasowanie: {dopasowanie_text}
                </div>
                <div style="margin:5px 0; font-size:12px;">
                    ℹ️ Promień: {promien} | Pod butem: {pod_butem}
                </div>
                <div style="margin:5px 0; font-size:12px;">
                    📝 Uwagi: 
                </div>
                <div style="border-top:1px solid #eee; margin-top:10px; padding-top:5px;">
                    ────────────────────────────────────────────────────────────────────────────────
                </div>
            </div>
            """
            return html
        except Exception as e:
            logger.error(f"Błąd podczas formatowania narty: {e}")
            return f"<div>Błąd formatowania: {e}</div>"
    
    def _format_dopasowanie_details(self, dopasowanie):
        """Formatuje szczegóły dopasowania zgodnie z prompt.md"""
        try:
            parts = []
            
            # Poziom
            if 'poziom' in dopasowanie:
                p = dopasowanie['poziom']
                color = "🟢" if p[0] == 'green' else "🟡" if p[0] == 'orange' else "🔴"
                parts.append(f"{color} P:{p[2]}→{p[1]}")
            
            # Płeć
            if 'plec' in dopasowanie:
                p = dopasowanie['plec']
                color = "🟢" if p[0] == 'green' else "🟡" if p[0] == 'orange' else "🔴"
                parts.append(f"{color} Pł:{p[2]}→{p[1]}")
            
            # Waga
            if 'waga' in dopasowanie:
                p = dopasowanie['waga']
                color = "🟢" if p[0] == 'green' else "🟡" if p[0] == 'orange' else "🔴"
                if len(p) >= 4:
                    parts.append(f"{color} W:{p[2]}-{p[3]}→{p[1]}")
                else:
                    parts.append(f"{color} W:→{p[1]}")
            
            # Wzrost
            if 'wzrost' in dopasowanie:
                p = dopasowanie['wzrost']
                color = "🟢" if p[0] == 'green' else "🟡" if p[0] == 'orange' else "🔴"
                if len(p) >= 4:
                    parts.append(f"{color} Wz:{p[2]}-{p[3]}→{p[1]}")
                else:
                    parts.append(f"{color} Wz:→{p[1]}")
            
            # Przeznaczenie
            if 'przeznaczenie' in dopasowanie:
                p = dopasowanie['przeznaczenie']
                color = "🟢" if p[0] == 'green' else "🟡" if p[0] == 'orange' else "🔴"
                parts.append(f"{color} Pr:{p[2] if len(p) > 2 else ''}→{p[1]}")
            
            return " | ".join(parts)
        except Exception as e:
            logger.error(f"Błąd podczas formatowania dopasowania: {e}")
            return "Błąd formatowania"
    
    def _check_availability(self, marka, model, dlugosc, data_od=None, data_do=None, rezerwacje_cache=None):
        """Sprawdza dostępność nart na podstawie rezerwacji"""
        try:
            if rezerwacje_cache is None or rezerwacje_cache.empty:
                return "🟩1 🟩2"  # Domyślnie dostępne
            
            # Sprawdź czy narta jest zarezerwowana
            from dane.wczytywanie_danych import sprawdz_czy_narta_zarezerwowana
            is_reserved, reservation_info, numer = sprawdz_czy_narta_zarezerwowana(
                marka, model, dlugosc, data_od, data_do, rezerwacje_cache
            )
            
            if is_reserved:
                return f"🟩1 🔴2<br/>🚫 Zarezerwowana: {reservation_info} (Nr: {numer})"
            else:
                return "🟩1 🟩2"
        except Exception as e:
            logger.error(f"Błąd podczas sprawdzania dostępności: {e}")
            return "🟩1 🟩2"
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("NARTY POZNAŃ - Asystent Doboru Nart")
        self.setGeometry(100, 100, 1100, 899)  # Zmniejszono wysokość z 969px na 899px (dopasowano do frame'a wyniki)
        
        # Inicjalizacja zmiennych
        self.wyniki_widget = None
        self.rezerwacje_data = []
        
        self.setup_ui()
        self.setup_styles()
        self.setup_validators()
        self.setup_date_handlers()
        self.load_data()
        logger.info("Aplikacja uruchomiona")
        
    def setup_ui(self):
        """Konfiguruje interfejs użytkownika - TYLKO TŁO na start"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Główny kontener z tłem zgodnym z Figma
        central_widget.setStyleSheet("""
            QWidget {
                background-color: #386BB2;
            }
        """)
        
        # Główny layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setSpacing(0)
        main_layout.setContentsMargins(0, 0, 0, 0)
        
        # ========== ELEMENT 1: ELLIPSE 3 (180x180px) ==========
        ellipse3 = self.create_ellipse3()
        # Wyśrodkuj logo względem formularza (formularz: y:10px, wysokość: 180px, środek: y:100px)
        # Logo ma wysokość 180px, więc góra logo powinna być na y:10px (100-90)
        ellipse3.move(10, 10)  # left: 10px, top: 10px (tak samo jak formularz)
        ellipse3.setParent(central_widget)
        
        # ========== ELEMENT 2: FORMULARZ SEKCJA (890x180px) ==========
        formularz = self.create_formularz_sekcja()
        formularz.move(201, 10)  # left: 201px, top: 10px
        formularz.setParent(central_widget)
        
        # ========== ELEMENT 3: LEWA STRONA (307x160px) ==========
        # Pozycja względem formularza: left: 10px, top: 10px
        # Ale formularz jest na pozycji (201, 10), więc: 201+10=211, 10+10=20
        lewa_strona = self.create_lewa_strona()
        lewa_strona.move(211, 20)  # 201+10, 10+10
        lewa_strona.setParent(central_widget)
        
        # Dodaj pola do wpisywania daty do lewej strony
        self.add_date_fields_to_lewa_strona(lewa_strona)
        
        # ========== ELEMENT 4: DANE KLIENTA (230x50px) ==========
        # Pozycja względem formularza: środek, top: 10px
        # Formularz: 201px szerokości, środek = 201 + (890-230)/2 = 201 + 330 = 531px
        dane_klienta = self.create_dane_klienta()
        dane_klienta.move(531, 20)  # środek formularza, top: 10px
        dane_klienta.setParent(central_widget)
        
        # Dodaj tekst "Dane klienta" BEZPOŚREDNIO do frame'a
        self.add_text_to_dane_klienta(dane_klienta)
        
        # ========== ELEMENT 5: ŚRODEK (230x96px) ==========
        # Pozycja względem formularza: left: 330px, top: 74px
        # Ale to jest pozycja względem formularza, więc: 201+330=531, 10+74=84
        srodek = self.create_srodek()
        srodek.move(531, 84)  # 201+330, 10+74
        srodek.setParent(central_widget)
        
        # Dodaj pola poziomu do środka
        self.add_poziom_fields_to_srodek(srodek)
        
        # ========== ELEMENT 6: PRAWA STRONA (307x160px) ==========
        # Pozycja względem formularza: left: 573px, top: 10px
        # Ale to jest pozycja względem formularza, więc: 201+573=774, 10+10=20
        prawa_strona = self.create_prawa_strona()
        prawa_strona.move(774, 20)  # 201+573, 10+10
        prawa_strona.setParent(central_widget)
        
        # Dodaj pola preferencji do prawej strony
        self.add_preferencje_fields_to_prawa_strona(prawa_strona)
        
        # Połącz przyciski z funkcjami
        self.connect_buttons()
        
        # Tekst "Dane klienta" jest już dodany bezpośrednio do frame'a powyżej
        
        # ========== ELEMENT 7: WYNIKI (1100x450px) - PUNKT ODNIESIENIA ==========
        wyniki = self.create_wyniki()
        wyniki.move(0, 200)  # left: 0px, top: 200px
        wyniki.setParent(central_widget)
        
        # Dodaj Group 3 do frame'a wyniki
        self.add_group3_to_wyniki(wyniki)
        
    # ========== WYŁĄCZONE FUNKCJE GRAFICZNE - BĘDĄ DODANE PÓŹNIEJ ==========
    # Te funkcje są zachowane, ale nie są wywoływane w interfejsie
    
    def create_header(self):
        """Tworzy nagłówek - WYŁĄCZONE"""
        pass
    
    def create_logo_container(self):
        """Tworzy kontener na logo - WYŁĄCZONE"""
        pass
    
    def create_ellipse3(self):
        """Tworzy Ellipse 3 zgodnie z Figma - 180x180px, pozycja (10,10), tło #D9D9D9"""
        # Ellipse 3 - dokładnie jak w Figma
        ellipse_frame = QFrame()
        ellipse_frame.setStyleSheet("""
            QFrame {
                background-color: #D9D9D9;
                border-radius: 90px;
                border: none;
            }
        """)
        ellipse_frame.setFixedSize(180, 180)  # Dokładnie 180x180px jak w Figma
        ellipse_frame.setParent(self)  # Ustaw parent dla absolute positioning
        
        # Layout dla ellipse
        ellipse_layout = QVBoxLayout(ellipse_frame)
        ellipse_layout.setContentsMargins(0, 0, 0, 0)
        ellipse_layout.setAlignment(Qt.AlignCenter)
        
        # Dodaj logo, żeby zakrywało okrąg z każdej strony
        logo_label = QLabel()
        logo_pixmap = QPixmap("newlogo")
        # Skaluj logo do dokładnie takiego samego rozmiaru jak okrąg
        scaled_pixmap = logo_pixmap.scaled(180, 180, Qt.IgnoreAspectRatio, Qt.SmoothTransformation)
        logo_label.setPixmap(scaled_pixmap)
        logo_label.setAlignment(Qt.AlignCenter)
        logo_label.setStyleSheet("background-color: transparent; border: none;")
        # Ustaw dokładnie taki sam rozmiar jak okrąg
        logo_label.setFixedSize(180, 180)
        ellipse_layout.addWidget(logo_label)
        
        return ellipse_frame
    
    def create_wyniki(self):
        """Tworzy frame wyników - punkt odniesienia (1100x450px, pozycja 0,200), tło #386BB2"""
        wyniki_frame = QFrame()
        wyniki_frame.setObjectName("wyniki")  # Ustaw object name dla wyszukiwania
        wyniki_frame.setStyleSheet("""
            QFrame {
                background-color: #386BB2;
                border: none;
            }
        """)
        wyniki_frame.setFixedSize(1100, 669)  # 1100x669px (zmniejszono z 739px - pole wyników wypełnia całą szerokość)
        wyniki_frame.setParent(self)
        return wyniki_frame
    
    def add_group3_to_wyniki(self, frame):
        """Dodaje pole wyników do frame'a wyniki - dokładne wymiary i pozycje"""
        
        # ========== POLE WYNIKÓW (1062x359px, pozycja 19,44) ==========
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
        wyniki_pole.setFixedSize(1062, 625)  # 1062x625px (zwiększono z 500px o +25%)
        wyniki_pole.move(19, 44)  # left: 19px, top: 44px (względem frame'a wyniki)
        wyniki_pole.setParent(frame)
        
        # Layout dla pola wyników (flex-direction: row, align-items: flex-start)
        wyniki_layout = QHBoxLayout(wyniki_pole)
        wyniki_layout.setContentsMargins(8, 8, 8, 8)  # padding: 8px
        wyniki_layout.setSpacing(10)  # gap: 10px
        wyniki_layout.setAlignment(Qt.AlignTop)  # align-items: flex-start
        
        # ========== FRAME 6 (1046x343px) ==========
        frame6 = QFrame()
        frame6.setObjectName("frame6")
        frame6.setStyleSheet("""
            QFrame {
                background-color: #A6C2EF;
                border-radius: 20px;
                border: none;
            }
        """)
        frame6.setFixedSize(1046, 605)  # 1046x605px (zwiększono z 484px o +25%)
        
        # Dodaj layout do frame6
        frame6_layout = QVBoxLayout(frame6)
        frame6_layout.setContentsMargins(10, 10, 10, 10)
        frame6_layout.setSpacing(5)
        
        # Dodaj tytuł względem frame'a wyniki
        self.add_tytul_wzgl_wyniki(frame)
        
        # Dodaj Frame 6 do layoutu (flex: none, order: 0, flex-grow: 1)
        wyniki_layout.addWidget(frame6, 1)  # flex-grow: 1
        
        # Frame 6 jest gotowy na kolejne elementy
        return wyniki_pole
    
    def add_tytul_wzgl_wyniki(self, frame):
        """Dodaje tytuł względem frame'a wyniki - dokładne wymiary i pozycje"""
        
        # ========== TYTUŁ "🔍 WYNIKI DOBORU NART" (348x50px, pozycja 19,0) ==========
        # Pozycja względem frame'a wyniki: left:19px, top:0px
        tytul_frame = QFrame()
        tytul_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border-top-left-radius: 20px;
                border-top-right-radius: 20px;
                border-bottom-right-radius: 0px;
                border-bottom-left-radius: 0px;
                border: none;
            }
        """)
        tytul_frame.setFixedSize(348, 50)  # 348x50px
        tytul_frame.move(19, 0)  # left: 19px, top: 0px (względem frame'a wyniki)
        tytul_frame.setParent(frame)
        
        # Layout dla tytułu
        tytul_layout = QVBoxLayout(tytul_frame)
        tytul_layout.setContentsMargins(0, 0, 0, 0)
        tytul_layout.setAlignment(Qt.AlignCenter)
        
        # Dodaj tekst tytułu
        tytul_label = QLabel("🔍 Wyniki Doboru Nart")
        tytul_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 24px;
                background-color: transparent;
                border: none;
            }
        """)
        tytul_label.setAlignment(Qt.AlignCenter)
        tytul_layout.addWidget(tytul_label)
        
        return tytul_frame
    
    def create_formularz_sekcja(self):
        """Tworzy formularz sekcja zgodnie z Figma - 890x180px, pozycja (201,10), tło #194576"""
        formularz_frame = QFrame()
        formularz_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border-radius: 20px;
                border: none;
            }
        """)
        formularz_frame.setFixedSize(890, 180)  # Dokładnie 890x180px jak w Figma
        formularz_frame.setParent(self)
        return formularz_frame
    
    def create_lewa_strona(self):
        """Tworzy lewa strona zgodnie z Figma - 307x160px, pozycja (10,10), tło #2C699F"""
        lewa_frame = QFrame()
        lewa_frame.setStyleSheet("""
            QFrame {
                background-color: #2C699F;
                border: 1px solid #FFFFFF;
                border-radius: 10px;
            }
        """)
        lewa_frame.setFixedSize(307, 160)  # Dokładnie 307x160px jak w Figma
        lewa_frame.setParent(self)
        return lewa_frame
    
    def create_dane_klienta(self):
        """Tworzy dane klienta zgodnie z Figma - 230x50px, środek, tło #2C699F"""
        dane_frame = QFrame()
        dane_frame.setStyleSheet("""
            QFrame {
                background-color: #2C699F;
                border: 1px solid #FFFFFF;
                border-radius: 10px;
            }
        """)
        dane_frame.setFixedSize(230, 50)  # Dokładnie 230x50px jak w Figma
        dane_frame.setParent(self)
        return dane_frame
    
    def create_srodek(self):
        """Tworzy środek zgodnie z Figma - 230x96px, pozycja (330,74), tło #2C699F"""
        srodek_frame = QFrame()
        srodek_frame.setStyleSheet("""
            QFrame {
                background-color: #2C699F;
                border: 1px solid #FFFFFF;
                border-radius: 10px;
            }
        """)
        srodek_frame.setFixedSize(230, 96)  # Dokładnie 230x96px jak w Figma
        srodek_frame.setParent(self)
        return srodek_frame
    
    def create_prawa_strona(self):
        """Tworzy prawa strona zgodnie z Figma - 307x160px, pozycja (573,10), tło #2C699F"""
        prawa_frame = QFrame()
        prawa_frame.setStyleSheet("""
            QFrame {
                background-color: #2C699F;
                border: 1px solid #FFFFFF;
                border-radius: 10px;
            }
        """)
        prawa_frame.setFixedSize(307, 160)  # Dokładnie 307x160px jak w Figma
        prawa_frame.setParent(self)
        return prawa_frame
    
    def add_text_to_dane_klienta(self, frame):
        """Dodaje tekst 'Dane klienta' bezpośrednio do frame'a"""
        # Layout dla tekstu wewnątrz frame'a
        text_layout = QVBoxLayout(frame)
        text_layout.setContentsMargins(0, 0, 0, 0)
        text_layout.setAlignment(Qt.AlignCenter)
        
        # Jeden tekst z fajnym fontem (bez text-shadow - PyQt5 nie obsługuje)
        text_label = QLabel("Dane klienta")
        text_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 26px;
                background-color: transparent;
                border: none;
            }
        """)
        text_label.setAlignment(Qt.AlignCenter)
        
        # Dodaj tekst do layoutu
        text_layout.addWidget(text_label)
    
    def add_date_fields_to_lewa_strona(self, frame):
        """Dodaje pola do wpisywania daty zgodnie z Figma - dokładne wymiary i pozycje"""
        # Użyj absolute positioning wewnątrz frame'a
        # Nie ustawiaj layout na None - po prostu nie dodawaj layoutu
        
        # ========== FRAME "DATA OD" (111.24x29.44px, pozycja 10,10) ==========
        data_frame = QFrame()
        data_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
            }
        """)
        data_frame.setFixedSize(111, 29)  # 111.24x29.44px
        data_frame.move(10, 10)  # left: 10px, top: 10px
        data_frame.setParent(frame)
        
        # Dodaj tekst "📅 Data od" do frame'a z emotką kalendarza
        data_od_label = QLabel("📅 Data od")
        data_od_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 14px;
                background-color: transparent;
                border: none;
            }
        """)
        data_od_label.setAlignment(Qt.AlignCenter)
        data_od_label.setParent(data_frame)
        data_od_label.move(5, 5)  # Wyśrodkuj w frame'ie
        data_od_label.resize(101, 19)  # Dostosuj do frame'a
        
        # ========== DZIEŃ OD (37.82x29.44px, pozycja 129.03,10) ==========
        self.od_dzien = QLineEdit()
        self.od_dzien.setObjectName("od_dzien")
        self.od_dzien.setPlaceholderText("")
        self.od_dzien.setMaxLength(2)
        self.od_dzien.setFixedSize(38, 29)  # 37.82x29.44px
        self.od_dzien.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.od_dzien.move(129, 10)  # left: 129.03px, top: 10px
        self.od_dzien.setParent(frame)
        
        # ========== MIESIĄC OD (37.82x29.44px, pozycja 182.42,10) ==========
        self.od_miesiac = QLineEdit()
        self.od_miesiac.setObjectName("od_miesiac")
        self.od_miesiac.setPlaceholderText("")
        self.od_miesiac.setMaxLength(2)
        self.od_miesiac.setFixedSize(38, 29)  # 37.82x29.44px
        self.od_miesiac.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.od_miesiac.move(182, 10)  # left: 182.42px, top: 10px
        self.od_miesiac.setParent(frame)
        
        # ========== ROK OD (61.18x29.44px, pozycja 235.82,10) ==========
        self.od_rok = QLineEdit()
        self.od_rok.setObjectName("od_rok")
        self.od_rok.setPlaceholderText("")
        self.od_rok.setMaxLength(4)
        self.od_rok.setFixedSize(61, 29)  # 61.18x29.44px
        self.od_rok.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.od_rok.move(236, 10)  # left: 235.82px, top: 10px
        self.od_rok.setParent(frame)
        
        # ========== DRUGI RZĄD - FRAME "DATA DO" (111.24x29.44px, pozycja 10,46.8) ==========
        data_do_frame = QFrame()
        data_do_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
            }
        """)
        data_do_frame.setFixedSize(111, 29)  # 111.24x29.44px
        data_do_frame.move(10, 47)  # left: 10px, top: 46.8px
        data_do_frame.setParent(frame)
        
        # Dodaj tekst "📅 Data do" do frame'a z emotką kalendarza
        data_do_label = QLabel("📅 Data do")
        data_do_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 14px;
                background-color: transparent;
                border: none;
            }
        """)
        data_do_label.setAlignment(Qt.AlignCenter)
        data_do_label.setParent(data_do_frame)
        data_do_label.move(5, 5)  # Wyśrodkuj w frame'ie
        data_do_label.resize(101, 19)  # Dostosuj do frame'a
        
        # ========== DZIEŃ DO (37.82x29.44px, pozycja 129.03,46.8) ==========
        self.do_dzien = QLineEdit()
        self.do_dzien.setObjectName("do_dzien")
        self.do_dzien.setPlaceholderText("")
        self.do_dzien.setMaxLength(2)
        self.do_dzien.setFixedSize(38, 29)  # 37.82x29.44px
        self.do_dzien.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.do_dzien.move(129, 47)  # left: 129.03px, top: 46.8px
        self.do_dzien.setParent(frame)
        
        # ========== MIESIĄC DO (37.82x29.44px, pozycja 182.42,46.8) ==========
        self.do_miesiac = QLineEdit()
        self.do_miesiac.setObjectName("do_miesiac")
        self.do_miesiac.setPlaceholderText("")
        self.do_miesiac.setMaxLength(2)
        self.do_miesiac.setFixedSize(38, 29)  # 37.82x29.44px
        self.do_miesiac.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.do_miesiac.move(182, 47)  # left: 182.42px, top: 46.8px
        self.do_miesiac.setParent(frame)
        
        # ========== ROK DO (61.18x29.44px, pozycja 235.82,46.8) ==========
        self.do_rok = QLineEdit()
        self.do_rok.setObjectName("do_rok")
        self.do_rok.setPlaceholderText("")
        self.do_rok.setMaxLength(4)
        self.do_rok.setFixedSize(61, 29)  # 61.18x29.44px
        self.do_rok.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.do_rok.move(236, 47)  # left: 235.82px, top: 46.8px
        self.do_rok.setParent(frame)
        
        # ========== FRAME "WZROST" (112x31px, pozycja 70,84) ==========
        wzrost_frame = QFrame()
        wzrost_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
            }
        """)
        wzrost_frame.setFixedSize(112, 31)  # 112x31px
        wzrost_frame.move(70, 84)  # left: 70px, top: 84px
        wzrost_frame.setParent(frame)
        
        # Dodaj tekst "📏 Wzrost:" do frame'a
        wzrost_label = QLabel("📏 Wzrost:")
        wzrost_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 14px;
                background-color: transparent;
                border: none;
            }
        """)
        wzrost_label.setAlignment(Qt.AlignCenter)
        wzrost_label.setParent(wzrost_frame)
        wzrost_label.move(5, 5)  # Wyśrodkuj w frame'ie
        wzrost_label.resize(102, 21)  # Dostosuj do frame'a
        
        # ========== POLE WZROST (48x31px, pozycja 190,84) ==========
        self.wzrost_pole = QLineEdit()
        self.wzrost_pole.setObjectName("wzrost_pole")
        self.wzrost_pole.setPlaceholderText("")
        self.wzrost_pole.setMaxLength(3)  # Maksymalnie 3 cyfry dla wzrostu
        self.wzrost_pole.setFixedSize(48, 31)  # 48x31px
        self.wzrost_pole.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.wzrost_pole.move(190, 84)  # left: 190px, top: 84px
        self.wzrost_pole.setParent(frame)
        
        # ========== FRAME "WAGA" (112x31px, pozycja 70,122) ==========
        waga_frame = QFrame()
        waga_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
            }
        """)
        waga_frame.setFixedSize(112, 31)  # 112x31px
        waga_frame.move(70, 122)  # left: 70px, top: 122px
        waga_frame.setParent(frame)
        
        # Dodaj tekst "⚖️ Waga:" do frame'a
        waga_label = QLabel("⚖️ Waga:")
        waga_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 14px;
                background-color: transparent;
                border: none;
            }
        """)
        waga_label.setAlignment(Qt.AlignCenter)
        waga_label.setParent(waga_frame)
        waga_label.move(5, 5)  # Wyśrodkuj w frame'ie
        waga_label.resize(102, 21)  # Dostosuj do frame'a
        
        # ========== POLE WAGA (48x31px, pozycja 190,122) ==========
        self.waga_pole = QLineEdit()
        self.waga_pole.setObjectName("waga_pole")
        self.waga_pole.setPlaceholderText("")
        self.waga_pole.setMaxLength(3)  # Maksymalnie 3 cyfry dla wagi
        self.waga_pole.setFixedSize(48, 31)  # 48x31px
        self.waga_pole.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.waga_pole.move(190, 122)  # left: 190px, top: 122px
        self.waga_pole.setParent(frame)
    
    def add_poziom_fields_to_srodek(self, frame):
        """Dodaje pola poziomu do frame'a środek - dokładne wymiary i pozycje"""
        
        # ========== FRAME "TŁO_POZIOM" (140x35px, pozycja 10,10) ==========
        poziom_frame = QFrame()
        poziom_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
            }
        """)
        poziom_frame.setFixedSize(140, 35)  # 140x35px
        poziom_frame.move(10, 10)  # left: 10px, top: 10px
        poziom_frame.setParent(frame)
        
        # Dodaj tekst "🎯 Poziom:" do frame'a
        poziom_label = QLabel("🎯 Poziom:")
        poziom_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 14px;
                background-color: transparent;
                border: none;
            }
        """)
        poziom_label.setAlignment(Qt.AlignCenter)
        poziom_label.setParent(poziom_frame)
        poziom_label.move(5, 5)  # Wyśrodkuj w frame'ie
        poziom_label.resize(130, 25)  # Dostosuj do frame'a
        
        # ========== POLE POZIOM (60x35px, pozycja 160,10) ==========
        self.poziom_pole = QLineEdit()
        self.poziom_pole.setObjectName("poziom_pole")
        self.poziom_pole.setPlaceholderText("")
        self.poziom_pole.setMaxLength(2)  # Maksymalnie 2 cyfry dla poziomu
        self.poziom_pole.setFixedSize(60, 35)  # 60x35px
        self.poziom_pole.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.poziom_pole.move(160, 10)  # left: 160px, top: 10px
        self.poziom_pole.setParent(frame)
        
        # ========== FRAME "TŁO_PŁEĆ" (140x35px, pozycja 10,51) ==========
        plec_frame = QFrame()
        plec_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
            }
        """)
        plec_frame.setFixedSize(140, 35)  # 140x35px
        plec_frame.move(10, 51)  # left: 10px, top: 51px
        plec_frame.setParent(frame)
        
        # Dodaj tekst "👤 Płeć:" do frame'a
        plec_label = QLabel("👤 Płeć:")
        plec_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 14px;
                background-color: transparent;
                border: none;
            }
        """)
        plec_label.setAlignment(Qt.AlignCenter)
        plec_label.setParent(plec_frame)
        plec_label.move(5, 5)  # Wyśrodkuj w frame'ie
        plec_label.resize(130, 25)  # Dostosuj do frame'a
        
        # ========== POLE PŁEĆ (60x35px, pozycja 160,51) ==========
        self.plec_pole = QLineEdit()
        self.plec_pole.setObjectName("plec_pole")
        self.plec_pole.setPlaceholderText("")
        self.plec_pole.setMaxLength(1)  # Maksymalnie 1 znak (M/K)
        self.plec_pole.setFixedSize(60, 35)  # 60x35px
        self.plec_pole.setStyleSheet("""
            QLineEdit {
                background-color: #194576;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-weight: 900;
                font-size: 14px;
                padding: 5px;
            }
        """)
        self.plec_pole.move(160, 51)  # left: 160px, top: 51px
        self.plec_pole.setParent(frame)
    
    def add_preferencje_fields_to_prawa_strona(self, frame):
        """Dodaje pola preferencji do frame'a prawa strona - dokładne wymiary i pozycje"""
        
        # ========== FRAME "PREFERENCJE" (140x25px, pozycja 84,8) ==========
        preferencje_frame = QFrame()
        preferencje_frame.setStyleSheet("""
            QFrame {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
            }
        """)
        preferencje_frame.setFixedSize(140, 25)  # 140x25px
        preferencje_frame.move(84, 8)  # left: 84px, top: 8px
        preferencje_frame.setParent(frame)
        
        # Dodaj tekst "Preferencje" do frame'a
        preferencje_label = QLabel("Preferencje")
        preferencje_label.setStyleSheet("""
            QLabel {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 14px;
                background-color: transparent;
                border: none;
            }
        """)
        preferencje_label.setAlignment(Qt.AlignCenter)
        preferencje_label.setParent(preferencje_frame)
        preferencje_label.move(5, 2)  # Wyśrodkuj w frame'ie
        preferencje_label.resize(130, 21)  # Dostosuj do frame'a
        
        # ========== RADIO BUTTONY PREFERENCJI ==========
        # Pierwszy rząd (y: 36px)
        
        # 1. "Wszystkie" (pozycja 5, 34)
        self.wszystkie_radio = QRadioButton("Wszystkie")
        self.wszystkie_radio.setObjectName("wszystkie")
        self.wszystkie_radio.setStyleSheet("""
            QRadioButton {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                background-color: transparent;
                border: none;
            }
            QRadioButton::indicator {
                width: 8px;
                height: 8px;
                border: 1px solid #464444;
                border-radius: 4px;
                background-color: transparent;
            }
            QRadioButton::indicator:checked {
                background-color: #FFFFFF;
            }
        """)
        self.wszystkie_radio.move(5, 34)
        self.wszystkie_radio.setParent(frame)
        
        # 2. "Slalom" (pozycja 110, 36) - delikatnie zmniejszony odstęp
        self.slalom_radio = QRadioButton("Slalom")
        self.slalom_radio.setStyleSheet("""
            QRadioButton {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                background-color: transparent;
                border: none;
            }
            QRadioButton::indicator {
                width: 8px;
                height: 8px;
                border: 1px solid #464444;
                border-radius: 4px;
                background-color: transparent;
            }
            QRadioButton::indicator:checked {
                background-color: #FFFFFF;
            }
        """)
        self.slalom_radio.move(110, 36)
        self.slalom_radio.setParent(frame)
        
        # 3. "Poza trasę" (pozycja 190, 36) - delikatnie zmniejszony odstęp
        self.poza_trase_radio = QRadioButton("Poza trasę")
        self.poza_trase_radio.setStyleSheet("""
            QRadioButton {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                background-color: transparent;
                border: none;
            }
            QRadioButton::indicator {
                width: 8px;
                height: 8px;
                border: 1px solid #464444;
                border-radius: 4px;
                background-color: transparent;
            }
            QRadioButton::indicator:checked {
                background-color: #FFFFFF;
            }
        """)
        self.poza_trase_radio.move(190, 36)
        self.poza_trase_radio.setParent(frame)
        
        # Drugi rząd (y: 53px)
        
        # 4. "Cały dzień" (pozycja 5, 53)
        self.caly_dzien_radio = QRadioButton("Cały dzień")
        self.caly_dzien_radio.setStyleSheet("""
            QRadioButton {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                background-color: transparent;
                border: none;
            }
            QRadioButton::indicator {
                width: 8px;
                height: 8px;
                border: 1px solid #464444;
                border-radius: 4px;
                background-color: transparent;
            }
            QRadioButton::indicator:checked {
                background-color: #FFFFFF;
            }
        """)
        self.caly_dzien_radio.move(5, 53)
        self.caly_dzien_radio.setParent(frame)
        
        # 5. "Gigant" (pozycja 110, 53) - delikatnie zmniejszony odstęp
        self.gigant_radio = QRadioButton("Gigant")
        self.gigant_radio.setStyleSheet("""
            QRadioButton {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                background-color: transparent;
                border: none;
            }
            QRadioButton::indicator {
                width: 8px;
                height: 8px;
                border: 1px solid #464444;
                border-radius: 4px;
                background-color: transparent;
            }
            QRadioButton::indicator:checked {
                background-color: #FFFFFF;
            }
        """)
        self.gigant_radio.move(110, 53)
        self.gigant_radio.setParent(frame)
        
        # 6. "Pomiędzy" (pozycja 190, 53) - delikatnie zmniejszony odstęp
        self.pomiedzy_radio = QRadioButton("Pomiędzy")
        self.pomiedzy_radio.setStyleSheet("""
            QRadioButton {
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                background-color: transparent;
                border: none;
            }
            QRadioButton::indicator {
                width: 8px;
                height: 8px;
                border: 1px solid #464444;
                border-radius: 4px;
                background-color: transparent;
            }
            QRadioButton::indicator:checked {
                background-color: #FFFFFF;
            }
        """)
        self.pomiedzy_radio.move(190, 53)
        self.pomiedzy_radio.setParent(frame)
        
        # ========== PRZYCISK "ZNAJDŹ" (147x35px, pozycja 4,80) ==========
        self.znajdz_button = QPushButton("🔍 Znajdź")
        self.znajdz_button.setObjectName("znajdz")
        self.znajdz_button.setStyleSheet("""
            QPushButton {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: #1a4a7a;
            }
            QPushButton:pressed {
                background-color: #0f3a5a;
            }
        """)
        self.znajdz_button.setFixedSize(147, 35)  # 147x35px
        self.znajdz_button.move(4, 80)  # left: 4px, top: 80px
        self.znajdz_button.setParent(frame)
        
        
        # ========== PRZYCISK "WYCZYŚĆ" (147x35px, pozycja 156,80) ==========
        self.wyczysc_button = QPushButton("🧹 Wyczyść")
        self.wyczysc_button.setObjectName("wyczysc")
        self.wyczysc_button.setStyleSheet("""
            QPushButton {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: #1a4a7a;
            }
            QPushButton:pressed {
                background-color: #0f3a5a;
            }
        """)
        self.wyczysc_button.setFixedSize(147, 35)  # 147x35px
        self.wyczysc_button.move(156, 80)  # left: 156px, top: 80px
        self.wyczysc_button.setParent(frame)
        
        # ========== PRZYCISK "PRZEGLĄDAJ" (147x35px, pozycja 4,120) ==========
        self.przegladaj_button = QPushButton("📋 Przeglądaj")
        self.przegladaj_button.setObjectName("przegladaj")
        self.przegladaj_button.setStyleSheet("""
            QPushButton {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: #1a4a7a;
            }
            QPushButton:pressed {
                background-color: #0f3a5a;
            }
        """)
        self.przegladaj_button.setFixedSize(147, 35)  # 147x35px
        self.przegladaj_button.move(4, 120)  # left: 4px, top: 120px
        self.przegladaj_button.setParent(frame)
        
        # ========== PRZYCISK "REZERWACJE" (147x35px, pozycja 156,120) ==========
        self.rezerwacje_button = QPushButton("📅 Rezerwacje")
        self.rezerwacje_button.setObjectName("rezerwacje")
        self.rezerwacje_button.setStyleSheet("""
            QPushButton {
                background-color: #194576;
                border: 1px solid #FFFFFF;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif;
                font-style: italic;
                font-weight: 900;
                font-size: 15px;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: #1a4a7a;
            }
            QPushButton:pressed {
                background-color: #0f3a5a;
            }
        """)
        self.rezerwacje_button.setFixedSize(147, 35)  # 147x35px
        self.rezerwacje_button.move(156, 120)  # left: 156px, top: 120px
        self.rezerwacje_button.setParent(frame)
        
    def setup_styles(self):
        """Konfiguruje style aplikacji"""
        self.setStyleSheet(get_application_stylesheet())
    
    def connect_buttons(self):
        """Łączy przyciski z funkcjami"""
        try:
            # Znajdź przyciski w interfejsie
            znajdz_btn = self.findChild(QPushButton, "znajdz")
            wyczysc_btn = self.findChild(QPushButton, "wyczysc")
            przegladaj_btn = self.findChild(QPushButton, "przegladaj")
            rezerwacje_btn = self.findChild(QPushButton, "rezerwacje")
            
            if znajdz_btn:
                znajdz_btn.clicked.connect(self.znajdz_i_wyswietl)
            if wyczysc_btn:
                wyczysc_btn.clicked.connect(self.wyczysc_formularz)
            if przegladaj_btn:
                przegladaj_btn.clicked.connect(self.pokaz_wszystkie_narty)
            if rezerwacje_btn:
                rezerwacje_btn.clicked.connect(self.odswiez_rezerwacje)
                
            logger.info("Przyciski połączone z funkcjami")
        except Exception as e:
            logger.error(f"Błąd podczas łączenia przycisków: {e}")
    
    def setup_validators(self):
        """Ustawia walidatory dla pól"""
        try:
            # Walidator dla wzrostu (100-250 cm)
            wzrost_validator = QRegExpValidator(QRegExp(r"^(1[0-9][0-9]|2[0-4][0-9]|250)$"))
            wzrost_pole = self.findChild(QLineEdit, "wzrost_pole")
            if wzrost_pole:
                wzrost_pole.setValidator(wzrost_validator)
            
            # Walidator dla wagi (20-200 kg)
            waga_validator = QRegExpValidator(QRegExp(r"^(2[0-9]|[3-9][0-9]|1[0-9][0-9]|200)$"))
            waga_pole = self.findChild(QLineEdit, "waga_pole")
            if waga_pole:
                waga_pole.setValidator(waga_validator)
            
            # Walidator dla poziomu (1-6)
            poziom_validator = QRegExpValidator(QRegExp(r"^[1-6]$"))
            poziom_pole = self.findChild(QLineEdit, "poziom_pole")
            if poziom_pole:
                poziom_pole.setValidator(poziom_validator)
            
            logger.info("Walidatory ustawione")
        except Exception as e:
            logger.error(f"Błąd podczas ustawiania walidatorów: {e}")
    
    def setup_date_handlers(self):
        """Ustawia obsługę automatycznego przechodzenia między polami"""
        try:
            # Automatyczne przechodzenie między polami daty
            data_od_dzien = self.findChild(QLineEdit, "od_dzien")
            data_od_miesiac = self.findChild(QLineEdit, "od_miesiac")
            data_od_rok = self.findChild(QLineEdit, "od_rok")
            data_do_dzien = self.findChild(QLineEdit, "do_dzien")
            data_do_miesiac = self.findChild(QLineEdit, "do_miesiac")
            data_do_rok = self.findChild(QLineEdit, "do_rok")
            
            # Pola główne formularza
            wzrost_pole = self.findChild(QLineEdit, "wzrost_pole")
            waga_pole = self.findChild(QLineEdit, "waga_pole")
            poziom_pole = self.findChild(QLineEdit, "poziom_pole")
            plec_pole = self.findChild(QLineEdit, "plec_pole")
            
            # Automatyczne przechodzenie między polami daty
            if data_od_dzien and data_od_miesiac:
                data_od_dzien.textChanged.connect(lambda: self.auto_next_field(data_od_dzien, data_od_miesiac))
            if data_od_miesiac and data_od_rok:
                data_od_miesiac.textChanged.connect(lambda: self.auto_next_field(data_od_miesiac, data_od_rok))
            if data_od_rok and data_do_dzien:
                data_od_rok.textChanged.connect(lambda: self.auto_next_field(data_od_rok, data_do_dzien))
            if data_do_dzien and data_do_miesiac:
                data_do_dzien.textChanged.connect(lambda: self.auto_next_field(data_do_dzien, data_do_miesiac))
            if data_do_miesiac and data_do_rok:
                data_do_miesiac.textChanged.connect(lambda: self.auto_next_field(data_do_miesiac, data_do_rok))
            
            # Przejście z roku "do" do pola wzrost
            if data_do_rok and wzrost_pole:
                data_do_rok.textChanged.connect(lambda: self.auto_next_field(data_do_rok, wzrost_pole))
            
            # Automatyczne przechodzenie między głównymi polami formularza
            if wzrost_pole and waga_pole:
                wzrost_pole.textChanged.connect(lambda: self.auto_next_field(wzrost_pole, waga_pole))
            if waga_pole and poziom_pole:
                waga_pole.textChanged.connect(lambda: self.auto_next_field(waga_pole, poziom_pole))
            if poziom_pole and plec_pole:
                poziom_pole.textChanged.connect(lambda: self.auto_next_field(poziom_pole, plec_pole))
            
            # Automatyczne uzupełnianie roku dla pól daty
            if data_od_rok:
                data_od_rok.textChanged.connect(lambda: self.auto_complete_year_safe(data_od_rok))
            if data_do_rok:
                data_do_rok.textChanged.connect(lambda: self.auto_complete_year_safe(data_do_rok))
            
            logger.info("Obsługa dat ustawiona")
        except Exception as e:
            logger.error(f"Błąd podczas ustawiania obsługi dat: {e}")
    
    def auto_complete_year_safe(self, year_field):
        """Bezpieczne uzupełnianie roku"""
        try:
            text = year_field.text()
            if len(text) == 2 and text.isdigit():
                current_year = 2025
                year_2digit = int(text)
                if year_2digit <= 30:  # 2025-2030
                    year_field.setText(f"20{text}")
                else:  # 2000-2024
                    year_field.setText(f"19{text}")
            elif len(text) == 4 and text.isdigit():
                # Jeśli użytkownik wpisał pełny rok, nie rób nic
                pass
        except Exception as e:
            logger.error(f"Błąd podczas uzupełniania roku: {e}")
    
    def auto_next_field(self, current_field, next_field):
        """Automatyczne przechodzenie do następnego pola"""
        try:
            text = current_field.text()
            if text:
                # Dla pól daty (dzień, miesiąc) - przejdź po 2 znakach
                if current_field.objectName() in ["od_dzien", "od_miesiac", "do_dzien", "do_miesiac"]:
                    if len(text) >= 2:
                        next_field.setFocus()
                # Dla pola roku - przejdź po 4 znakach
                elif current_field.objectName() in ["od_rok", "do_rok"]:
                    if len(text) >= 4:
                        next_field.setFocus()
                # Dla głównych pól formularza - przejdź po odpowiedniej liczbie znaków
                elif current_field.objectName() == "wzrost_pole":
                    if len(text) >= 3:  # Wzrost 100-250
                        next_field.setFocus()
                elif current_field.objectName() == "waga_pole":
                    if len(text) >= 2:  # Waga 20-200
                        next_field.setFocus()
                elif current_field.objectName() == "poziom_pole":
                    if len(text) >= 1:  # Poziom 1-6
                        next_field.setFocus()
                elif current_field.objectName() == "plec_pole":
                    if len(text) >= 1:  # Płeć M/K
                        next_field.setFocus()
        except Exception as e:
            logger.error(f"Błąd podczas przechodzenia do następnego pola: {e}")
    
    def open_calendar(self, target):
        """Otwiera kalendarz dla wybranego pola"""
        try:
            dialog = DatePickerDialog()
            if dialog.exec_() == QDialog.Accepted:
                date = dialog.get_selected_date()
                if target:
                    target.setText(date.toString("dd.MM.yyyy"))
        except Exception as e:
            logger.error(f"Błąd podczas otwierania kalendarza: {e}")
    
    def znajdz_i_wyswietl(self):
        """Główna funkcja wyszukiwania nart"""
        try:
            # Pobierz dane z formularza
            wzrost_text = self.findChild(QLineEdit, "wzrost_pole").text()
            waga_text = self.findChild(QLineEdit, "waga_pole").text()
            poziom_text = self.findChild(QLineEdit, "poziom_pole").text()
            plec_text = self.findChild(QLineEdit, "plec_pole").text()
            
            # Walidacja danych
            if not all([wzrost_text, waga_text, poziom_text, plec_text]):
                QMessageBox.warning(self, "Błąd", "Wszystkie pola są wymagane!")
                return
            
            try:
                wzrost = int(wzrost_text)
                waga = int(waga_text)
                poziom = int(poziom_text)
                
                # Mapuj płeć z M/K na pełne nazwy
                plec_mapping = {
                    'M': 'Mężczyzna',
                    'K': 'Kobieta',
                    'U': 'Wszyscy'
                }
                plec = plec_mapping.get(plec_text.upper(), 'Wszyscy')
                logger.info(f"Mapowanie płci: '{plec_text}' -> '{plec}'")
            except ValueError:
                QMessageBox.warning(self, "Błąd", "Nieprawidłowe dane liczbowe!")
                return
            
            # Pobierz wybrany styl jazdy i mapuj na kody
            styl_jazdy = None
            for radio in self.findChildren(QRadioButton):
                if radio.isChecked() and radio.text() != "Wszystkie":
                    # Mapuj nazwy stylów na kody zgodne z bazą danych
                    style_mapping = {
                        'Slalom': 'SL',
                        'Gigant': 'G', 
                        'Cały dzień': 'C',
                        'Poza trasę': 'OFF',
                        'Pomiędzy': 'SLG'
                    }
                    styl_jazdy = style_mapping.get(radio.text(), radio.text())
                    break
            
            # Wyszukaj narty
            idealne, poziom_za_nisko, alternatywy, inna_plec = dobierz_narty(
                wzrost, waga, poziom, plec, styl_jazdy
            )
            
            # Wyświetl wyniki
            self.wyswietl_wyniki(idealne, poziom_za_nisko, alternatywy, inna_plec)
            
        except Exception as e:
            logger.error(f"Błąd podczas wyszukiwania nart: {e}")
            QMessageBox.critical(self, "Błąd", f"Wystąpił błąd: {e}")
    
    def wyswietl_wyniki(self, idealne, poziom_za_nisko, alternatywy, inna_plec):
        """
        Bezpieczne wyświetlenie wyników w frame6.
        Jeśli istnieje widget o objectName 'results_text' — aktualizujemy jego HTML.
        W przeciwnym wypadku tworzymy QTextBrowser i dodajemy go do layoutu.
        """
        logger.info("Wchodzę do wyswietl_wyniki")
        frame6 = self.findChild(QFrame, "frame6")
        if not frame6:
            logger.error("wyswietl_wyniki: Nie znaleziono frame6")
            return

        layout = self.ensure_frame6_layout()
        if layout is None:
            logger.error("wyswietl_wyniki: Brak layoutu dla frame6")
            return

        # Wczytaj rezerwacje raz dla wszystkich nart
        try:
            from dane.wczytywanie_danych import wczytaj_rezerwacje_firesnow
            rezerwacje_cache = wczytaj_rezerwacje_firesnow()
        except Exception as e:
            logger.warning(f"Nie udało się wczytać rezerwacji: {e}")
            rezerwacje_cache = None

        # Spróbuj znaleźć istniejący widget wyników
        results_widget = frame6.findChild(QTextBrowser, "results_text")
        html = self.build_results_html(idealne, poziom_za_nisko, alternatywy, inna_plec, rezerwacje_cache)

        if results_widget:
            logger.info("Aktualizuję istniejący widget results_text")
            results_widget.setHtml(html)
        else:
            logger.info("Tworzę nowy widget results_text i dodaję do layoutu")
            results_widget = QTextBrowser()
            results_widget.setObjectName("results_text")
            results_widget.setHtml(html)
            results_widget.setOpenExternalLinks(True)
            # Pozostaw przezroczyste tło, żeby widać niebieski frame6
            results_widget.setStyleSheet("background: transparent; border: none;")
            results_widget.setMinimumHeight(120)
            layout.addWidget(results_widget)

        logger.info("Wyniki wyświetlone (metoda wyswietl_wyniki zakończona)")
    
    def wyswietl_jedna_narte(self, narta_info, w, s, p, plec_klienta, data_od=None, data_do=None):
        """Wyświetla informacje o jednej narcie"""
        try:
            # Sprawdź czy narta jest zarezerwowana
            zarezerwowana = sprawdz_czy_narta_zarezerwowana(narta_info.get('ID', ''), data_od, data_do)
            
            # Przygotuj informacje o narcie
            info = f"""
            <b>Marka:</b> {narta_info.get('MARKA', 'N/A')}<br>
            <b>Model:</b> {narta_info.get('MODEL', 'N/A')}<br>
            <b>Długość:</b> {narta_info.get('DLUGOSC', 'N/A')} cm<br>
            <b>Poziom:</b> {narta_info.get('POZIOM', 'N/A')}<br>
            <b>Płeć:</b> {narta_info.get('PLEC', 'N/A')}<br>
            <b>Status:</b> {'🔴 ZAREZERWOWANA' if zarezerwowana else '🟢 DOSTĘPNA'}
            """
            
            QMessageBox.information(self, "Szczegóły narty", info)
            
        except Exception as e:
            logger.error(f"Błąd podczas wyświetlania szczegółów narty: {e}")
    
    def wyczysc_formularz(self):
        """Czyści formularz"""
        try:
            # Wyczyść pola tekstowe
            for field in self.findChildren(QLineEdit):
                field.clear()
            
            # Ustaw domyślny radio button
            wszystkie_radio = self.findChild(QRadioButton, "wszystkie")
            if wszystkie_radio:
                wszystkie_radio.setChecked(True)
            
            # Wyczyść wyniki
            wyniki_widget = self.findChild(QWidget, "wyniki")
            if wyniki_widget:
                for child in wyniki_widget.findChildren(QTextEdit):
                    child.clear()
            
            logger.info("Formularz wyczyszczony")
            
        except Exception as e:
            logger.error(f"Błąd podczas czyszczenia formularza: {e}")
    
    def odswiez_rezerwacje(self):
        """Wyświetla wszystkie rezerwacje z pliku FireSnow"""
        try:
            from dane.wczytywanie_danych import wczytaj_rezerwacje_firesnow
            import pandas as pd
            
            # Wczytaj rezerwacje
            rezerwacje = wczytaj_rezerwacje_firesnow()
            
            if rezerwacje.empty:
                self.wyniki_widget.setHtml("<p>ℹ️ Brak rezerwacji nart w pliku</p>")
                return
            
            # Wyczyść okno wyników i wyświetl nagłówek
            html_content = """
            <div style="font-family: 'ADLaM Display', 'Segoe UI Black', 'Arial Black', sans-serif; color: #FFFFFF; background-color: #1a1a1a; padding: 20px;">
                <h2 style="color: #4CAF50; margin-bottom: 20px;">🔄 REZERWACJE Z FIRESNOW</h2>
                <hr style="border: 1px solid #4CAF50; margin-bottom: 20px;">
                <p style="color: #4CAF50; font-size: 16px; margin-bottom: 20px;">📊 Znaleziono {} rezerwacji nart</p>
            """.format(len(rezerwacje))
            
            # Wyświetl każdą rezerwację
            for i, (_, rez) in enumerate(rezerwacje.iterrows(), 1):
                # Wyciągnij informacje o narcie z opisu sprzętu
                sprzet = rez.get('Sprzęt', '')
                if 'NARTY' in sprzet:
                    parts = sprzet.split()
                    if len(parts) >= 4:
                        marka = parts[1] if len(parts) > 1 else "Nieznana"
                        dlugosc = "Nieznana"
                        for part in parts:
                            if 'cm' in part:
                                dlugosc = part.replace('cm', '').strip()
                                break
                        numer = "Brak"
                        for part in parts:
                            if part.startswith('//') and len(part) > 2:
                                numer = part
                                break
                    else:
                        marka = "Nieznana"
                        dlugosc = "Nieznana"
                        numer = "Brak"
                else:
                    marka = "Nieznana"
                    dlugosc = "Nieznana"
                    numer = "Brak"
                
                # Konwertuj daty
                try:
                    data_od = pd.to_datetime(rez['Od']).strftime('%Y-%m-%d')
                    data_do = pd.to_datetime(rez['Do']).strftime('%Y-%m-%d')
                except:
                    data_od = "Brak daty"
                    data_do = "Brak daty"
                
                klient = rez.get('Klient', 'Nieznany')
                
                # Dodaj rezerwację do HTML
                html_content += f"""
                <div style="margin-bottom: 20px; padding: 15px; background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid #4CAF50;">
                    <h3 style="color: #4CAF50; margin: 0 0 10px 0;">{i}. 🎿 {marka} ({dlugosc} cm)</h3>
                    <p style="margin: 5px 0; color: #FFFFFF;">📅 Okres: {data_od} - {data_do}</p>
                    <p style="margin: 5px 0; color: #FFFFFF;">👤 Klient: {klient}</p>
                    <p style="margin: 5px 0; color: #FFFFFF;">🔢 Numer: {numer}</p>
                </div>
                """
            
            html_content += "</div>"
            self.wyniki_widget.setHtml(html_content)
            logger.info(f"Wyświetlono {len(rezerwacje)} rezerwacji")
            
        except Exception as e:
            logger.error(f"Błąd podczas wyświetlania rezerwacji: {e}")
            self.wyniki_widget.setHtml(f"<p style='color: #ff4444;'>❌ BŁĄD WYŚWIETLANIA REZERWACJI: {e}</p>")
    
    def pokaz_wszystkie_narty(self):
        """Pokazuje okno przeglądania wszystkich nart z tabelą"""
        try:
            from dane.wczytywanie_danych import wczytaj_narty
            narty = wczytaj_narty()
            
            if not narty:
                QMessageBox.warning(self, "Błąd", "Nie znaleziono nart w bazie danych")
                return
            
            # Utwórz okno dialogowe z tabelą
            dialog = QDialog(self)
            dialog.setWindowTitle("Wszystkie narty")
            dialog.setModal(True)
            dialog.resize(800, 600)
            
            layout = QVBoxLayout(dialog)
            
            # Utwórz tabelę
            table = QTableWidget()
            table.setRowCount(len(narty))
            table.setColumnCount(10)
            table.setHorizontalHeaderLabels(["Marka", "Model", "Długość", "Poziom", "Płeć", "Waga Min", "Waga Max", "Wzrost Min", "Wzrost Max", "Przeznaczenie"])
            
            # Wypełnij tabelę
            for i, narta in enumerate(narty):
                table.setItem(i, 0, QTableWidgetItem(narta.get('MARKA', '')))
                table.setItem(i, 1, QTableWidgetItem(narta.get('MODEL', '')))
                table.setItem(i, 2, QTableWidgetItem(narta.get('DLUGOSC', '')))
                table.setItem(i, 3, QTableWidgetItem(narta.get('POZIOM', '')))
                table.setItem(i, 4, QTableWidgetItem(narta.get('PLEC', '')))
                table.setItem(i, 5, QTableWidgetItem(narta.get('WAGA_MIN', '')))
                table.setItem(i, 6, QTableWidgetItem(narta.get('WAGA_MAX', '')))
                table.setItem(i, 7, QTableWidgetItem(narta.get('WZROST_MIN', '')))
                table.setItem(i, 8, QTableWidgetItem(narta.get('WZROST_MAX', '')))
                table.setItem(i, 9, QTableWidgetItem(narta.get('PRZEZNACZENIE', '')))
            
            layout.addWidget(table)
            dialog.exec_()
            
        except Exception as e:
            logger.error(f"Błąd podczas pokazywania wszystkich nart: {e}")
            QMessageBox.critical(self, "Błąd", f"Błąd podczas pokazywania nart: {e}")
    
    def load_data(self):
        """Ładuje dane z CSV do tabeli"""
        try:
            from dane.wczytywanie_danych import wczytaj_narty, wczytaj_rezerwacje_firesnow
            self.rezerwacje_data = wczytaj_rezerwacje_firesnow()
            logger.info(f"Załadowano {len(self.rezerwacje_data)} rezerwacji")
        except Exception as e:
            logger.error(f"Błąd podczas ładowania danych: {e}")
    
    def apply_filters(self):
        """Stosuje filtry do danych"""
        pass  # Implementacja w przyszłości
    
    def clear_filters(self):
        """Czyści wszystkie filtry"""
        pass  # Implementacja w przyszłości
    
    def update_table(self):
        """Aktualizuje tabelę z przefiltrowanymi danymi"""
        pass  # Implementacja w przyszłości
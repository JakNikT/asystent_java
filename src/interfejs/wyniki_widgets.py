"""
Moduł widgetów wyników
Zawiera komponenty do wyświetlania wyników wyszukiwania nart
"""
from PyQt5.QtWidgets import (QWidget, QLabel, QScrollArea, QVBoxLayout, 
                             QHBoxLayout, QFrame, QPushButton, QTextBrowser)
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont, QPixmap

# ========== STAŁE UI ==========
# Wymiary głównych elementów
WYNIKI_WIDTH = 1100
WYNIKI_HEIGHT = 669
WYNIKI_POS = (0, 200)

class WynikiWidget(QWidget):
    """Główny widget wyników"""
    
    # Sygnały
    narta_wybrana = pyqtSignal(dict)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.setup_connections()
    
    def setup_ui(self):
        """Tworzy UI wyników"""
        self.setObjectName("wyniki")
        self.setFixedSize(WYNIKI_WIDTH, WYNIKI_HEIGHT)
        self.setStyleSheet("""
            QWidget#wyniki {
                background: #194576;
                border-radius: 20px;
                border: none;
            }
        """)
        
        # Tytuł
        self.tytul = QLabel("WYNIKI WYSZUKIWANIA")
        self.tytul.setObjectName("tytul_wyniki")
        self.tytul.setFixedSize(400, 30)
        self.tytul.move(20, 20)
        self.tytul.setParent(self)
        self.tytul.setAlignment(Qt.AlignCenter)
        self.tytul.setStyleSheet("""
            QLabel#tytul_wyniki {
                color: #FFFFFF;
                font-size: 18px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        # Scroll area dla wyników
        self.scroll_area = QScrollArea()
        self.scroll_area.setObjectName("scroll_wyniki")
        self.scroll_area.setFixedSize(1060, 600)
        self.scroll_area.move(20, 60)
        self.scroll_area.setParent(self)
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.scroll_area.setStyleSheet("""
            QScrollArea#scroll_wyniki {
                background: transparent;
                border: none;
            }
            QScrollBar:vertical {
                background: #A6C2EF;
                width: 15px;
                border-radius: 7px;
            }
            QScrollBar::handle:vertical {
                background: #012B5A;
                border-radius: 7px;
                min-height: 20px;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
        """)
        
        # Kontener dla kart nart
        self.karty_container = QWidget()
        self.karty_container.setObjectName("karty_container")
        self.karty_container.setMinimumWidth(1040)
        
        # Layout dla kart
        self.karty_layout = QVBoxLayout(self.karty_container)
        self.karty_layout.setContentsMargins(10, 10, 10, 10)
        self.karty_layout.setSpacing(15)
        self.karty_layout.setAlignment(Qt.AlignTop)
        
        self.scroll_area.setWidget(self.karty_container)
        
        # Przycisk odświeżania
        self.refresh_button = QPushButton("🔄 Odśwież")
        self.refresh_button.setObjectName("refresh_button")
        self.refresh_button.setFixedSize(100, 30)
        self.refresh_button.move(980, 20)
        self.refresh_button.setParent(self)
        self.refresh_button.setStyleSheet("""
            QPushButton#refresh_button {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 15px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
            QPushButton#refresh_button:hover {
                background: #8BB0E8;
            }
            QPushButton#refresh_button:pressed {
                background: #6B9DE0;
            }
        """)
    
    def setup_connections(self):
        """Konfiguruje połączenia sygnałów"""
        self.refresh_button.clicked.connect(self._on_refresh_clicked)
    
    def _on_refresh_clicked(self):
        """Obsługuje kliknięcie przycisku odświeżania"""
        self.clear_results()
    
    def display_results(self, idealne, poziom_za_nisko, alternatywy, inna_plec, klient_data, rezerwacje_cache=None):
        """Wyświetla wyniki wyszukiwania"""
        self.clear_results()
        
        # Importuj widget karty nart
        from .karty_nart_widgets import SkiCardWidget
        
        # IDEALNE DOPASOWANIA
        if idealne:
            self._add_section_header("✅ IDEALNE DOPASOWANIA", len(idealne))
            for narta in idealne:
                card = SkiCardWidget(narta, klient_data, self.karty_container)
                card.clicked.connect(lambda checked, n=narta: self.narta_wybrana.emit(n))
                self.karty_layout.addWidget(card)
        
        # POZIOM ZA NISKO
        if poziom_za_nisko:
            self._add_section_header("🟡 POZIOM ZA NISKO", len(poziom_za_nisko))
            for narta in poziom_za_nisko:
                card = SkiCardWidget(narta, klient_data, self.karty_container)
                card.clicked.connect(lambda checked, n=narta: self.narta_wybrana.emit(n))
                self.karty_layout.addWidget(card)
        
        # ALTERNATYWY
        if alternatywy:
            self._add_section_header("⚠️ ALTERNATYWY", len(alternatywy))
            for narta in alternatywy:
                card = SkiCardWidget(narta, klient_data, self.karty_container)
                card.clicked.connect(lambda checked, n=narta: self.narta_wybrana.emit(n))
                self.karty_layout.addWidget(card)
        
        # INNA PŁEĆ
        if inna_plec:
            self._add_section_header("👥 INNA PŁEĆ", len(inna_plec))
            for narta in inna_plec:
                card = SkiCardWidget(narta, klient_data, self.karty_container)
                card.clicked.connect(lambda checked, n=narta: self.narta_wybrana.emit(n))
                self.karty_layout.addWidget(card)
        
        # Brak wyników
        if not any([idealne, poziom_za_nisko, alternatywy, inna_plec]):
            self._add_no_results_message()
    
    def _add_section_header(self, title, count):
        """Dodaje nagłówek sekcji"""
        header = QLabel(f"{title} ({count})")
        header.setObjectName("section_header")
        header.setFixedSize(1000, 25)
        header.setStyleSheet("""
            QLabel#section_header {
                color: #FFFFFF;
                font-size: 16px;
                font-weight: bold;
                background-color: transparent;
                border: none;
                margin: 10px 0 5px 0;
            }
        """)
        self.karty_layout.addWidget(header)
    
    def _add_no_results_message(self):
        """Dodaje komunikat o braku wyników"""
        message = QLabel("Brak dopasowanych nart dla podanych kryteriów.")
        message.setObjectName("no_results")
        message.setFixedSize(1000, 30)
        message.setAlignment(Qt.AlignCenter)
        message.setStyleSheet("""
            QLabel#no_results {
                color: #B3B1B1;
                font-size: 14px;
                font-style: italic;
                background-color: transparent;
                border: none;
                margin: 20px 0;
            }
        """)
        self.karty_layout.addWidget(message)
    
    def clear_results(self):
        """Czyści wyniki"""
        # Usuń wszystkie widgety z layoutu
        while self.karty_layout.count():
            child = self.karty_layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()
    
    def get_results_count(self):
        """Zwraca liczbę wyświetlanych wyników"""
        return self.karty_layout.count()


class DetailedResultsWidget(QTextBrowser):
    """Widget do wyświetlania szczegółowych wyników w formacie HTML"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
    
    def setup_ui(self):
        """Konfiguruje widget szczegółowych wyników"""
        self.setObjectName("detailed_results")
        self.setOpenExternalLinks(True)
        self.setStyleSheet("""
            QTextBrowser#detailed_results {
                background: transparent;
                border: none;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 13px;
                color: #012B5A;
            }
        """)
        self.setMinimumHeight(120)
    
    def display_detailed_results(self, idealne, poziom_za_nisko, alternatywy, inna_plec, rezerwacje_cache=None):
        """Wyświetla szczegółowe wyniki w formacie HTML"""
        html = self._build_detailed_html(idealne, poziom_za_nisko, alternatywy, inna_plec, rezerwacje_cache)
        self.setHtml(html)
    
    def _build_detailed_html(self, idealne, poziom_za_nisko, alternatywy, inna_plec, rezerwacje_cache=None):
        """Buduje HTML szczegółowych wyników"""
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
        """Formatuje pojedynczą nartę w formacie szczegółowym"""
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
            
            # Sprawdź dostępność
            dostepnosc = self._check_availability(marka, model, dlugosc, rezerwacje_cache)
            
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
            return f"<div>Błąd formatowania: {e}</div>"
    
    def _format_dopasowanie_details(self, dopasowanie):
        """Formatuje szczegóły dopasowania"""
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
            return "Błąd formatowania"
    
    def _check_availability(self, marka, model, dlugosc, rezerwacje_cache=None):
        """Sprawdza dostępność nart na podstawie rezerwacji"""
        try:
            if rezerwacje_cache is None or rezerwacje_cache.empty:
                return "🟩1 🟩2"  # Domyślnie dostępne
            
            # Sprawdź czy narta jest zarezerwowana
            from src.dane.wczytywanie_danych import sprawdz_czy_narta_zarezerwowana
            is_reserved, reservation_info, numer = sprawdz_czy_narta_zarezerwowana(
                marka, model, dlugosc, None, None, rezerwacje_cache
            )
            
            if is_reserved:
                return f"🟩1 🔴2<br/>🚫 Zarezerwowana: {reservation_info} (Nr: {numer})"
            else:
                return "🟩1 🟩2"
        except Exception as e:
            return "🟩1 🟩2"

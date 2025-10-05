"""
Moduł widgetów kart nart
Zawiera komponenty do wyświetlania kart nart w wynikach
"""
from PyQt5.QtWidgets import (QFrame, QLabel, QHBoxLayout, QMessageBox)
from PyQt5.QtCore import Qt

# ========== STAŁE UI ==========
# Wymiary kart nart
CARD_WIDTH = 467
CARD_HEIGHT = 131
CARD_X_POS = 36
CARD_Y_POS = 32

class SkiCardWidget(QFrame):
    """Widget karty nart - dokładna kopia z test_karty_nart.py"""
    def __init__(self, narta_info, klient_data, rezerwacje_cache=None, parent_window=None, parent=None):
        super().__init__(parent)
        self.narta_info = narta_info
        self.klient_data = klient_data
        self.rezerwacje_cache = rezerwacje_cache
        self.parent_window = parent_window
        self.setup_ui()
    
    def get_criteria_color(self, criteria_name):
        """Zwraca kolor tła na podstawie dopasowania kryterium"""
        dopasowanie = self.narta_info.get('dopasowanie', {})
        criteria = dopasowanie.get(criteria_name)
        
        if not criteria:
            return "#A6C2EF"  # Domyślny kolor
        
        status = criteria[0]  # 'green', 'orange', 'red'
        
        if status == 'green':
            return "#4CAF50"  # Zielony
        elif status == 'orange':
            return "#FF9800"  # Pomarańczowy
        elif status == 'red':
            return "#F44336"  # Czerwony
        else:
            return "#A6C2EF"  # Domyślny
    
    def get_criteria_text_color(self, criteria_name):
        """Zwraca kolor tekstu na podstawie dopasowania kryterium"""
        dopasowanie = self.narta_info.get('dopasowanie', {})
        criteria = dopasowanie.get(criteria_name)
        
        if not criteria:
            return "#B3B1B1"  # Domyślny szary kolor tekstu
        
        status = criteria[0]  # 'green', 'orange', 'red'
        
        if status == 'green':
            return "#4CAF50"  # Zielony
        elif status == 'orange':
            return "#FF9800"  # Pomarańczowy
        elif status == 'red':
            return "#F44336"  # Czerwony
        else:
            return "#B3B1B1"  # Domyślny szary
    
    def setup_ui(self):
        """Tworzy UI karty nart - dokładnie jak w test_karty_nart.py"""
        # ========== GŁÓWNA KARTA NART (467x131px) ==========
        self.setObjectName("karta_nart")
        self.setFixedSize(467, 131)  # 467x131px
        self.setStyleSheet("""
            QFrame#karta_nart {
                background: #194576;
                border-radius: 20px;
                border: 2px solid #FFFFFF;
            }
        """)
        
        # Pobierz dane
        dane = self.narta_info.get('dane', {})
        wspolczynnik = self.narta_info.get('wspolczynnik_idealnosci', 0)
        dopasowanie = self.narta_info.get('dopasowanie', {})
        
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
                border-radius: 9px;
                color: #012B5A;
                font-size: 14px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        # ========== POLE INFORMACJI O NARTACH (200x19px, pozycja 10,43) ==========
        # Generuj znaczki na podstawie rzeczywistej liczby sztuk
        ilosc = int(dane.get('ILOSC', 2))  # Domyślnie 2 jeśli brak danych
        
        # Stwórz kontener dla znaczków
        info_container = QFrame()
        info_container.setObjectName("info_container")
        info_container.setFixedSize(200, 19)  # 200x19px
        info_container.move(10, 43)  # left: 10px, top: 43px względem karta_nart
        info_container.setParent(self)
        info_container.setStyleSheet("""
            QFrame#info_container {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 9px;
            }
        """)
        
        # Stwórz layout poziomy dla znaczków
        layout = QHBoxLayout(info_container)
        layout.setContentsMargins(5, 2, 5, 2)
        layout.setSpacing(3)
        
        # Sprawdź rezerwacje dla tej narty
        from src.dane.wczytywanie_danych import sprawdz_zarezerwowane_sztuki
        from PyQt5.QtCore import QTimer
        
        # Pobierz daty z formularza (przez parent window)
        data_od = None
        data_do = None
        
        if self.parent_window and hasattr(self.parent_window, 'od_rok'):
            try:
                # Pobierz daty z formularza w formacie DD.MM.YYYY
                dzien_od = self.parent_window.od_dzien.text()
                miesiac_od = self.parent_window.od_miesiac.text()
                rok_od = self.parent_window.od_rok.text()
                dzien_do = self.parent_window.do_dzien.text()
                miesiac_do = self.parent_window.do_miesiac.text()
                rok_do = self.parent_window.do_rok.text()
                
                # Konwertuj na format YYYY-MM-DD
                from datetime import datetime
                data_od = datetime.strptime(f"{dzien_od}.{miesiac_od}.{rok_od}", '%d.%m.%Y').strftime('%Y-%m-%d')
                data_do = datetime.strptime(f"{dzien_do}.{miesiac_do}.{rok_do}", '%d.%m.%Y').strftime('%Y-%m-%d')
            except Exception as e:
                print(f"Błąd konwersji dat: {e}")
                pass
        
        # Sprawdź które sztuki są zarezerwowane
        zarezerwowane_sztuki = []
        if data_od and data_do and self.rezerwacje_cache is not None:
            try:
                zarezerwowane_sztuki = sprawdz_zarezerwowane_sztuki(
                    marka, model, dlugosc, data_od, data_do, self.rezerwacje_cache
                )
            except Exception as e:
                print(f"DEBUG: Błąd sprawdzania rezerwacji: {e}")
                pass
        
        zarezerwowane_numerki = {sztuka['numer']: sztuka for sztuka in zarezerwowane_sztuki}
        
        # Dodaj każdy znaczek jako osobny QLabel
        for i in range(1, ilosc + 1):
            if i in zarezerwowane_numerki:
                # Ta sztuka jest zarezerwowana
                info = zarezerwowane_numerki[i]['info']
                square = QLabel(f"🔴{i}")
                square.setToolTip(f"Zarezerwowana: {info}")
                square.setStyleSheet("""
                    QLabel {
                        color: #012B5A;
                        font-size: 12px;
                        font-weight: bold;
                        background: transparent;
                        border: none;
                        cursor: pointer;
                    }
                """)
                # Dodaj obsługę kliknięcia
                square.mousePressEvent = lambda event, info=info: self.show_reservation_details(info)
            else:
                # Ta sztuka jest dostępna
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
        
        # ========== WSPÓŁCZYNNIK DOPASOWANIA (pozycja 13,108) - LEWY DOLNY RÓG ==========
        dopasowanie_text = f"Dopasowanie: {wspolczynnik}%"
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
        
        
        # ========== NAPISY I POLA PARAMETRÓW ==========
        
        # WAGA
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
        
        waga_pole = QLabel(f"{waga_min}-{waga_max}/{klient_waga}")
        waga_pole.setObjectName("waga_pole")
        waga_pole.setFixedSize(90, 18)  # 90x18px
        waga_pole.move(240, 60)  # left: 240px, top: 60px względem karta_nart
        waga_pole.setParent(self)
        waga_pole.setAlignment(Qt.AlignCenter)
        
        # Użyj koloru na podstawie dopasowania
        waga_color = self.get_criteria_color('waga')
        waga_pole.setStyleSheet(f"""
            QLabel#waga_pole {{
                background: {waga_color};
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }}
        """)
        
        # POZIOM
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
        
        poziom_pole = QLabel(f"{poziom}/{klient_poziom}")
        poziom_pole.setObjectName("poziom_pole")
        poziom_pole.setFixedSize(65, 18)  # 65x18px
        poziom_pole.move(357, 60)  # left: 357px, top: 60px względem karta_nart
        poziom_pole.setParent(self)
        poziom_pole.setAlignment(Qt.AlignCenter)
        
        # Użyj koloru na podstawie dopasowania
        poziom_color = self.get_criteria_color('poziom')
        poziom_pole.setStyleSheet(f"""
            QLabel#poziom_pole {{
                background: {poziom_color};
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }}
        """)
        
        # WZROST
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
        
        wzrost_pole = QLabel(f"{wzrost_min}-{wzrost_max}/{klient_wzrost} cm")
        wzrost_pole.setObjectName("wzrost_pole")
        wzrost_pole.setFixedSize(110, 18)  # 110x18px
        wzrost_pole.move(220, 101)  # left: 220px, top: 101px względem karta_nart
        wzrost_pole.setParent(self)
        wzrost_pole.setAlignment(Qt.AlignCenter)
        
        # Użyj koloru na podstawie dopasowania
        wzrost_color = self.get_criteria_color('wzrost')
        wzrost_pole.setStyleSheet(f"""
            QLabel#wzrost_pole {{
                background: {wzrost_color};
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }}
        """)
        
        # PŁEĆ
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
        
        plec_pole = QLabel(f"{plec}/{klient_plec}")
        plec_pole.setObjectName("plec_pole")
        plec_pole.setFixedSize(110, 18)  # 110x18px
        plec_pole.move(344, 101)  # left: 344px, top: 101px względem karta_nart
        plec_pole.setParent(self)
        plec_pole.setAlignment(Qt.AlignCenter)
        
        # Użyj koloru na podstawie dopasowania
        plec_color = self.get_criteria_color('plec')
        plec_pole.setStyleSheet(f"""
            QLabel#plec_pole {{
                background: {plec_color};
                border: 1px solid #FFFFFF;
                border-radius: 9px;
                color: #012B5A;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
            }}
        """)
        
        # PRZEZNACZENIE - z kolorowaniem na podstawie dopasowania
        przeznaczenie_color = self.get_criteria_text_color('przeznaczenie')
        przeznaczenie_label = QLabel(f"Przeznaczenie:\n{przeznaczenie}")
        przeznaczenie_label.setObjectName("przeznaczenie_label")
        przeznaczenie_label.move(13, 65)  # left: 13px, top: 65px względem karta_nart
        przeznaczenie_label.setParent(self)
        przeznaczenie_label.setStyleSheet(f"""
            QLabel#przeznaczenie_label {{
                color: {przeznaczenie_color};
                font-family: 'ADLaM Display', 'Segoe UI', 'Arial', sans-serif;
                font-size: 16px;
                font-weight: 400;
                background-color: transparent;
                border: none;
                padding: 0px;
            }}
        """)
    
    def show_reservation_details(self, info):
        """Pokazuje szczegóły rezerwacji po kliknięciu w czerwone kółko"""
        try:
            QMessageBox.information(self, "Szczegóły rezerwacji", f"🚫 Zarezerwowana: {info}")
        except Exception as e:
            print(f"Błąd podczas pokazywania szczegółów rezerwacji: {e}")
    
    def generate_criteria_details(self, dopasowanie, klient_wzrost, klient_waga, klient_poziom, klient_plec):
        """Generuje szczegóły dopasowania w formacie zgodnym z dokumentacją"""
        try:
            details = []
            
            # Poziom
            if 'poziom' in dopasowanie:
                status, opis, poziom_display = dopasowanie['poziom']
                emoji = "🟢" if status == 'green' else "🟠" if status == 'orange' else "🔴"
                details.append(f"{emoji} P:{klient_poziom}({poziom_display})→OK" if status == 'green' else f"{emoji} P:{klient_poziom}({poziom_display})→{opis}")
            
            # Płeć
            if 'plec' in dopasowanie:
                status, opis, plec_narty = dopasowanie['plec']
                emoji = "🟢" if status == 'green' else "🟠" if status == 'orange' else "🔴"
                plec_klienta_short = "M" if klient_plec == "Mężczyzna" else "K" if klient_plec == "Kobieta" else "U"
                details.append(f"{emoji} Pł:{plec_klienta_short}({plec_narty})→OK" if status == 'green' else f"{emoji} Pł:{plec_klienta_short}({plec_narty})→{opis}")
            
            # Waga
            if 'waga' in dopasowanie:
                status, opis, waga_min, waga_max = dopasowanie['waga']
                emoji = "🟢" if status == 'green' else "🟠" if status == 'orange' else "🔴"
                details.append(f"{emoji} W:{klient_waga}kg({waga_min}-{waga_max})→OK" if status == 'green' else f"{emoji} W:{klient_waga}kg({waga_min}-{waga_max})→{opis}")
            
            # Wzrost
            if 'wzrost' in dopasowanie:
                status, opis, wzrost_min, wzrost_max = dopasowanie['wzrost']
                emoji = "🟢" if status == 'green' else "🟠" if status == 'orange' else "🔴"
                details.append(f"{emoji} Wz:{klient_wzrost}cm({wzrost_min}-{wzrost_max})→OK" if status == 'green' else f"{emoji} Wz:{klient_wzrost}cm({wzrost_min}-{wzrost_max})→{opis}")
            
            # Przeznaczenie
            if 'przeznaczenie' in dopasowanie:
                status, opis, przeznaczenie = dopasowanie['przeznaczenie']
                emoji = "🟢" if status == 'green' else "🟠" if status == 'orange' else "🔴"
                details.append(f"{emoji} Pr:{przeznaczenie}→OK" if status == 'green' else f"{emoji} Pr:{przeznaczenie}→{opis}")
            
            return " | ".join(details)
            
        except Exception as e:
            print(f"Błąd podczas generowania szczegółów dopasowania: {e}")
            return f"Dopasowanie: {self.narta_info.get('wspolczynnik_idealnosci', 0)}%"
"""
Moduł widgetów formularza
Zawiera komponenty formularza do wprowadzania danych klienta
"""
from PyQt5.QtWidgets import (QWidget, QLabel, QLineEdit, QComboBox, 
                             QRadioButton, QButtonGroup, QHBoxLayout, 
                             QVBoxLayout, QGroupBox, QPushButton)
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont

# ========== STAŁE UI ==========
# Wymiary głównych elementów
FORMULARZ_WIDTH = 890
FORMULARZ_HEIGHT = 180

# Pozycje elementów
FORMULARZ_POS = (201, 10)
LEWA_STRONA_POS = (211, 20)
DANE_KLIENTA_POS = (531, 20)
SRODEK_POS = (531, 84)
PRAWA_STRONA_POS = (774, 20)

class FormularzWidget(QWidget):
    """Główny widget formularza"""
    
    # Sygnały
    formularz_wypelniony = pyqtSignal(dict)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.setup_connections()
    
    def setup_ui(self):
        """Tworzy UI formularza"""
        self.setObjectName("formularz")
        self.setFixedSize(FORMULARZ_WIDTH, FORMULARZ_HEIGHT)
        self.setStyleSheet("""
            QWidget#formularz {
                background: #194576;
                border-radius: 20px;
                border: none;
            }
        """)
        
        # Lewa strona - dane osobowe
        self.lewa_strona = self._create_lewa_strona()
        self.lewa_strona.setParent(self)
        self.lewa_strona.move(LEWA_STRONA_POS[0] - FORMULARZ_POS[0], 
                             LEWA_STRONA_POS[1] - FORMULARZ_POS[1])
        
        # Środek - dane klienta
        self.srodek = self._create_srodek()
        self.srodek.setParent(self)
        self.srodek.move(SRODEK_POS[0] - FORMULARZ_POS[0], 
                        SRODEK_POS[1] - FORMULARZ_POS[1])
        
        # Prawa strona - przycisk wyszukiwania
        self.prawa_strona = self._create_prawa_strona()
        self.prawa_strona.setParent(self)
        self.prawa_strona.move(PRAWA_STRONA_POS[0] - FORMULARZ_POS[0], 
                              PRAWA_STRONA_POS[1] - FORMULARZ_POS[1])
    
    def _create_lewa_strona(self):
        """Tworzy lewą stronę formularza - dane osobowe"""
        widget = QWidget()
        widget.setObjectName("lewa_strona")
        widget.setFixedSize(300, 140)
        
        # Tytuł
        tytul = QLabel("DANE OSOBOWE")
        tytul.setObjectName("tytul_lewa")
        tytul.setFixedSize(300, 20)
        tytul.setAlignment(Qt.AlignCenter)
        tytul.setStyleSheet("""
            QLabel#tytul_lewa {
                color: #FFFFFF;
                font-size: 14px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        # Imię
        imie_label = QLabel("Imię:")
        imie_label.setObjectName("imie_label")
        imie_label.setFixedSize(50, 20)
        imie_label.move(10, 30)
        imie_label.setParent(widget)
        imie_label.setStyleSheet("""
            QLabel#imie_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.imie_input = QLineEdit()
        self.imie_input.setObjectName("imie_input")
        self.imie_input.setFixedSize(100, 25)
        self.imie_input.move(70, 28)
        self.imie_input.setParent(widget)
        self.imie_input.setStyleSheet("""
            QLineEdit#imie_input {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        # Nazwisko
        nazwisko_label = QLabel("Nazwisko:")
        nazwisko_label.setObjectName("nazwisko_label")
        nazwisko_label.setFixedSize(60, 20)
        nazwisko_label.move(180, 30)
        nazwisko_label.setParent(widget)
        nazwisko_label.setStyleSheet("""
            QLabel#nazwisko_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.nazwisko_input = QLineEdit()
        self.nazwisko_input.setObjectName("nazwisko_input")
        self.nazwisko_input.setFixedSize(100, 25)
        self.nazwisko_input.move(250, 28)
        self.nazwisko_input.setParent(widget)
        self.nazwisko_input.setStyleSheet("""
            QLineEdit#nazwisko_input {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        # Płeć
        plec_label = QLabel("Płeć:")
        plec_label.setObjectName("plec_label")
        plec_label.setFixedSize(50, 20)
        plec_label.move(10, 65)
        plec_label.setParent(widget)
        plec_label.setStyleSheet("""
            QLabel#plec_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.plec_group = QButtonGroup()
        self.plec_kobieta = QRadioButton("Kobieta")
        self.plec_mezczyzna = QRadioButton("Mężczyzna")
        
        self.plec_kobieta.setObjectName("plec_kobieta")
        self.plec_mezczyzna.setObjectName("plec_mezczyzna")
        
        self.plec_kobieta.setFixedSize(80, 20)
        self.plec_mezczyzna.setFixedSize(80, 20)
        
        self.plec_kobieta.move(70, 65)
        self.plec_mezczyzna.move(160, 65)
        
        self.plec_kobieta.setParent(widget)
        self.plec_mezczyzna.setParent(widget)
        
        self.plec_group.addButton(self.plec_kobieta, 0)
        self.plec_group.addButton(self.plec_mezczyzna, 1)
        
        for radio in [self.plec_kobieta, self.plec_mezczyzna]:
            radio.setStyleSheet("""
                QRadioButton {
                    color: #FFFFFF;
                    font-size: 12px;
                    font-weight: bold;
                    background-color: transparent;
                    border: none;
                }
                QRadioButton::indicator {
                    width: 15px;
                    height: 15px;
                    border-radius: 7px;
                    border: 2px solid #FFFFFF;
                    background: #A6C2EF;
                }
                QRadioButton::indicator:checked {
                    background: #012B5A;
                }
            """)
        
        # Telefon
        telefon_label = QLabel("Telefon:")
        telefon_label.setObjectName("telefon_label")
        telefon_label.setFixedSize(50, 20)
        telefon_label.move(10, 100)
        telefon_label.setParent(widget)
        telefon_label.setStyleSheet("""
            QLabel#telefon_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.telefon_input = QLineEdit()
        self.telefon_input.setObjectName("telefon_input")
        self.telefon_input.setFixedSize(100, 25)
        self.telefon_input.move(70, 98)
        self.telefon_input.setParent(widget)
        self.telefon_input.setStyleSheet("""
            QLineEdit#telefon_input {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        # Email
        email_label = QLabel("Email:")
        email_label.setObjectName("email_label")
        email_label.setFixedSize(50, 20)
        email_label.move(180, 100)
        email_label.setParent(widget)
        email_label.setStyleSheet("""
            QLabel#email_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.email_input = QLineEdit()
        self.email_input.setObjectName("email_input")
        self.email_input.setFixedSize(100, 25)
        self.email_input.move(250, 98)
        self.email_input.setParent(widget)
        self.email_input.setStyleSheet("""
            QLineEdit#email_input {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        return widget
    
    def _create_srodek(self):
        """Tworzy środek formularza - dane klienta"""
        widget = QWidget()
        widget.setObjectName("srodek")
        widget.setFixedSize(200, 80)
        
        # Tytuł
        tytul = QLabel("DANE KLIENTA")
        tytul.setObjectName("tytul_srodek")
        tytul.setFixedSize(200, 20)
        tytul.setAlignment(Qt.AlignCenter)
        tytul.setParent(widget)
        tytul.setStyleSheet("""
            QLabel#tytul_srodek {
                color: #FFFFFF;
                font-size: 14px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        # Wzrost
        wzrost_label = QLabel("Wzrost (cm):")
        wzrost_label.setObjectName("wzrost_label")
        wzrost_label.setFixedSize(80, 20)
        wzrost_label.move(10, 30)
        wzrost_label.setParent(widget)
        wzrost_label.setStyleSheet("""
            QLabel#wzrost_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.wzrost_input = QLineEdit()
        self.wzrost_input.setObjectName("wzrost_input")
        self.wzrost_input.setFixedSize(60, 25)
        self.wzrost_input.move(100, 28)
        self.wzrost_input.setParent(widget)
        self.wzrost_input.setStyleSheet("""
            QLineEdit#wzrost_input {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        # Waga
        waga_label = QLabel("Waga (kg):")
        waga_label.setObjectName("waga_label")
        waga_label.setFixedSize(80, 20)
        waga_label.move(10, 60)
        waga_label.setParent(widget)
        waga_label.setStyleSheet("""
            QLabel#waga_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.waga_input = QLineEdit()
        self.waga_input.setObjectName("waga_input")
        self.waga_input.setFixedSize(60, 25)
        self.waga_input.move(100, 58)
        self.waga_input.setParent(widget)
        self.waga_input.setStyleSheet("""
            QLineEdit#waga_input {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
        """)
        
        return widget
    
    def _create_prawa_strona(self):
        """Tworzy prawą stronę formularza - przycisk wyszukiwania"""
        widget = QWidget()
        widget.setObjectName("prawa_strona")
        widget.setFixedSize(100, 80)
        
        # Poziom
        poziom_label = QLabel("Poziom:")
        poziom_label.setObjectName("poziom_label")
        poziom_label.setFixedSize(50, 20)
        poziom_label.move(10, 10)
        poziom_label.setParent(widget)
        poziom_label.setStyleSheet("""
            QLabel#poziom_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.poziom_combo = QComboBox()
        self.poziom_combo.setObjectName("poziom_combo")
        self.poziom_combo.setFixedSize(80, 25)
        self.poziom_combo.move(10, 30)
        self.poziom_combo.setParent(widget)
        self.poziom_combo.addItems(["1", "2", "3", "4", "5"])
        self.poziom_combo.setStyleSheet("""
            QComboBox#poziom_combo {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
            QComboBox::drop-down {
                border: none;
                width: 20px;
            }
            QComboBox::down-arrow {
                image: none;
                border: none;
            }
        """)
        
        # Styl jazdy
        styl_label = QLabel("Styl:")
        styl_label.setObjectName("styl_label")
        styl_label.setFixedSize(50, 20)
        styl_label.move(10, 60)
        styl_label.setParent(widget)
        styl_label.setStyleSheet("""
            QLabel#styl_label {
                color: #FFFFFF;
                font-size: 12px;
                font-weight: bold;
                background-color: transparent;
                border: none;
            }
        """)
        
        self.styl_combo = QComboBox()
        self.styl_combo.setObjectName("styl_combo")
        self.styl_combo.setFixedSize(80, 25)
        self.styl_combo.move(10, 80)
        self.styl_combo.setParent(widget)
        self.styl_combo.addItems(["Wszystkie", "Freeride", "Freestyle", "Slalom", "Gigant"])
        self.styl_combo.setStyleSheet("""
            QComboBox#styl_combo {
                background: #A6C2EF;
                border: 1px solid #FFFFFF;
                border-radius: 12px;
                color: #012B5A;
                font-size: 12px;
                font-weight: bold;
                padding: 5px 10px;
            }
            QComboBox::drop-down {
                border: none;
                width: 20px;
            }
            QComboBox::down-arrow {
                image: none;
                border: none;
            }
        """)
        
        return widget
    
    def setup_connections(self):
        """Konfiguruje połączenia sygnałów"""
        # Połączenia dla automatycznego wyszukiwania
        self.wzrost_input.textChanged.connect(self._on_input_changed)
        self.waga_input.textChanged.connect(self._on_input_changed)
        self.poziom_combo.currentTextChanged.connect(self._on_input_changed)
        self.plec_group.buttonClicked.connect(self._on_input_changed)
        self.styl_combo.currentTextChanged.connect(self._on_input_changed)
    
    def _on_input_changed(self):
        """Obsługuje zmiany w formularzu"""
        if self._is_form_valid():
            data = self.get_form_data()
            self.formularz_wypelniony.emit(data)
    
    def _is_form_valid(self):
        """Sprawdza czy formularz jest wypełniony"""
        return (self.wzrost_input.text().strip() and 
                self.waga_input.text().strip() and
                self.poziom_combo.currentText() and
                self.plec_group.checkedButton() is not None)
    
    def get_form_data(self):
        """Pobiera dane z formularza"""
        plec = "Kobieta" if self.plec_kobieta.isChecked() else "Mężczyzna"
        
        return {
            'imie': self.imie_input.text().strip(),
            'nazwisko': self.nazwisko_input.text().strip(),
            'plec': plec,
            'telefon': self.telefon_input.text().strip(),
            'email': self.email_input.text().strip(),
            'wzrost': int(self.wzrost_input.text()) if self.wzrost_input.text().strip().isdigit() else 0,
            'waga': int(self.waga_input.text()) if self.waga_input.text().strip().isdigit() else 0,
            'poziom': int(self.poziom_combo.currentText()),
            'styl_jazdy': self.styl_combo.currentText()
        }
    
    def clear_form(self):
        """Czyści formularz"""
        self.imie_input.clear()
        self.nazwisko_input.clear()
        self.telefon_input.clear()
        self.email_input.clear()
        self.wzrost_input.clear()
        self.waga_input.clear()
        self.poziom_combo.setCurrentIndex(0)
        self.styl_combo.setCurrentIndex(0)
        self.plec_group.setExclusive(False)
        self.plec_kobieta.setChecked(False)
        self.plec_mezczyzna.setChecked(False)
        self.plec_group.setExclusive(True)
    
    def fill_form_with_data(self, data):
        """Wypełnia formularz danymi"""
        self.imie_input.setText(data.get('imie', ''))
        self.nazwisko_input.setText(data.get('nazwisko', ''))
        self.telefon_input.setText(data.get('telefon', ''))
        self.email_input.setText(data.get('email', ''))
        self.wzrost_input.setText(str(data.get('wzrost', '')))
        self.waga_input.setText(str(data.get('waga', '')))
        
        poziom = data.get('poziom', 1)
        self.poziom_combo.setCurrentText(str(poziom))
        
        styl = data.get('styl_jazdy', 'Wszystkie')
        self.styl_combo.setCurrentText(styl)
        
        plec = data.get('plec', '')
        if plec == 'Kobieta':
            self.plec_kobieta.setChecked(True)
        elif plec == 'Mężczyzna':
            self.plec_mezczyzna.setChecked(True)

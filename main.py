"""
Asystent Doboru Nart v6.0 - Modularna wersja
Główny plik uruchamiający aplikację
"""
import sys
import os
from PyQt5.QtWidgets import QApplication

# Dodaj ścieżki do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import modułów
from src.narzedzia.konfiguracja_logowania import setup_logging
from src.interfejs.okno_glowne import SkiApp

def main():
    """Główna funkcja aplikacji"""
    # Skonfiguruj logowanie
    logger = setup_logging()
    logger.info("Uruchamianie Asystenta Doboru Nart v6.0")
    
    # Utwórz aplikację Qt
    app = QApplication(sys.argv)
    
    # Ustawienia aplikacji
    app.setApplicationName("Asystent Doboru Nart")
    app.setApplicationVersion("6.0")
    app.setOrganizationName("WYPAS Ski Rental")
    
    try:
        # Stwórz i pokaż główne okno
        window = SkiApp()
        window.show()
        
        logger.info("Aplikacja uruchomiona pomyślnie")
        
        # Uruchom aplikację
        sys.exit(app.exec_())
        
    except Exception as e:
        logger.error(f"Błąd podczas uruchamiania aplikacji: {e}")
        raise

if __name__ == "__main__":
    main()

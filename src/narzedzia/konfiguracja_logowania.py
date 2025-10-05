"""
Moduł konfiguracji systemu logowania
Ustawia logi aplikacji z odpowiednim formatowaniem
"""
import logging
import os

def setup_logging():
    """Konfiguruje system logowania"""
    # Sprawdź czy folder logi istnieje
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_dir = os.path.join(current_dir, '..', 'data', 'logs')
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Ścieżka do pliku logów
    log_file = os.path.join(log_dir, 'aplikacja_narty.log')
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def get_logger(name):
    """Zwraca logger o określonej nazwie"""
    return logging.getLogger(name)

#!/usr/bin/env python3
"""
Skrypt do pobierania i instalacji czcionki ADLaM Display
"""

import os
import requests
import matplotlib.font_manager as fm
from pathlib import Path
import shutil

def download_font():
    """Pobiera czcionkę ADLaM Display z Google Fonts"""
    print("📥 Pobieranie czcionki ADLaM Display...")
    
    # URL do czcionki ADLaM Display
    font_url = "https://github.com/google/fonts/raw/main/ofl/adlamdisplay/ADLaMDisplay-Regular.ttf"
    
    try:
        response = requests.get(font_url)
        response.raise_for_status()
        
        # Zapisz czcionkę do folderu lokalnego
        font_path = Path("ADLaMDisplay-Regular.ttf")
        with open(font_path, 'wb') as f:
            f.write(response.content)
        
        print(f"✅ Czcionka pobrana: {font_path} ({len(response.content)} bytes)")
        return font_path
        
    except Exception as e:
        print(f"❌ Błąd podczas pobierania czcionki: {e}")
        return None

def install_font_to_matplotlib(font_path):
    """Instaluje czcionkę do matplotlib"""
    print("🔧 Instalowanie czcionki do matplotlib...")
    
    try:
        # Dodaj czcionkę do matplotlib
        fm.fontManager.addfont(str(font_path))
        
        # Odśwież cache czcionek
        fm._rebuild()
        
        print("✅ Czcionka zainstalowana do matplotlib")
        return True
        
    except Exception as e:
        print(f"❌ Błąd podczas instalacji do matplotlib: {e}")
        return False

def install_font_to_system(font_path):
    """Instaluje czcionkę do systemu Windows"""
    print("🔧 Instalowanie czcionki do systemu...")
    
    try:
        # Ścieżka do folderu Fonts użytkownika
        user_fonts_dir = Path.home() / "AppData" / "Local" / "Microsoft" / "Windows" / "Fonts"
        user_fonts_dir.mkdir(parents=True, exist_ok=True)
        
        # Skopiuj czcionkę do folderu użytkownika
        dest_path = user_fonts_dir / font_path.name
        shutil.copy2(font_path, dest_path)
        
        print(f"✅ Czcionka skopiowana do: {dest_path}")
        
        # Spróbuj zarejestrować czcionkę w systemie
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows NT\CurrentVersion\Fonts", 0, winreg.KEY_WRITE) as key:
                winreg.SetValueEx(key, "ADLaM Display (TrueType)", 0, winreg.REG_SZ, str(dest_path))
            print("✅ Czcionka zarejestrowana w systemie")
        except Exception as e:
            print(f"⚠️ Nie udało się zarejestrować w systemie: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Błąd podczas instalacji do systemu: {e}")
        return False

def test_font():
    """Testuje czy czcionka jest dostępna"""
    print("🧪 Testowanie czcionki...")
    
    try:
        # Sprawdź dostępne czcionki
        available_fonts = [f.name for f in fm.fontManager.ttflist]
        
        if "ADLaM Display" in available_fonts:
            print("✅ Czcionka ADLaM Display jest dostępna!")
            return True
        else:
            print("❌ Czcionka ADLaM Display nie jest dostępna")
            print(f"Dostępne czcionki zawierające 'ADLaM': {[f for f in available_fonts if 'ADLaM' in f]}")
            return False
            
    except Exception as e:
        print(f"❌ Błąd podczas testowania czcionki: {e}")
        return False

def main():
    print("🎨 INSTALATOR CZCIONKI ADLAM DISPLAY")
    print("=" * 50)
    
    # Pobierz czcionkę
    font_path = download_font()
    if not font_path:
        return
    
    # Zainstaluj do matplotlib
    install_font_to_matplotlib(font_path)
    
    # Zainstaluj do systemu
    install_font_to_system(font_path)
    
    # Testuj czcionkę
    test_font()
    
    print("\n🎉 INSTALACJA ZAKOŃCZONA!")
    print("Czcionka powinna być teraz dostępna w aplikacji.")

if __name__ == "__main__":
    main()

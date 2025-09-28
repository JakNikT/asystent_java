# 🎨 Instrukcja konfiguracji pluginów Figma

## ✅ **Krok 1: Figma jest zainstalowana i uruchomiona**

## 🔧 **Krok 2: Zainstaluj darmowe pluginy Figma**

### **Plugin 1: "Figma to HTML"**
1. W Figma kliknij prawym przyciskiem na canvas (pusty obszar)
2. Wybierz **"Plugins"** → **"Browse plugins in Community"**
3. Wyszukaj: **"Figma to HTML"**
4. Kliknij **"Install"**

### **Plugin 2: "Figma to React"** (opcjonalnie)
1. Powtórz kroki 1-2 powyżej
2. Wyszukaj: **"Figma to React"**
3. Kliknij **"Install"**

### **Plugin 3: "Figma to Code"** (uniwersalny)
1. Powtórz kroki 1-2 powyżej
2. Wyszukaj: **"Figma to Code"**
3. Kliknij **"Install"**

## 🎯 **Krok 3: Stwórz przykładowy komponent dla aplikacji nart**

### **3.1. Utwórz nowy plik w Figma**
1. Kliknij **"New file"** w Figma
2. Nazwij plik: **"Aplikacja Nart - Komponenty"**

### **3.2. Stwórz prosty przycisk**
1. Wybierz narzędzie **Rectangle** (prostokąt)
2. Narysuj prostokąt 120x40px
3. Ustaw kolor tła: **#007AFF** (niebieski)
4. Dodaj tekst: **"Dobierz Narty"**
5. Wybierz font: **Inter Medium, 14px**
6. Kolor tekstu: **#FFFFFF** (biały)

### **3.3. Stwórz pole input**
1. Narysuj prostokąt 200x40px
2. Ustaw kolor tła: **#F2F2F7** (jasny szary)
3. Dodaj tekst placeholder: **"Wprowadź wzrost..."**
4. Font: **Inter Regular, 14px**
5. Kolor tekstu: **#8E8E93** (szary)

### **3.4. Stwórz kartę wyniku**
1. Narysuj prostokąt 300x150px
2. Ustaw kolor tła: **#FFFFFF** (biały)
3. Dodaj cień: **0px 2px 8px rgba(0,0,0,0.1)**
4. Dodaj tekst: **"Rekomendowane narty"**
5. Font: **Inter SemiBold, 16px**

## 📤 **Krok 4: Wyeksportuj kod HTML/CSS**

### **4.1. Eksportuj przycisk**
1. Zaznacz przycisk "Dobierz Narty"
2. Kliknij prawym → **"Plugins"** → **"Figma to HTML"**
3. W oknie pluginu kliknij **"Export"**
4. Skopiuj wygenerowany kod HTML/CSS

### **4.2. Eksportuj pole input**
1. Zaznacz pole input
2. Powtórz kroki 2-4 z powyżej

### **4.3. Eksportuj kartę wyniku**
1. Zaznacz kartę wyniku
2. Powtórz kroki 2-4 z powyżej

## 🔗 **Krok 5: Integracja z aplikacją Python**

### **5.1. Utwórz plik CSS**
Stwórz plik `styl/figma_styles.css` z wyeksportowanymi stylami.

### **5.2. Modyfikuj PyQt5**
Dodaj style CSS do komponentów PyQt5 używając `setStyleSheet()`.

## 🎨 **Przykładowe style dla aplikacji nart:**

```css
/* Przycisk główny */
.main-button {
    background-color: #007AFF;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
}

.main-button:hover {
    background-color: #0056CC;
}

/* Pole input */
.input-field {
    background-color: #F2F2F7;
    border: 1px solid #E5E5EA;
    border-radius: 8px;
    padding: 12px 16px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: #000000;
}

.input-field::placeholder {
    color: #8E8E93;
}

/* Karta wyniku */
.result-card {
    background-color: #FFFFFF;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0px 2px 8px rgba(0,0,0,0.1);
    margin: 16px 0;
}

.result-title {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: #000000;
    margin-bottom: 8px;
}
```

## 🚀 **Następne kroki:**
1. Zainstaluj pluginy w Figma
2. Stwórz komponenty zgodnie z instrukcją
3. Wyeksportuj kod HTML/CSS
4. Zintegruj z aplikacją Python

## ❓ **Potrzebujesz pomocy?**
Jeśli masz problemy z którymkolwiek krokiem, daj znać!

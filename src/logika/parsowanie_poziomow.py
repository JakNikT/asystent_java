"""
Moduł parsowania poziomów umiejętności narciarskich
Obsługuje różne formaty poziomów: 1M/2D, 5M 6D, 3M, 4D, 5
"""

def parsuj_poziom(poziom_text, plec):
    """Parsuje poziom narty w zależności od formatu"""
    if '/' in poziom_text:
        # Format unisex: "5M/6D"
        try:
            parts = poziom_text.split('/')
            pm_part = parts[0].replace('M', '').strip()
            pd_part = parts[1].replace('D', '').strip()
            poziom_m = int(float(pm_part))
            poziom_d = int(float(pd_part))
            
            if plec == "Mężczyzna":
                return poziom_m, f"PM{poziom_m}/PD{poziom_d}"
            elif plec == "Kobieta":
                return poziom_d, f"PM{poziom_m}/PD{poziom_d}"
            else:  # Wszyscy
                return min(poziom_m, poziom_d), f"PM{poziom_m}/PD{poziom_d}"
        except:
            return None, None
    elif 'M' in poziom_text and 'D' in poziom_text:
        # Format unisex ze spacją: "5M 6D"
        try:
            parts = poziom_text.split()
            pm_part = None
            pd_part = None
            
            for part in parts:
                if 'M' in part:
                    pm_part = part.replace('M', '').strip()
                elif 'D' in part:
                    pd_part = part.replace('D', '').strip()
            
            if pm_part and pd_part:
                poziom_m = int(float(pm_part))
                poziom_d = int(float(pd_part))
                
                if plec == "Mężczyzna":
                    return poziom_m, f"PM{poziom_m} PD{poziom_d}"
                elif plec == "Kobieta":
                    return poziom_d, f"PM{poziom_m} PD{poziom_d}"
                else:  # Wszyscy
                    return min(poziom_m, poziom_d), f"PM{poziom_m} PD{poziom_d}"
            else:
                return None, None
        except:
            return None, None
    elif 'M' in poziom_text:
        # Format męski: "5M"
        try:
            poziom_min = int(float(poziom_text.replace('M', '').strip()))
            return poziom_min, f"PM{poziom_text.replace('M', '').strip()}"
        except:
            return None, None
    elif 'D' in poziom_text:
        # Format damski: "5D"
        try:
            poziom_min = int(float(poziom_text.replace('D', '').strip()))
            return poziom_min, f"PD{poziom_text.replace('D', '').strip()}"
        except:
            return None, None
    elif poziom_text.strip().isdigit():
        # Format prosty: tylko cyfra
        try:
            poziom_min = int(float(poziom_text.strip()))
            return poziom_min, f"P{poziom_text.strip()}"
        except:
            return None, None
    else:
        return None, None

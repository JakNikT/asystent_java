/**
 * Mapuje ID grupy z FireSnow na TYP_SPRZETU i KATEGORIA
 * Mapuje bezpośrednio po parentGroupId (parent grup podrzędnych)
 */
export function mapGroupToEquipmentType(subGroupId, parentGroupId) {
    // Mapuj bezpośrednio po parentGroupId (parent grup podrzędnych)
    switch (parentGroupId) {
        // NARTY - TOP (parent grup TOP)
        case 82293:
            return { TYP_SPRZETU: 'NARTY', KATEGORIA: 'TOP' };

        // NARTY - VIP (parent grup VIP)
        case 82412:
            return { TYP_SPRZETU: 'NARTY', KATEGORIA: 'VIP' };

        // NARTY - JUNIOR (parent grup JUNIOR)
        case 82758:
            return { TYP_SPRZETU: 'NARTY', KATEGORIA: 'JUNIOR' };

        // BUTY - DOROSLE (parent grup BUTY DOROSLE)
        case 82738:
            return { TYP_SPRZETU: 'BUTY', KATEGORIA: 'DOROSLE' };

        // BUTY - JUNIOR (parent grup BUTY JUNIOR)
        case 82827:
            return { TYP_SPRZETU: 'BUTY', KATEGORIA: 'JUNIOR' };

        // SNOWBOARD - DESKI (parent grup DESKI)
        case 83762:
            return { TYP_SPRZETU: 'DESKI', KATEGORIA: '' };

        // SNOWBOARD - BUTY S (parent grup BUTY SNOWBOARD)
        case 83760:
            return { TYP_SPRZETU: 'BUTY_SNOWBOARD', KATEGORIA: '' };

        // Domyślnie (nie powinno się zdarzyć, ale na wszelki wypadek)
        default:
            console.warn(`Server: Nieznany parentGroupId: ${parentGroupId}, subGroupId: ${subGroupId}`);
            return { TYP_SPRZETU: 'NARTY', KATEGORIA: '' };
    }
}

/**
 * Wyciąga płeć z pola POZIOM
 * Parsowanie płci z poziomu (4m→M, 4k→K, 4k/5m→U, 1-2u→U)
 */
export function extractPlecFromPoziom(poziomText) {
    if (!poziomText) return 'U';

    const clean = poziomText.trim().toLowerCase();

    // Format unisex z zakresem: "1-2u"
    if (/^\d+-\d+u$/i.test(clean)) return 'U';

    // Format unisex: "4k/5m" lub "5m/4k"
    if (clean.includes('/') && (clean.includes('m') || clean.includes('k'))) {
        return 'U';
    }

    // Format męski: "4m"
    if (clean.endsWith('m') && !clean.includes('k')) return 'M';

    // Format kobiecy: "4k"
    if (clean.endsWith('k') && !clean.includes('m')) return 'K';

    // Domyślnie unisex
    return 'U';
}

/**
 * Parsuje nazwę sprzętu z FireSnow
 * Wyciąganie marki, modelu, długości/rozmiaru i roku z nazwy
 * Usuwa z nazwy: typ sprzętu (NARTY, BUTY), długość (144cm), rozmiar butów (rozm23), rok (/2025), numer narty (//01, /01, #01)
 */
export function parseEquipmentName(nazwa) {
    const result = {
        NAZWA: '',  // Marka + model (bez długości, rozmiaru, roku, kodu, typu)
        DLUGOSC: null,
        ROK: null
    };

    if (!nazwa) return result;

    let cleanName = nazwa.trim();

    // Usuń typ sprzętu z początku (NARTY, BUTY, DESKI, etc.)
    cleanName = cleanName.replace(/^(NARTY|BUTY|DESKI|DESKA|BUTY\s+SNOWBOARD)\s+/i, '');

    // Wyciągnij rozmiar butów (np. "rozm23", "rozm 23", "rozm23,5", "rozm 23,5")
    // Priorytet: najpierw sprawdź rozmiar butów, potem długość nart
    const bootSizeMatch = cleanName.match(/rozm\s*(\d+)(?:[,.](\d+))?/i);
    if (bootSizeMatch) {
        const wholePart = parseInt(bootSizeMatch[1]);
        const decimalPart = bootSizeMatch[2] ? parseInt(bootSizeMatch[2]) : 0;
        // Jeśli jest część dziesiętna, zapisz jako liczbę zmiennoprzecinkową
        if (decimalPart > 0) {
            // Jeśli część dziesiętna ma 1 cyfrę, dziel przez 10 (np. 5 → 0.5)
            // Jeśli ma 2 cyfry, dziel przez 100 (np. 50 → 0.50)
            const divisor = decimalPart < 10 ? 10 : 100;
            result.DLUGOSC = wholePart + (decimalPart / divisor);
        } else {
            result.DLUGOSC = wholePart;
        }
        // Usuń rozmiar z nazwy (cały wzorzec: "rozm23", "rozm 23", "rozm23,5", "rozm 23,5")
        cleanName = cleanName.replace(/rozm\s*\d+(?:[,.]\d+)?/gi, ' ').trim();
    } else {
        // Jeśli nie znaleziono rozmiaru butów, szukaj długości nart (np. "144cm", "156cm" lub "144")
        const lengthMatch = cleanName.match(/(\d{2,4})\s*cm/i) || cleanName.match(/\s(\d{2,4})\s/);
        if (lengthMatch) {
            result.DLUGOSC = parseInt(lengthMatch[1]);
            // Usuń długość z nazwy (obsługuje różne formaty: "156cm", " 156cm ", "156 cm")
            cleanName = cleanName.replace(/\s*\d{2,4}\s*cm\s*/i, ' ').replace(/\s+\d{2,4}\s+/g, ' ');
        }
    }

    // WAŻNE: Najpierw wyciągnij rok (4 cyfry po "/") - to musi być PRZED usuwaniem numerów nart
    const yearMatch = cleanName.match(/\/(\d{4})(?!\d)/);
    if (yearMatch) {
        result.ROK = parseInt(yearMatch[1]);
        // Usuń rok z nazwy
        cleanName = cleanName.replace(/\s*\/\d{4}(?!\d)\s*/g, ' ');
    }

    // Usuń numery nart w różnych formatach (2-3 cyfry po "//", "/" lub "#")
    cleanName = cleanName.replace(/\s*\/\/\d{2,3}(?!\d)\s*/g, ' ');  // "//01", "//123"
    cleanName = cleanName.replace(/\s*\/\d{2,3}(?!\d)\s*/g, ' ');    // "/01", "/123" (ale nie "/2025" bo już usunięte)
    cleanName = cleanName.replace(/\s*#\d{2,3}(?!\d)\s*/g, ' ');     // "#01", "#123"

    // Usuń dodatkowe spacje i trim
    result.NAZWA = cleanName.replace(/\s+/g, ' ').trim();

    return result;
}

/**
 * Mapuje dane z FireSnow API na format SkiData aplikacji
 */
export function mapFireSnowToSkiData(fireSnowItem) {
    // Mapuj grupę na TYP_SPRZETU i KATEGORIA
    const typeMapping = mapGroupToEquipmentType(
        fireSnowItem.sub_group_id,
        fireSnowItem.parent_group_id
    );

    // Wyciągnij płeć z poziomu
    const plec = extractPlecFromPoziom(fireSnowItem.poziom || '');

    // Parsuj nazwę sprzętu
    const parsedName = parseEquipmentName(fireSnowItem.nazwa_sprzetu || '');

    // Generuj ID w formacie: N-{obiekt_id}, B-{obiekt_id}, D-{obiekt_id}, BS-{obiekt_id}
    let idPrefix = 'N';
    if (typeMapping.TYP_SPRZETU === 'BUTY') idPrefix = 'B';
    else if (typeMapping.TYP_SPRZETU === 'DESKI') idPrefix = 'D';
    else if (typeMapping.TYP_SPRZETU === 'BUTY_SNOWBOARD') idPrefix = 'BS';

    const id = `${idPrefix}-${String(fireSnowItem.obiekt_id).padStart(4, '0')}`;

    // Rozdziel nazwę na markę (pierwsze słowo) i model (reszta)
    const words = parsedName.NAZWA.split(/\s+/).filter(w => w.trim() !== '');
    const marka = words[0] || '';  // Pierwsze słowo to marka
    const model = words.slice(1).join(' ') || '';  // Reszta to model

    // Dodaj rok do modelu jeśli istnieje (format: "SHAPE 3.0 (2025)")
    const modelWithYear = parsedName.ROK
        ? `${model} (${parsedName.ROK})`
        : model;

    // Mapuj dane
    return {
        ID: id,
        TYP_SPRZETU: typeMapping.TYP_SPRZETU,
        KATEGORIA: typeMapping.KATEGORIA,
        MARKA: marka,  // Tylko pierwsze słowo (np. "HEAD")
        MODEL: modelWithYear,  // Reszta + rocznik (np. "SHAPE 3.0 (2025)")
        DLUGOSC: parsedName.DLUGOSC,
        ILOSC: 1,  // Zawsze 1 (każda sztuka osobno)
        POZIOM: fireSnowItem.poziom || '',
        PLEC: plec,
        WAGA_MIN: fireSnowItem.waga_min || null,
        WAGA_MAX: fireSnowItem.waga_max || null,
        WZROST_MIN: fireSnowItem.wzrost_min || null,
        WZROST_MAX: fireSnowItem.wzrost_max || null,
        PRZEZNACZENIE: fireSnowItem.przeznaczenie || '',
        ATUTY: fireSnowItem.typ || '',  // PARAM7 to typ/atuty
        ROK: parsedName.ROK || null,  // Zachowaj dla kompatybilności, ale nie używane w UI
        KOD: fireSnowItem.kod || ''
    };
}

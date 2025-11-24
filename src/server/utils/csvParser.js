/**
 * Wykrywa format FireFnow
 */
export function detectFirefnowFormat(csvText) {
    if (!csvText || csvText.trim() === '') return false;

    const sample = csvText.substring(0, 500);
    const semicolonCount = (sample.match(/;/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;
    const hasSemicolons = semicolonCount > commaCount;

    const hasCorruptedChars =
        sample.includes('Sprzt') ||
        sample.includes('Uytkownik') ||
        sample.includes('Zapacono') ||
        sample.includes('SprÄt') ||
        sample.includes('UÄytkownik') ||
        sample.includes('ZapÄacono');

    return hasSemicolons || hasCorruptedChars;
}

/**
 * Konwertuje z formatu FireFnow
 */
export function convertFromFirefnow(csvText) {
    const lines = csvText.split(/\r?\n/);
    const convertedLines = [];

    lines.forEach(line => {
        if (line.trim() === '') return;

        const fields = line.split(';');
        const fixedFields = fields.map(field => {
            if (/^\d+,\d+$/.test(field.trim())) {
                return field.replace(',', '.');
            }
            return field;
        });

        convertedLines.push(fixedFields.join(','));
    });

    return convertedLines.join('\n');
}

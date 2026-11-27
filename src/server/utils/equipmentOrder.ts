/**
 * src/server/utils/equipmentOrder.ts: Kolejność pozycji sprzętu jak na umowie
 * narty - buty - kije - kask, deski (snowboard) - wiązania - buty - kask
 */

const TYPE_ORDER: Record<string, number> = {
    NARTY: 0,
    NARTA: 0,
    DESKA: 0,
    DESKI: 0,
    SNOWBOARD: 0,
    WIAZANIA: 1,
    WIAZANIE: 1,
    BUTY: 2,
    KIJE: 3,
    KIJKI: 3,
    KASK: 4,
    KASKI: 4
};

/** Pozycje bez rozpoznanego typu (np. gogle) trafiają za wszystkie rozpoznane */
const UNKNOWN_ORDER = 5;

/**
 * Ranga pozycji wg pierwszego słowa nazwy (bez diakrytyków i wielkości liter)
 */
export function equipmentTypeRank(name: string): number {
    const firstWord = name
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/Ł/gi, 'L')
        .toUpperCase()
        .split(/\s+/)[0] ?? '';
    return TYPE_ORDER[firstWord] ?? UNKNOWN_ORDER;
}

/**
 * Sortuje pozycje umowy wg kolejności typów; w obrębie typu zachowuje dotychczasową kolejność (sort stabilny)
 */
export function sortByContractOrder<T extends { sprzet: string }>(items: T[]): T[] {
    return items
        .map((item, index) => ({ item, index, rank: equipmentTypeRank(item.sprzet) }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map(entry => entry.item);
}

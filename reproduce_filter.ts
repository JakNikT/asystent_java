
const skis = [
    {
        ID: "N-0001",
        TYP_SPRZETU: "NARTY",
        KATEGORIA: "TOP",
        MARKA: "NORDICA",
        MODEL: "BELLE 73",
        DLUGOSC: 144,
        KOD: "A01428"
    },
    {
        ID: "N-0020",
        TYP_SPRZETU: "NARTY",
        KATEGORIA: "TOP",
        MARKA: "HEAD",
        MODEL: "SHAPE 3.0",
        DLUGOSC: 149,
        KOD: "A00895"
    }
];

const activeFilter = "TOP";

const filtered = skis.filter(ski => {
    if (!ski || !ski.TYP_SPRZETU) {
        return false;
    }

    switch (activeFilter) {
        case 'TOP':
            return ski.TYP_SPRZETU === 'NARTY' && (ski.KATEGORIA || '') === 'TOP';
        default:
            return false;
    }
});

console.log(`Filtered count: ${filtered.length}`);
if (filtered.length > 0) {
    console.log("First item:", filtered[0]);
} else {
    console.log("No items matched");
}

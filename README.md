# Budgetplanner

En lille webapp til at lægge et **årsbudget fordelt på måneder** for husholdningen og
simulere **rådighedsbeløbet** måned for måned.

## Funktioner

- **Poster** – indtægter og udgifter med kategori, "hvem" (fx Fælles / Person 1) og note.
  Hyppigheder: månedlig, kvartalsvis, halvårlig, årlig, udvalgte måneder eller forskelligt
  beløb hver måned. Poster kan slås fra midlertidigt for at se effekten.
- **Årsoversigt** – kategorier × måneder med indtægter, udgifter, rådighedsbeløb og
  akkumuleret saldo (ud fra startsaldo). Klik på en kategori for at se de enkelte poster.
- **Nøgletal** – gennemsnitligt rådighedsbeløb, måneder med underskud, laveste saldo og
  forslag til fast månedlig overførsel til en **budgetkonto** (udjævner ikke-månedlige udgifter).
- **Grafer** – indtægter/udgifter, rådighedsbeløb og saldo pr. måned.
- **Scenarier** – kopiér et budget (fx "Ny bil", "Barsel", "Nyt job"), ret i kopien og
  sammenlign scenarierne side om side.
- **Import/eksport** – JSON (backup/deling) og CSV til Excel (semikolon, dansk format).

Data gemmes kun lokalt i browseren (localStorage).

## Kom i gang

```bash
npm install
npm run dev      # udviklingsserver
npm test         # tests af beregningerne
npm run build    # statisk build i dist/
```

`dist/` er rene statiske filer og kan hostes hvor som helst (fx GitHub Pages).

## Struktur

- `src/types.ts` – datamodel
- `src/calc.ts` – al beregning (fordeling på måneder, summer, saldo)
- `src/storage.ts` – lokal lagring, eksempeldata og validering af importerede data
- `src/components/` – UI

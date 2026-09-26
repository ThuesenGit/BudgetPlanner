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
- **Pr. person** – poster med "Hvem" sat til en person er personlige; "Fælles" (eller tomt)
  deles efter en fordelingsnøgle: efter indkomst, lige deling eller egne procenter. Viser hver
  persons rådighedsbeløb, andel af fælles udgifter og fast månedlig overførsel til fælleskontoen.
- **Grafer** – indtægter/udgifter, rådighedsbeløb og saldo pr. måned.
- **Scenarier** – kopiér et budget (fx "Ny bil", "Barsel", "Nyt job"), ret i kopien og
  sammenlign scenarierne side om side, også pr. person.
- **Import/eksport** – JSON (backup/deling) og CSV til Excel (semikolon, dansk format).

Data gemmes kun lokalt i browseren (localStorage).

## Kom i gang

```bash
npm install
npm run dev      # udviklingsserver
npm test         # tests af beregningerne
npm run build    # statisk build i dist/
```

`dist/` er rene statiske filer og kan hostes hvor som helst.

## Online-version (GitHub Pages)

Workflowet `.github/workflows/deploy.yml` tester, bygger og udgiver appen automatisk,
hver gang `main` opdateres. Første gang skal GitHub Pages slås til under
**Settings → Pages → Source: GitHub Actions**. Appen ligger derefter på
https://thuesengit.github.io/BudgetPlanner/

## Struktur

- `src/types.ts` – datamodel
- `src/calc.ts` – al beregning (fordeling på måneder, summer, saldo)
- `src/people.ts` – fordeling af fælles udgifter og rådighedsbeløb pr. person
- `src/storage.ts` – lokal lagring, eksempeldata og validering af importerede data
- `src/components/` – UI

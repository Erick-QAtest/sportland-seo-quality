# Instalación SPORTLAND — AF1 lote L3

Este paquete actualiza **únicamente** los archivos de gobernanza y añade un test/Excel. **No ejecuta mutaciones en Shopify** ni sustituye `international-matrix.spec.ts`.

En la terminal desde `~/sportland-seo-quality`:

```bash
unzip -o ~/Downloads/SPORTLAND_Air_Force_1_Lote_QA_2026-11-20.zip
npx playwright test --project=governance --reporter=list
npx playwright test tests/seo/air-force-1-preflight.spec.ts --project=chromium --no-deps --workers=1 --reporter=list
open artifacts/seo-governance/air-force-1-preflight.csv
```

Para comprobar la **puerta de release** (debe fallar hasta resolver pendientes):

```bash
SEO_AF1_GATE=release npx playwright test tests/seo/air-force-1-preflight.spec.ts --project=chromium --no-deps --workers=1 --reporter=list
```

**Importante:** Playwright genera observaciones y diagnósticos. Una prueba que pasó en modo preflight no autoriza consolidar URLs o retirar mercados. La decisión `NO_GO` es intencional.

La matriz `.xlsx` es para revisión y autorización humanas. El test toma sus decisiones del JSON `data/seo/air-force-1-review.json` y `data/seo/governance-decisions-45.json`; editar el Excel no actualiza automáticamente esos JSON.

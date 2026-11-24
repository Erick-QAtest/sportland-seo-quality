# Corrección de auditor internacional SPORTLAND (20/11/2026)

## Qué corrige
- Determina URL regional por su prefijo real, no por la etiqueta de la matriz.
- En esta matriz hay 26 URLs regionales, incluidas 6 etiquetadas como «Artículo independiente en otro idioma».
- Las 6 variantes extranjeras con prefijo quedan como EDITORIAL_REVIEW, no se asumen redirigibles.
- El gate POST comprueba las 26 URLs regionales y bloquea la aprobación si no han sido resueltas; la revisión editorial debe completarse antes de POST.
- No escribe en Shopify.

## Instalar
En la raíz del proyecto sportland-seo-quality:

```bash
unzip -o ~/Downloads/Sportland_International_Matrix_Auditor_Fix_2026-11-20.zip
SEO_PHASE=pre npx playwright test tests/seo/international-matrix.spec.ts --project=chromium --no-deps --workers=1 --reporter=list
open artifacts/seo-international/international-matrix-pre.csv
```

No usar SEO_PHASE=post como prueba de éxito hasta completar las decisiones editoriales y desactivar los mercados. En PRE, 1 test passed significa solamente inventario generado; revisar siempre los estados de las filas.

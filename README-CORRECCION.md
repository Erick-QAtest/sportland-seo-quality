# SPORTLAND SEO — corrección de ExcelJS para auditoría P0/P1

## ¿Qué corrige?
La versión anterior intentaba leer un `.xlsx` con ExcelJS y fallaba en
`Cannot read properties of undefined (reading 'sheets')`.
Esta versión lee directamente un CSV UTF-8 con exactamente las **45 filas P0/P1**
de la hoja `Prioridad P0-P1` de la matriz. No necesita ExcelJS.

## Instalar desde terminal (Mac)
```
cd ~/sportland-seo-quality
unzip -o ~/Downloads/Sportland_SEO_Auditor_Matriz_CSV_Corregido.zip
SEO_PHASE=pre npx playwright test tests/seo/international-matrix.spec.ts --project=chromium --no-deps --workers=1 --reporter=list
```
El comando reemplaza SOLO `tests/seo/international-matrix.spec.ts`, crea
`data/seo/matriz-p0-p1.csv` y agrega este README. No modifica otros tests.

## Reporte
```
artifacts/seo-international/international-matrix-pre.csv
```
Ábrelo en Excel o VS Code y filtra la columna `result`.

## ¿Cómo actualizo los datos?
Edita la matriz Excel original. Luego, en Excel, selecciona la hoja
`Prioridad P0-P1`, usa `Archivo > Guardar como > CSV UTF-8` y reemplaza el
archivo `data/seo/matriz-p0-p1.csv`. Verifica que conserve los 16 encabezados
originales. Alternativamente, vuelve a generar el CSV con la matriz verificada.

## Reglas de QA
- PRE es diagnóstico: un test verde NO implica que las URLs internacionales estén retiradas.
- POST es un gate: exige redirección válida solo en las filas tipo `Prefijo regional`.
- `EDITORIAL_REVIEW`: no retirar artículos extranjeros independientes antes de revisar equivalencia.
- `MAPPING_REQUIRED`: no crear redirecciones sin equivalente.
- El auditor solo hace peticiones GET, no modifica Shopify.

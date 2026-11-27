# SPORTLAND — QA del piloto de consolidación internacional

1. Copia `tests/seo/consolidation-pilot.spec.ts` al mismo lugar de tu proyecto `sportland-seo-quality`.
2. Desde la raíz del proyecto, ejecuta:

   `SEO_PHASE=pre npx playwright test tests/seo/consolidation-pilot.spec.ts --project=chromium --no-deps --workers=1 --reporter=list`

3. Revisa `artifacts/seo-international/consolidation-pilot-pre.csv`.
4. Solo DESPUÉS de desactivar mercados internacionales mediante un cambio separado y controlado, ejecuta `SEO_PHASE=post` con el mismo comando.

La prueba revisa 2 artículos españoles, 3 publicaciones extranjeras que pasaron a borrador, 3 redirecciones antiguas y 6 variantes regionales. En `pre`, las variantes aún servidas por mercados activos quedan registradas como `LOCALE_ACTIVE`. Los tres artículos extranjeros de origen y las rutas antiguas `/de-us/` ya deberían responder `301`; si no, el test falla y guarda el reporte.

Este test es una verificación HTTP del piloto, no una certificación de la migración total ni de las 389 redirecciones de la tienda.

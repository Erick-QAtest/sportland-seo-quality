# Quality Gate de Sportland SEO

Este repositorio protege la rama `main` mediante un quality gate ejecutado con GitHub Actions y Playwright.

## Validación obligatoria

El check `Chromium · México` ejecuta las pruebas automatizadas en:

- Navegador Chromium.
- Mercado mexicano de Shopify.
- Configuración regional `es-MX`.
- Zona horaria `America/Mexico_City`.

Un cambio solamente puede integrarse a `main` cuando las pruebas obligatorias terminan correctamente.

## Flujo de cambios

1. Crear una rama de trabajo.
2. Implementar y probar el cambio localmente.
3. Hacer push de la rama.
4. Abrir un Pull Request hacia `main`.
5. Esperar el resultado del quality gate.
6. Integrar únicamente cuando el gate esté verde.
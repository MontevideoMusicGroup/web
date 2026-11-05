# Proyecto

Web sin framework: HTML/CSS/JavaScript. Backend de producción en worker.js (Cloudflare Workers); server.ps1 queda como servidor heredado, no se despliega. Node.js >=22 y npm.

# Comandos

- npm ci
- npm test
- npm run check: construye únicamente los archivos públicos en dist y valida el despliegue con Wrangler sin publicar.
- npm run db:local: aplica migraciones D1 locales.
- npm run data:export: convierte data/*.json y JSONL en cloudflare/local-data.sql. Prefiere JSONL para productos, pedidos, ventas y gastos, igual que el servidor anterior. No exporta admin.json ni sesiones. El archivo contiene datos privados: nunca versionarlo.
- npm run data:local: importa sin sobrescribir registros existentes.
- npm run dev: servidor local con D1/R2 emulados; no requiere cuentas de Cloudflare.

# Primera configuración local

Crear cloudflare/.dev.vars (ignorado por Git) con SETUP_TOKEN y un valor aleatorio largo. No registrar ni imprimir su valor. Ejecutar las migraciones y la importación local antes del servidor. En /admin/ introducir esa clave de instalación y crear una contraseña nueva. La contraseña del servidor PowerShell no se importa.

# Publicación (requiere autorización y autenticación del usuario)

1. npx wrangler login
2. npx wrangler d1 create neyra-db --config cloudflare/wrangler.jsonc
3. Reemplazar database_id en cloudflare/wrangler.jsonc por el identificador devuelto. El valor cero es solo para desarrollo local.
4. npx wrangler r2 bucket create neyra-images --config cloudflare/wrangler.jsonc (R2 puede requerir activación/facturación de la cuenta).
5. npm run db:remote
6. npm run data:export y npm run data:remote si se autoriza importar los datos locales al entorno remoto. INSERT OR IGNORE no actualiza registros existentes.
7. npx wrangler secret put SETUP_TOKEN --config cloudflare/wrangler.jsonc; introducir una clave aleatoria de instalación de forma interactiva.
8. npm run deploy. Wrangler informa el subdominio workers.dev asignado.
9. Crear el administrador en /admin/ usando la clave de instalación. Las imágenes existentes de media/store se despliegan como archivos estáticos; las nuevas se guardan en R2. No borrar imágenes existentes sin migrarlas antes.

Para integración Git de Cloudflare Workers Builds: repositorio privado, raíz del proyecto, build command npm run build, deploy command npx wrangler deploy --config cloudflare/wrangler.jsonc. Crear recursos y aplicar migraciones antes del primer despliegue. Configurar los secretos del Worker en Cloudflare, nunca en el repositorio. No subir data/, .dev.vars, .env ni exportaciones SQL. No publicar toda la raíz como assets: solo dist/.

# Persistencia y seguridad

D1: records(collection,id,data), settings(key,value), sessions(id,csrf,expires), login_attempts(key,count,expires). R2: binding IMAGES. Archivos estáticos: ASSETS. API: rutas /api existentes; alias /store compatibles. Carrito en navegador se conserva según frontend existente. Los cambios del panel no crean commits ni necesitan desplegar de nuevo. No añadir comentarios al código sin petición del usuario. No cambiar políticas de seguridad ni publicar datos sensibles para resolver fallos.

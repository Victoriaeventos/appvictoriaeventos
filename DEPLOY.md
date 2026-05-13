# Guía de despliegue a producción

Esta guía te lleva paso a paso de "código en GitHub" a "app funcionando en internet con tu dominio".

**Stack final:**
- Frontend: Vercel (gratis)
- Backend: Render Starter (~7$/mes)
- Base de datos: MongoDB Atlas M0 (gratis)
- Dominio: Hostinger

---

## Paso 1 — MongoDB Atlas

1. Entra en https://www.mongodb.com/cloud/atlas/register y crea una cuenta (gratis).
2. Cuando te pida elegir, escoge **M0 Free** (512 MB, suficiente para arrancar).
3. Proveedor cloud y región: **AWS / Frankfurt (eu-central-1)** — cercano a tus usuarios.
4. Nombre del cluster: `victoriaeventos`.
5. En **Security > Database Access**:
   - Crea un usuario nuevo. Usuario: `victoriaeventos_app`. Contraseña: genera una segura y guárdala.
   - Permisos: **Read and write to any database**.
6. En **Security > Network Access**:
   - Añade `0.0.0.0/0` (acceso desde cualquier IP) — temporal. Más adelante restringimos a las IPs de Render.
7. En **Database > Connect > Drivers** (Python):
   - Copia la cadena de conexión. Se ve así:
     ```
     mongodb+srv://victoriaeventos_app:<password>@victoriaeventos.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Reemplaza `<password>` con la contraseña real.
   - **Guarda esta cadena, la usaremos en Render.**

---

## Paso 2 — Backend en Render

1. Entra en https://render.com y crea una cuenta (puedes usar tu cuenta de GitHub).
2. En el dashboard, clic en **New +** > **Blueprint**.
3. Conecta el repo `Victoriaeventos/appvictoriaeventos`.
4. Render detectará automáticamente `render.yaml` en la raíz y propondrá crear el servicio `victoriaeventos-api`.
5. **Plan**: cambia a **Starter ($7/mes)** — el plan gratuito duerme la app y mata la experiencia de usuario en una app comercial.
6. Antes de hacer **Apply**, configura las variables marcadas como `sync: false`:
   - `MONGO_URL`: la cadena que copiaste en el Paso 1
   - `OPENAI_API_KEY`: tu clave de OpenAI (`sk-...`)
   - `CORS_ORIGINS`: déjalo en `*` temporalmente — lo cambiamos cuando tengamos el dominio del frontend
7. Clic en **Apply**. Render hará build y deploy (~5-10 minutos la primera vez).
8. Cuando termine, copia la URL pública que te asigna Render. Será algo como:
   ```
   https://victoriaeventos-api.onrender.com
   ```
9. Verifica que funciona abriendo en el navegador:
   ```
   https://victoriaeventos-api.onrender.com/api/
   ```
   Debe responder: `{"status":"ok","service":"victoriaeventos-api"}`

---

## Paso 3 — Frontend en Vercel

1. Entra en https://vercel.com/signup y crea una cuenta (usa GitHub para que ya esté conectado).
2. En el dashboard, clic en **Add New > Project**.
3. Importa el repo `Victoriaeventos/appvictoriaeventos`.
4. Configuración:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend` (clic en "Edit" y selecciónalo)
   - **Build Command**: `yarn build` (déjalo por defecto)
   - **Output Directory**: `build`
5. En **Environment Variables**, añade:
   - Nombre: `REACT_APP_BACKEND_URL`
   - Valor: la URL pública de Render (del Paso 2), por ej. `https://victoriaeventos-api.onrender.com`
6. Clic en **Deploy**. Esperará 2-5 minutos.
7. Cuando termine, copia la URL que te asigna Vercel. Será algo como:
   ```
   https://appvictoriaeventos.vercel.app
   ```
8. Ahora vuelve a Render y actualiza la variable `CORS_ORIGINS`:
   - Valor: `https://appvictoriaeventos.vercel.app` (la URL de Vercel)
   - Render hará redeploy automáticamente (~2 min).

---

## Paso 4 — Dominio en Hostinger

### 4.1 Comprar el dominio
1. En Hostinger, compra el dominio (por ejemplo `victoriaeventos.com`).
2. Activa la opción **WHOIS Privacy** si está disponible (oculta tus datos personales del registro público).

### 4.2 Apuntar el dominio principal al frontend (Vercel)
1. En Vercel > Project Settings > **Domains** > **Add Domain**.
2. Introduce `victoriaeventos.com` y también `www.victoriaeventos.com`.
3. Vercel te dará una de dos opciones de DNS — anota cuál:
   - **Opción A**: registro A apuntando a `76.76.21.21`
   - **Opción CNAME**: para `www`, apuntar a `cname.vercel-dns.com`
4. En Hostinger > **Dominios** > tu dominio > **DNS / Zona DNS**:
   - Crea un registro **A**: nombre `@`, valor `76.76.21.21`, TTL 14400
   - Crea un registro **CNAME**: nombre `www`, valor `cname.vercel-dns.com`, TTL 14400
   - Si hay registros A/CNAME viejos para `@` o `www`, bórralos primero.
5. La propagación tarda de 15 minutos a varias horas. Vercel marca el dominio como "Valid" cuando lo detecta.

### 4.3 Apuntar subdominio API al backend (Render)
1. En Render > tu servicio `victoriaeventos-api` > **Settings** > **Custom Domains** > **Add Custom Domain**.
2. Introduce `api.victoriaeventos.com`.
3. Render te dará un valor CNAME (algo como `victoriaeventos-api.onrender.com`).
4. En Hostinger > DNS de tu dominio:
   - Crea un registro **CNAME**: nombre `api`, valor `victoriaeventos-api.onrender.com`, TTL 14400.
5. Espera la propagación. Render emitirá certificado SSL automáticamente.

### 4.4 Actualizar las variables después del dominio
- En **Vercel**, actualiza `REACT_APP_BACKEND_URL` a `https://api.victoriaeventos.com` y haz redeploy.
- En **Render**, actualiza `CORS_ORIGINS` a `https://victoriaeventos.com,https://www.victoriaeventos.com`.

---

## Paso 5 — Pruebas finales

Abre `https://victoriaeventos.com` y verifica:
- [ ] La página carga sin errores (revisa la consola del navegador con F12)
- [ ] Puedes registrarte como nuevo usuario
- [ ] Puedes iniciar sesión
- [ ] Puedes crear un evento de prueba
- [ ] La generación de imágenes con OpenAI funciona
- [ ] No hay errores de CORS en la consola

---

## Costes mensuales estimados

| Servicio | Plan | Coste |
|---|---|---|
| MongoDB Atlas | M0 Free | 0 € |
| Render | Starter | ~7 $ (~6,5 €) |
| Vercel | Hobby | 0 € |
| Hostinger | Dominio .com | ~10 €/año |
| OpenAI | Pay-as-you-go | Según uso (gpt-image-1: ~0,04 $/imagen) |
| **Total fijo** | | **~7 €/mes + dominio** |

---

## Cuando crezcas

- **MongoDB**: el plan M0 aguanta unos 1000-5000 usuarios. Si superas eso, paga por M10 (~57 $/mes).
- **Render**: el Starter aguanta tráfico moderado. Si necesitas más, sube a Standard (25 $/mes).
- **Backups**: en MongoDB Atlas, el plan M0 no incluye backups automáticos. Considera M10 cuando sea crítico, o configura un job de backup manual a S3.
- **Monitorización**: añade Sentry (gratis hasta 5k errores/mes) para detectar bugs en producción.

---

## Problemas comunes

**"CORS error" en la consola del navegador:** la variable `CORS_ORIGINS` en Render no coincide con el dominio del frontend. Verifica que sean exactamente iguales (con `https://`, sin barra al final).

**"Cannot connect to MongoDB":** revisa que en MongoDB Atlas > Network Access esté `0.0.0.0/0` permitido, y que la contraseña en `MONGO_URL` sea la correcta.

**"OPENAI_API_KEY no configurada":** verifica en Render > Environment que la variable existe y no tiene espacios al inicio/final.

**La app se duerme y la primera petición tarda mucho:** estás en plan Free de Render. Sube a Starter.

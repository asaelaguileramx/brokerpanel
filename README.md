# Monitor de Lotes — Estatus de tu auto

App para que tus clientes vean el estatus de su búsqueda de auto en Copart/IAAI,
y tú tengas un panel general con todos los lotes ordenados por subasta más próxima.

Los datos viven en un Google Sheet que tú editas normalmente — la app solo los lee y
los muestra bonito. No necesitas programar nada para actualizar información.

## 1. Crea el Google Sheet

Crea una hoja de cálculo nueva en Google Sheets con **dos pestañas** (tabs), con
estos nombres y columnas EXACTOS (respeta mayúsculas y guion bajo):

**Pestaña "Clientes"** — una fila por cliente:
| Codigo | Nombre | Auto_Buscado | Presupuesto_Max | Preferencia_Dano | Estatus | Notas |
|---|---|---|---|---|---|---|
| AS-001 | Juan Pérez | Honda Civic 2016-2019 | 8000 | Frente, no inundación | Buscando | — |

**Pestaña "Lotes"** — una fila por lote que estás vigilando:
| Codigo_Cliente | Lote_Numero | Link_Copart_IAAI | Fecha_Subasta | Puja_Actual | Estatus_Lote | Notas |
|---|---|---|---|---|---|---|
| AS-001 | 49008526 | https://www.copart.com/lot/49008526 | 2026-07-15 14:00 | 2500 | Vigilando | Se ve buen daño de esquina |

- `Codigo` es el código único que le compartes a cada cliente (tú lo inventas, ej. AS-001, AS-002...).
- `Fecha_Subasta` debe estar en formato `AAAA-MM-DD HH:MM` (ej. `2026-07-15 14:00`) para que la cuenta regresiva funcione.
- `Estatus_Lote` usa uno de estos 4 valores exactos: `Vigilando`, `Puja enviada`, `Ganado`, `Perdido`.

## 2. Publica cada pestaña como CSV

Para CADA una de las dos pestañas (Clientes y Lotes), por separado:

1. Abre esa pestaña en Google Sheets
2. Menú **Archivo → Compartir → Publicar en la Web**
3. En "Vincular", elige la pestaña específica (no "Todo el documento")
4. En el formato, elige **Valores separados por comas (.csv)**
5. Dale **Publicar**
6. Copia el link que te da (algo como `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=123&single=true&output=csv`)

Vas a terminar con **dos links CSV distintos**, uno para Clientes y otro para Lotes.

**Importante:** esto hace que cualquiera con el link pueda ver esos datos (no está
protegido con contraseña real). No pongas información sensible ahí — nombre, auto
buscado y estatus está bien; evita cosas como números de tarjeta o domicilios completos.

## 3. Pega los links en el código

Abre `src/App.jsx` y busca estas dos líneas cerca del principio:

```js
const CLIENTES_CSV_URL = "PEGA_AQUI_TU_LINK_CSV_DE_CLIENTES";
const LOTES_CSV_URL = "PEGA_AQUI_TU_LINK_CSV_DE_LOTES";
```

Reemplaza cada placeholder con el link real que copiaste.

También cambia esta línea por una contraseña tuya para el panel general:

```js
const ADMIN_PASSWORD = "cambia-esta-clave";
```

## 4. Sube a GitHub y despliega en Vercel

Mismo proceso que ya hiciste con la calculadora:

1. Crea un repositorio nuevo en GitHub
2. Sube **el contenido** de esta carpeta (no la carpeta en sí — los archivos sueltos:
   `index.html`, `package.json`, `src/`, etc. directo en la raíz del repo)
3. En Vercel: Add New → Project → importa el repo → Deploy (detecta Vite automático,
   no necesitas variables de entorno)

## Cómo lo usas en el día a día

- Cuando llega un cliente nuevo: agrégale una fila en la pestaña "Clientes" con un
  código nuevo, y compártele ese código (por WhatsApp, por ejemplo: "tu código es AS-014").
- Cuando encuentras un lote para alguien: agrégale una fila en "Lotes" con su código de cliente.
- Cuando cambia el estatus (pujaste, ganaste, perdiste): edita esa celda en la hoja.
- Los cambios tardan típicamente 1-5 minutos en reflejarse en la app (Google cachea el CSV publicado).

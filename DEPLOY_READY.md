# 🚀 LIA Pagaré - Reporte de Deploy Listo

> Proyecto configurado para deploy en servidor Contabo  
> **IP:** 38.242.222.25  
> **Puerto:** 3003  
> **Fecha:** 2026-02-23

---

## ✅ Cambios Realizados

### Archivos Modificados

| Archivo | Cambio | Descripción |
|---------|--------|-------------|
| `.env` | ✅ Modificado | Puerto cambiado de `3002` a `3003` |

### Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `.env.production` | Template de configuración para producción |
| `DEPLOY_READY.md` | Este reporte |

---

## 📋 Resumen de Configuración

### Puerto Configurado
```
PORT=3003
```

### Variables de Entorno Actuales (.env)
```bash
PORT=3003
NODE_ENV=production
JWT_SECRET=lia-pagare-secret-key-change-in-production
ENABLE_AUTH=0
```

### Comando para Iniciar en Producción

```bash
# Método 1: Directo con Node
npm run web

# Método 2: Con PM2 (recomendado para producción)
pm2 start server.js --name "lia-pagare-web"
pm2 save
pm2 startup
```

---

## 🏗️ Estructura de Directorios Crítica

```
/opt/lia-pagare/              # Directorio raíz en servidor
├── server.js                 # Entry point principal
├── package.json              # Dependencias
├── .env                      # Variables de entorno (PORT=3003)
├── data/
│   ├── clientes/             # Documentos generados (PERSISTIR)
│   ├── output/               # Salida temporal
│   └── tmp/                  # Temporales
├── templates/
│   ├── base.pdf              # Template pagarés
│   └── v1/contract.docx      # Template contratos
├── config/                   # Configuraciones JSON
├── web/                      # Frontend estático
│   ├── index.html
│   ├── app.js
│   ├── auth.js
│   └── styles.css
└── src/                      # Lógica de generación
    ├── app/
    ├── parsers/
    └── utils/
```

---

## 🔧 Verificación Pre-Deploy

### 1. Validar package.json
```bash
# Scripts disponibles
npm run web        # Inicia servidor web (producción)
npm run dev:web    # Inicia en modo desarrollo
```

### 2. Verificar dependencias críticas
- ✅ `express` - Servidor web
- ✅ `dotenv` - Variables de entorno
- ✅ `pdfkit` - Generación de PDFs
- ✅ `puppeteer` - Renderizado PDF
- ✅ `docxtemplater` - Plantillas Word
- ✅ `libreoffice-convert` - Conversión de documentos

### 3. Estructura requerida en servidor
```bash
# Crear directorio
mkdir -p /opt/lia-pagare

# Permisos necesarios
chown -R $(whoami):$(whoami) /opt/lia-pagare
chmod -R 755 /opt/lia-pagare/data
```

---

## 📤 Instrucciones de Deploy

### Opción A: Deploy Automático (Recomendado)
```bash
# Desde tu Mac local
bash deploy-from-local.sh
```

### Opción B: Deploy Manual
```bash
# 1. Subir código
rsync -avz --exclude "node_modules" --exclude ".git" \
    -e ssh ./ root@38.242.222.25:/opt/lia-pagare/

# 2. Conectar al servidor
ssh root@38.242.222.25

# 3. Instalar dependencias
cd /opt/lia-pagare
npm install --production

# 4. Verificar .env (debe tener PORT=3003)
cat .env

# 5. Iniciar con PM2
pm2 start server.js --name "lia-pagare-web"
pm2 save
pm2 startup
```

---

## 🌐 URLs de Acceso

| URL | Descripción |
|-----|-------------|
| `http://38.242.222.25:3003` | Aplicación web |
| `http://38.242.222.25:3003/api/auth/login` | Login API |
| `http://38.242.222.25:3003/api/capturas` | Guardar datos |
| `http://38.242.222.25:3003/api/generar` | Generar documentos |

---

## 🧪 Testing Post-Deploy

```bash
# Test básico
curl http://38.242.222.25:3003

# Test login
curl -X POST http://38.242.222.25:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"isra","password":"adein123"}'

# Ver logs
ssh root@38.242.222.25 "pm2 logs lia-pagare-web --lines 50"
```

---

## 🔒 Seguridad (Recomendaciones)

### 1. Cambiar JWT_SECRET en producción
```bash
# Editar .env en el servidor
nano /opt/lia-pagare/.env

# Generar clave segura
openssl rand -base64 32
```

### 2. Habilitar autenticación (opcional)
```bash
ENABLE_AUTH=1
AUTH_USER=tu_usuario
AUTH_PASS=tu_password_seguro
```

### 3. Configurar Firewall
```bash
ufw allow OpenSSH
ufw allow 3003/tcp
ufw enable
```

---

## 📞 Comandos Útiles

```bash
# Estado de la app
pm2 status
pm2 monit

# Logs
pm2 logs lia-pagare-web
pm2 logs lia-pagare-web --lines 100

# Reiniciar
pm2 restart lia-pagare-web

# Detener
pm2 stop lia-pagare-web
```

---

## ✅ Checklist Final

- [x] Puerto cambiado de 3002 a 3003 en `.env`
- [x] Script `npm run web` configurado correctamente
- [x] No hay referencias hardcodeadas a localhost:3002
- [x] Frontend usa rutas relativas (`/api/...`)
- [x] Scripts de deploy ya apuntan a puerto 3003
- [x] Documentación actualizada

---

## 🎯 Estado: LISTO PARA DEPLOY

El proyecto está configurado y listo para deploy en:  
**http://38.242.222.25:3003**

> ⚠️ **IMPORTANTE:** El cambio de puerto solo afecta a `.env`. Toda la lógica de generación de PDFs, templates y documentos permanece idéntica al original funcional.

---

*Generado automáticamente el 2026-02-23*

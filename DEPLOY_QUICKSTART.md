# 🚀 LIA Pagaré - Quick Start Deploy

> Guía rápida para deploy en servidor Contabo 38.242.222.25:3003

---

## 📁 Archivos Generados

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| `DEPLOY_ANALYSIS.md` | Análisis técnico completo | Referencia detallada |
| `deploy-server.sh` | Script para ejecutar EN el servidor | `bash deploy-server.sh` |
| `deploy-from-local.sh` | Script para ejecutar DESDE tu Mac | `bash deploy-from-local.sh` |
| `DEPLOY_QUICKSTART.md` | Esta guía rápida | Referencia rápida |

---

## ⚡ Opción 1: Deploy Automático (Recomendado)

### Desde tu Mac (Local)

```bash
# 1. Entrar al directorio del proyecto
cd /Users/a./Desktop/LIA-WEB-ESTABLE-SERVER

# 2. Ejecutar script de deploy
bash deploy-from-local.sh
```

Este script:
- Sube el código vía rsync
- Instala dependencias en el servidor
- Configura el entorno
- Reinicia la aplicación con PM2
- Verifica que todo funciona

---

## ⚡ Opción 2: Configuración Manual en Servidor

### Paso 1: Conectarte al servidor
```bash
ssh root@38.242.222.25
```

### Paso 2: Subir el script
```bash
# Desde tu Mac, subir el script
scp -P 22 deploy-server.sh root@38.242.222.25:/tmp/
```

### Paso 3: Ejecutar en el servidor
```bash
ssh root@38.242.222.25
bash /tmp/deploy-server.sh
```

---

## 🔧 Configuración Manual Paso a Paso

Si prefieres hacerlo manual:

```bash
# 1. Conectar al servidor
ssh root@38.242.222.25

# 2. Actualizar sistema
apt update && apt upgrade -y

# 3. Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 4. Instalar dependencias del sistema
apt install -y libreoffice build-essential python3 \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# 5. Crear directorio
mkdir -p /opt/lia-pagare
cd /opt/lia-pagare

# 6. Subir código (desde tu Mac en otra terminal)
rsync -avz --exclude "node_modules" --exclude ".git" \
    -e ssh ./ root@38.242.222.25:/opt/lia-pagare/

# 7. Instalar dependencias
cd /opt/lia-pagare
npm install --production

# 8. Crear .env
cat > .env << EOF
PORT=3003
NODE_ENV=production
JWT_SECRET=tu-clave-secreta-muy-larga-aqui
ENABLE_AUTH=0
EOF

# 9. Instalar PM2 y iniciar
npm install -g pm2
pm2 start server.js --name "lia-pagare-web"
pm2 save
pm2 startup

# 10. Verificar
curl http://localhost:3003
```

---

## 🧪 Testing Rápido

```bash
# Verificar servidor responde
curl http://38.242.222.25:3003

# Verificar login
curl -X POST http://38.242.222.25:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"isra","password":"adein123"}'

# Ver logs
ssh root@38.242.222.25 "pm2 logs lia-pagare-web --lines 50"
```

---

## 📋 Checklist de Verificación

### Pre-Deploy
- [ ] Servidor accesible vía SSH
- [ ] Puerto 3003 abierto en firewall
- [ ] Node.js 22 disponible

### Deploy
- [ ] Código subido exitosamente
- [ ] `npm install` completado sin errores
- [ ] `.env` configurado
- [ ] PM2 inició la aplicación

### Post-Deploy
- [ ] http://38.242.222.25:3003 responde
- [ ] Login funciona
- [ ] Generación de pagarés funciona
- [ ] Generación de contratos funciona
- [ ] Descarga de PDFs funciona

---

## 🐛 Troubleshooting Rápido

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
cd /opt/lia-pagare
rm -rf node_modules
npm install --production
```

### Error: "LibreOffice convert error"
```bash
# Verificar instalación
which soffice
soffice --version

# Reinstalar si es necesario
apt install --reinstall libreoffice libreoffice-writer
```

### Error: "EACCES permission denied"
```bash
# Corregir permisos
chown -R $(whoami):$(whoami) /opt/lia-pagare
chmod -R 755 /opt/lia-pagare/data
```

### Servidor no responde
```bash
# Verificar estado
pm2 status
pm2 logs lia-pagare-web

# Reiniciar
pm2 restart lia-pagare-web
```

---

## 📁 Estructura de Archivos Importantes

```
/opt/lia-pagare/
├── server.js              # Entry point
├── .env                   # Configuración
├── package.json           # Dependencias
├── data/
│   ├── clientes/          # Documentos generados (persistir)
│   ├── output/            # Salida temporal
│   └── tmp/               # Temporales (pueden borrarse)
├── templates/
│   ├── base.pdf           # Template pagarés
│   └── v1/contract.docx   # Template contratos
├── config/
│   ├── mapping_v1.json    # Mapeo pagarés
│   └── mapping.safe.js    # Mapeo contratos
└── web/                   # Frontend estático
    ├── index.html
    ├── app.js
    └── auth.js
```

---

## 🔐 Seguridad (Post-Deploy)

1. **Cambiar JWT_SECRET**
   ```bash
   nano /opt/lia-pagare/.env
   # Cambiar JWT_SECRET a un valor aleatorio largo
   ```

2. **Habilitar autenticación** (opcional)
   ```bash
   # En .env
   ENABLE_AUTH=1
   AUTH_USER=tu_usuario
   AUTH_PASS=tu_password_seguro
   ```

3. **Configurar firewall**
   ```bash
   ufw allow OpenSSH
   ufw allow 3003/tcp
   ufw enable
   ```

4. **Configurar Nginx** (recomendado para SSL)
   ```bash
   apt install nginx
   # Verificar configuración en DEPLOY_ANALYSIS.md
   ```

---

## 📞 Comandos Útiles

```bash
# Conectar al servidor
ssh root@38.242.222.25

# Ver estado de la app
pm2 status
pm2 monit

# Ver logs
pm2 logs lia-pagare-web
pm2 logs lia-pagare-web --lines 100

# Reiniciar app
pm2 restart lia-pagare-web

# Detener app
pm2 stop lia-pagare-web

# Ver uso de recursos
htop
free -h
df -h

# Ver archivos generados
ls -la /opt/lia-pagare/data/clientes/

# Backup de datos
tar czf lia-backup-$(date +%Y%m%d).tar.gz /opt/lia-pagare/data/clientes/
```

---

## 🎯 Resumen de URLs

| URL | Descripción |
|-----|-------------|
| http://38.242.222.25:3003 | Aplicación web |
| http://38.242.222.25:3003/api/auth/login | Endpoint login |
| http://38.242.222.25:3003/api/capturas | Guardar datos |
| http://38.242.222.25:3003/api/generar | Generar documentos |

---

## ✅ ¿Todo funciona?

Si llegaste aquí y todo funciona, ¡felicidades! 🎉

Prueba generar un documento:
1. Abre http://38.242.222.25:3003 en tu navegador
2. Inicia sesión (isra / adein123)
3. Completa el wizard con datos de prueba
4. Genera documentos
5. Descarga los PDFs

---

*Última actualización: 2026-02-23*

#!/bin/bash
# =============================================================================
# LIA Pagaré - Script de Deploy desde Máquina Local
# Este script se ejecuta en tu Mac/local y sube el código al servidor
# =============================================================================

set -e

# Configuración
SERVER_USER="root"
SERVER_IP="38.242.222.25"
SERVER_PORT="22"
SERVER_DEST="/opt/lia-pagare"
LOCAL_DIR="."  # Directorio actual

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     LIA Pagaré - Deploy desde Local al Servidor           ║"
echo "║     Origen: Local (Mac) → Destino: ${SERVER_IP}            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar dependencias locales
log_info "Verificando herramientas locales..."

if ! command -v rsync &> /dev/null; then
    log_error "rsync no está instalado. Instálalo con: brew install rsync"
    exit 1
fi

if ! command -v ssh &> /dev/null; then
    log_error "ssh no está instalado"
    exit 1
fi

log_success "Herramientas verificadas"

# Verificar conexión SSH
log_info "Verificando conexión SSH a ${SERVER_IP}..."
if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "echo 'Conexión OK'" > /dev/null 2>&1; then
    log_error "No se puede conectar al servidor vía SSH"
    log_info "Verifica:"
    log_info "  1. Que el servidor está encendido"
    log_info "  2. Que la IP ${SERVER_IP} es correcta"
    log_info "  3. Que tienes acceso SSH con clave o contraseña"
    exit 1
fi
log_success "Conexión SSH verificada"

# Preguntar confirmación
echo ""
log_warn "Este deploy subirá el código actual al servidor y reiniciará la aplicación"
log_info "Archivos que NO se subirán: node_modules, .git, .DS_Store, data/"
echo ""
read -p "¿Continuar con el deploy? (s/n): " confirm
if [[ "$confirm" != "s" ]]; then
    log_info "Deploy cancelado"
    exit 0
fi

# =============================================================================
# PASO 1: RSYNC - Subir código
# =============================================================================
echo ""
log_info "=========================================="
log_info "Paso 1: Subiendo código vía rsync..."
log_info "=========================================="

# Crear directorio destino si no existe
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "mkdir -p ${SERVER_DEST}"

# Rsync con exclusiones
rsync -avz --delete \
    --exclude ".git" \
    --exclude "node_modules" \
    --exclude ".DS_Store" \
    --exclude "data/clientes/*" \
    --exclude "data/tmp/*" \
    --exclude ".wwebjs_auth" \
    --exclude "*.log" \
    -e "ssh -p ${SERVER_PORT}" \
    ${LOCAL_DIR}/ ${SERVER_USER}@${SERVER_IP}:${SERVER_DEST}/

log_success "Código subido exitosamente"

# =============================================================================
# PASO 2: Instalar dependencias en servidor
# =============================================================================
echo ""
log_info "=========================================="
log_info "Paso 2: Instalando dependencias..."
log_info "=========================================="

ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${SERVER_DEST}
    
    # Verificar que existe package.json
    if [ ! -f "package.json" ]; then
        echo "ERROR: No se encontró package.json"
        exit 1
    fi
    
    # Instalar dependencias
    echo "Instalando npm packages..."
    npm install --production
    
    # Verificar archivos críticos
    echo "Verificando archivos críticos..."
    for file in "templates/base.pdf" "templates/v1/contract.docx" "server.js"; do
        if [ ! -f "\$file" ]; then
            echo "WARNING: Falta \$file"
        else
            echo "OK: \$file"
        fi
    done
EOF

log_success "Dependencias instaladas"

# =============================================================================
# PASO 3: Configurar .env si no existe
# =============================================================================
echo ""
log_info "=========================================="
log_info "Paso 3: Verificando configuración..."
log_info "=========================================="

ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${SERVER_DEST}
    
    if [ ! -f ".env" ]; then
        echo "Creando archivo .env..."
        cat > .env << 'ENVFILE'
PORT=3003
NODE_ENV=production
JWT_SECRET=lia-pagare-secret-$(date +%s)
ENABLE_AUTH=0
AUTH_USER=isra
AUTH_PASS=adein123
AUTH_REALM=LIA Pagaré
ENVFILE
        echo ".env creado con valores por defecto"
    else
        echo ".env ya existe, preservando configuración"
    fi
    
    # Asegurar permisos correctos
    chmod 600 .env 2>/dev/null || true
EOF

log_success "Configuración verificada"

# =============================================================================
# PASO 4: Reiniciar aplicación con PM2
# =============================================================================
echo ""
log_info "=========================================="
log_info "Paso 4: Reiniciando aplicación..."
log_info "=========================================="

ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${SERVER_DEST}
    
    # Verificar que PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        echo "Instalando PM2..."
        npm install -g pm2
    fi
    
    # Detener instancia anterior si existe
    pm2 delete lia-pagare-web 2>/dev/null || true
    
    # Iniciar aplicación
    echo "Iniciando aplicación..."
    pm2 start server.js --name "lia-pagare-web" --env production
    
    # Guardar configuración
    pm2 save
    
    # Esperar inicio
    sleep 2
    
    # Verificar estado
    pm2 status
EOF

log_success "Aplicación reiniciada"

# =============================================================================
# PASO 5: Verificación
# =============================================================================
echo ""
log_info "=========================================="
log_info "Paso 5: Verificando despliegue..."
log_info "=========================================="

# Esperar a que el servidor responda
log_info "Esperando que el servidor responda..."
for i in {1..10}; do
    if curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}:3003/ | grep -q "200\|302"; then
        log_success "Servidor respondiendo correctamente"
        break
    fi
    sleep 1
done

# Verificar endpoint de auth
log_info "Verificando autenticación..."
AUTH_TEST=$(curl -s -X POST http://${SERVER_IP}:3003/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"isra","password":"adein123"}' 2>/dev/null || echo '{}')

if echo "$AUTH_TEST" | grep -q "token"; then
    log_success "Autenticación funcionando"
else
    log_warn "Autenticación puede necesitar configuración"
fi

# =============================================================================
# RESUMEN
# =============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  DEPLOY COMPLETADO ✅                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}URLs de acceso:${NC}"
echo "  - Aplicación: http://${SERVER_IP}:3003"
echo ""
echo -e "${BLUE}Comandos útiles (ejecutar en servidor):${NC}"
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo "  pm2 logs lia-pagare-web     # Ver logs"
echo "  pm2 monit                    # Monitoreo en tiempo real"
echo "  pm2 restart lia-pagare-web  # Reiniciar"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. Accede a http://${SERVER_IP}:3003 en tu navegador"
echo "  2. Verifica que la generación de documentos funciona"
echo "  3. Cambia JWT_SECRET y credenciales en ${SERVER_DEST}/.env"
echo "  4. Configura firewall: ufw allow 3003"
echo ""
log_success "🎉 Deploy completado exitosamente!"

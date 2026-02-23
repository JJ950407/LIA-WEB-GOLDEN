#!/bin/bash
# =============================================================================
# LIA Pagaré - Script de Deploy para Servidor Contabo
# Destino: 38.242.222.25:3003
# =============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
APP_NAME="lia-pagare-web"
APP_DIR="/opt/lia-pagare"
APP_PORT="3003"
NODE_VERSION="22.x"
GIT_REPO=""  # Dejar vacío si se sube manualmente, o poner URL del repo

# Funciones de utilidad
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# 1. PREPARACIÓN DEL SISTEMA
# =============================================================================
section1_system_prep() {
    log_info "=========================================="
    log_info "1. Preparación del Sistema"
    log_info "=========================================="
    
    # Actualizar sistema
    log_info "Actualizando paquetes del sistema..."
    sudo apt update && sudo apt upgrade -y
    
    # Instalar dependencias básicas
    log_info "Instalando dependencias básicas..."
    sudo apt install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        unzip \
        nano
    
    log_success "Sistema preparado"
}

# =============================================================================
# 2. INSTALACIÓN DE NODE.JS
# =============================================================================
section2_nodejs() {
    log_info "=========================================="
    log_info "2. Instalación de Node.js ${NODE_VERSION}"
    log_info "=========================================="
    
    # Verificar si Node.js ya está instalado
    if command -v node &> /dev/null; then
        CURRENT_NODE=$(node --version)
        log_warn "Node.js ya instalado: ${CURRENT_NODE}"
        
        # Verificar versión mínima (v22)
        if [[ "${CURRENT_NODE}" == v22* ]]; then
            log_success "Versión de Node.js compatible"
            return
        else
            log_warn "Actualizando Node.js..."
        fi
    fi
    
    # Instalar Node.js desde NodeSource
    log_info "Descargando Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | sudo -E bash -
    sudo apt install -y nodejs
    
    # Verificar instalación
    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"
    
    log_success "Node.js instalado correctamente"
}

# =============================================================================
# 3. INSTALACIÓN DE LIBREOFFICE (CRÍTICO)
# =============================================================================
section3_libreoffice() {
    log_info "=========================================="
    log_info "3. Instalación de LibreOffice"
    log_info "=========================================="
    
    if command -v soffice &> /dev/null; then
        log_warn "LibreOffice ya instalado:"
        soffice --version
        return
    fi
    
    log_info "Instalando LibreOffice..."
    sudo apt install -y \
        libreoffice \
        libreoffice-writer \
        libreoffice-calc \
        libreoffice-impress \
        libreoffice-common
    
    # Verificar instalación
    log_info "Verificando LibreOffice..."
    which soffice
    soffice --version
    
    log_success "LibreOffice instalado correctamente"
}

# =============================================================================
# 4. DEPENDENCIAS DEL SISTEMA PARA NATIVE MODULES
# =============================================================================
section4_system_deps() {
    log_info "=========================================="
    log_info "4. Dependencias del Sistema"
    log_info "=========================================="
    
    log_info "Instalando dependencias para Canvas/Sharp..."
    sudo apt install -y \
        libcairo2-dev \
        libpango1.0-dev \
        libjpeg-dev \
        libgif-dev \
        librsvg2-dev \
        libpixman-1-dev \
        pkg-config
    
    log_info "Instalando dependencias para Puppeteer (bot WhatsApp)..."
    sudo apt install -y \
        ca-certificates \
        fonts-liberation \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgbm1 \
        libgcc1 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        xdg-utils
    
    log_success "Dependencias del sistema instaladas"
}

# =============================================================================
# 5. CREACIÓN DE ESTRUCTURA DE DIRECTORIOS
# =============================================================================
section5_directories() {
    log_info "=========================================="
    log_info "5. Creación de Directorios"
    log_info "=========================================="
    
    # Crear directorio principal
    sudo mkdir -p ${APP_DIR}
    sudo mkdir -p ${APP_DIR}/data/clientes
    sudo mkdir -p ${APP_DIR}/data/output
    sudo mkdir -p ${APP_DIR}/data/tmp
    sudo mkdir -p ${APP_DIR}/shared
    sudo mkdir -p ${APP_DIR}/shared/logs
    
    # Asignar permisos (ejecutar como usuario actual, no root)
    sudo chown -R $(whoami):$(whoami) ${APP_DIR}
    chmod -R 755 ${APP_DIR}
    
    log_success "Directorios creados en ${APP_DIR}"
}

# =============================================================================
# 6. CONFIGURACIÓN DE FIREWALL
# =============================================================================
section6_firewall() {
    log_info "=========================================="
    log_info "6. Configuración de Firewall"
    log_info "=========================================="
    
    # Permitir puerto de la aplicación
    log_info "Abriendo puerto ${APP_PORT}..."
    sudo ufw allow ${APP_PORT}/tcp || true
    sudo ufw allow OpenSSH
    
    # Verificar estado
    sudo ufw status verbose || true
    
    log_success "Firewall configurado"
}

# =============================================================================
# 7. INSTALACIÓN DE PM2
# =============================================================================
section7_pm2() {
    log_info "=========================================="
    log_info "7. Instalación de PM2"
    log_info "=========================================="
    
    if command -v pm2 &> /dev/null; then
        log_warn "PM2 ya instalado: $(pm2 --version)"
        return
    fi
    
    log_info "Instalando PM2 globalmente..."
    sudo npm install -g pm2
    
    # Configurar PM2 para iniciar en boot
    log_info "Configurando PM2 para inicio automático..."
    pm2 startup systemd
    
    log_success "PM2 instalado correctamente"
}

# =============================================================================
# 8. DESPLIEGUE DE LA APLICACIÓN
# =============================================================================
section8_deploy_app() {
    log_info "=========================================="
    log_info "8. Despliegue de la Aplicación"
    log_info "=========================================="
    
    log_info "IMPORTANTE: Asegúrate de haber subido el código al servidor"
    log_info "Directorio destino: ${APP_DIR}"
    
    # Verificar que existe código fuente
    if [ ! -f "${APP_DIR}/package.json" ] && [ ! -f "./package.json" ]; then
        log_error "No se encontró package.json"
        log_info "Opciones:"
        log_info "  1. Clonar desde git: git clone <repo> ${APP_DIR}"
        log_info "  2. Subir vía rsync/scp desde tu máquina local"
        log_info "  3. Copiar desde directorio actual a ${APP_DIR}"
        
        read -p "¿Deseas copiar desde el directorio actual? (s/n): " response
        if [[ "$response" == "s" ]]; then
            log_info "Copiando archivos..."
            # Asumiendo que estamos en el directorio del proyecto
            cp -r . ${APP_DIR}/
        else
            log_error "No se puede continuar sin el código fuente"
            exit 1
        fi
    fi
    
    # Ir al directorio de la aplicación
    cd ${APP_DIR}
    
    # Instalar dependencias
    log_info "Instalando dependencias de Node.js..."
    npm install --production
    
    # Crear archivo .env si no existe
    if [ ! -f ".env" ]; then
        log_info "Creando archivo .env..."
        cat > .env << EOF
PORT=${APP_PORT}
NODE_ENV=production
JWT_SECRET=lia-pagare-secret-$(date +%s)
ENABLE_AUTH=0
AUTH_USER=isra
AUTH_PASS=adein123
AUTH_REALM=LIA Pagaré
EOF
        log_warn "Archivo .env creado con valores por defecto"
        log_warn "IMPORTANTE: Cambia JWT_SECRET y credenciales en producción"
    fi
    
    log_success "Aplicación desplegada"
}

# =============================================================================
# 9. VERIFICACIÓN DE ARCHIVOS CRÍTICOS
# =============================================================================
section9_verify_files() {
    log_info "=========================================="
    log_info "9. Verificación de Archivos Críticos"
    log_info "=========================================="
    
    cd ${APP_DIR}
    
    # Verificar archivos de plantilla
    local critical_files=(
        "templates/base.pdf"
        "templates/v1/contract.docx"
        "config/mapping_v1.json"
        "config/mapping.safe.js"
        "web/index.html"
        "server.js"
    )
    
    local missing=0
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Archivo faltante: $file"
            missing=$((missing + 1))
        else
            log_success "Encontrado: $file"
        fi
    done
    
    if [ $missing -gt 0 ]; then
        log_error "Faltan ${missing} archivos críticos"
        exit 1
    fi
    
    log_success "Todos los archivos críticos están presentes"
}

# =============================================================================
# 10. INICIO DE LA APLICACIÓN
# =============================================================================
section10_start_app() {
    log_info "=========================================="
    log_info "10. Inicio de la Aplicación"
    log_info "=========================================="
    
    cd ${APP_DIR}
    
    # Detener instancia anterior si existe
    log_info "Deteniendo instancia anterior (si existe)..."
    pm2 delete ${APP_NAME} 2>/dev/null || true
    
    # Iniciar con PM2
    log_info "Iniciando aplicación con PM2..."
    pm2 start server.js --name ${APP_NAME} \
        --env production \
        --log ${APP_DIR}/shared/logs/app.log \
        --error ${APP_DIR}/shared/logs/error.log \
        --output ${APP_DIR}/shared/logs/out.log
    
    # Guardar configuración
    pm2 save
    
    # Esperar a que inicie
    log_info "Esperando inicio del servidor..."
    sleep 3
    
    # Verificar que está corriendo
    if pm2 list | grep -q "${APP_NAME}"; then
        log_success "Aplicación iniciada correctamente"
        pm2 list
    else
        log_error "La aplicación no se inició correctamente"
        exit 1
    fi
}

# =============================================================================
# 11. PRUEBAS DE VERIFICACIÓN
# =============================================================================
section11_tests() {
    log_info "=========================================="
    log_info "11. Pruebas de Verificación"
    log_info "=========================================="
    
    local BASE_URL="http://localhost:${APP_PORT}"
    
    # Test 1: Health check básico
    log_info "Test 1: Verificando servidor web..."
    if curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/ | grep -q "200\|302"; then
        log_success "Servidor web responde correctamente"
    else
        log_error "Servidor web no responde"
        pm2 logs ${APP_NAME} --lines 20
        exit 1
    fi
    
    # Test 2: Endpoint de login
    log_info "Test 2: Verificando autenticación..."
    LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"isra","password":"adein123"}')
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        log_success "Autenticación funciona correctamente"
    else
        log_warn "Autenticación puede requerir configuración"
        log_info "Respuesta: $LOGIN_RESPONSE"
    fi
    
    # Test 3: Estructura de datos
    log_info "Test 3: Verificando directorios de datos..."
    if [ -d "${APP_DIR}/data/clientes" ]; then
        log_success "Directorios de datos accesibles"
    else
        log_error "Directorios de datos no accesibles"
        exit 1
    fi
    
    log_success "Todas las pruebas pasaron"
}

# =============================================================================
# 12. CONFIGURACIÓN DE NGINX (OPCIONAL)
# =============================================================================
section12_nginx() {
    log_info "=========================================="
    log_info "12. Configuración de Nginx (Opcional)"
    log_info "=========================================="
    
    read -p "¿Deseas instalar y configurar Nginx como reverse proxy? (s/n): " response
    if [[ "$response" != "s" ]]; then
        log_info "Saltando configuración de Nginx"
        return
    fi
    
    # Instalar Nginx
    sudo apt install -y nginx
    
    # Crear configuración
    sudo tee /etc/nginx/sites-available/lia-pagare > /dev/null <<EOF
server {
    listen 80;
    server_name _;  # Aceptar cualquier nombre de servidor

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Habilitar sitio
    sudo ln -sf /etc/nginx/sites-available/lia-pagare /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Verificar y recargar
    sudo nginx -t && sudo systemctl restart nginx
    
    log_success "Nginx configurado correctamente"
}

# =============================================================================
# 13. RESUMEN FINAL
# =============================================================================
section13_summary() {
    log_info "=========================================="
    log_info "13. RESUMEN DEL DEPLOY"
    log_info "=========================================="
    
    echo ""
    echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
    echo ""
    echo -e "${BLUE}Información del servidor:${NC}"
    echo "  - IP: 38.242.222.25"
    echo "  - Puerto: ${APP_PORT}"
    echo "  - Directorio: ${APP_DIR}"
    echo ""
    echo -e "${BLUE}URLs de acceso:${NC}"
    echo "  - Directa: http://38.242.222.25:${APP_PORT}"
    if command -v nginx &> /dev/null; then
        echo "  - Vía Nginx: http://38.242.222.25"
    fi
    echo ""
    echo -e "${BLUE}Comandos útiles:${NC}"
    echo "  - Ver logs:        pm2 logs ${APP_NAME}"
    echo "  - Monitorear:      pm2 monit"
    echo "  - Reiniciar:       pm2 restart ${APP_NAME}"
    echo "  - Detener:         pm2 stop ${APP_NAME}"
    echo "  - Ver estado:      pm2 status"
    echo ""
    echo -e "${BLUE}Archivos importantes:${NC}"
    echo "  - Logs:            ${APP_DIR}/shared/logs/"
    echo "  - Datos:           ${APP_DIR}/data/clientes/"
    echo "  - Config:          ${APP_DIR}/.env"
    echo ""
    echo -e "${YELLOW}⚠️  NOTAS IMPORTANTES:${NC}"
    echo "  1. Cambia el JWT_SECRET en ${APP_DIR}/.env"
    echo "  2. Configura ENABLE_AUTH=1 si necesitas autenticación"
    echo "  3. El servidor reinicia automáticamente con PM2"
    echo "  4. Revisa los logs si hay problemas: pm2 logs"
    echo ""
}

# =============================================================================
# MENÚ PRINCIPAL
# =============================================================================
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          LIA Pagaré - Script de Deploy                     ║"
    echo "║          Servidor: 38.242.222.25:${APP_PORT}                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    log_info "Este script configurará el servidor desde cero"
    log_info "Se requieren privilegios de sudo"
    echo ""
    
    read -p "¿Continuar con el deploy? (s/n): " confirm
    if [[ "$confirm" != "s" ]]; then
        log_info "Deploy cancelado"
        exit 0
    fi
    
    # Ejecutar secciones
    section1_system_prep
    section2_nodejs
    section3_libreoffice
    section4_system_deps
    section5_directories
    section6_firewall
    section7_pm2
    section8_deploy_app
    section9_verify_files
    section10_start_app
    section11_tests
    section12_nginx
    section13_summary
    
    log_success "🎉 Deploy finalizado!"
}

# Ejecutar menú principal
main "$@"

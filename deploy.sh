#!/bin/bash

# Simple production deployment script for GPT Collaboration App
set -e

echo "🚀 Starting production deployment..."

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found"
    log_info "Create .env file with your configuration"
    exit 1
fi

# Build images
log_info "Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build

# Stop and remove existing containers
log_info "Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down

# Start services
log_info "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait 30 seconds
log_info "Waiting 30 seconds for services to start..."
sleep 30

# Show status
log_info "Deployment Status:"
docker-compose -f "$COMPOSE_FILE" ps -a

echo ""
log_info "🎉 Deployment completed!"
log_warn "Check the status above to ensure all services are running properly"#!/bin/bash

# Production deployment script for GPT Collaboration App
set -e

echo "🚀 Starting production deployment..."

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Copy .env.prod.example to .env.prod and configure it"
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose -f "$COMPOSE_FILE" ps mongo | grep -q "Up"; then
        log_info "Backing up MongoDB..."
        docker-compose -f "$COMPOSE_FILE" exec -T mongo mongodump --archive --gzip > "$BACKUP_DIR/mongodb_backup.gz"
    fi
    
    # Backup volumes
    log_info "Backing up application data..."
    docker run --rm -v gpt-collaboration-app_app_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/app_data.tar.gz -C /data .
    
    log_info "Backup created in $BACKUP_DIR ✓"
}

# Build and deploy
deploy() {
    log_info "Building and deploying application..."
    
    # Pull latest images
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    
    # Build application
    log_info "Building application image..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache app
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    timeout=300
    elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy\|starting"; then
            echo -n "."
            sleep 5
            elapsed=$((elapsed + 5))
        else
            break
        fi
    done
    
    if [ $elapsed -ge $timeout ]; then
        log_error "Services failed to start within $timeout seconds"
        docker-compose -f "$COMPOSE_FILE" logs
        exit 1
    fi
    
    log_info "Deployment completed successfully ✓"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if all services are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_error "Some services are not running"
        docker-compose -f "$COMPOSE_FILE" ps
        exit 1
    fi
    
    # Health check
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost/api/health > /dev/null; then
            log_info "Health check passed ✓"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Health check failed"
        exit 1
    fi
    
    log_info "Deployment verification completed ✓"
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    docker volume prune -f
    log_info "Cleanup completed ✓"
}

# Show status
show_status() {
    log_info "Deployment Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "Application URLs:"
    echo "  Main App: https://your-domain.com"
    echo "  API Health: https://your-domain.com/api/health"
    echo "  Grafana: http://your-domain.com:3001 (if monitoring enabled)"
    
    echo ""
    log_info "Useful commands:"
    echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "  Restart: docker-compose -f $COMPOSE_FILE restart"
}

# Main execution
main() {
    echo "🎯 GPT Collaboration App - Production Deployment"
    echo "================================================"
    
    check_prerequisites
    
    # Ask for confirmation
    read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
    
    # Create backup if services are running
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        create_backup
    else
        log_warn "No running services found, skipping backup"
    fi
    
    deploy
    verify_deployment
    cleanup
    show_status
    
    echo ""
    log_info "🎉 Production deployment completed successfully!"
    log_warn "Don't forget to:"
    echo "  1. Configure your domain DNS to point to this server"
    echo "  2. Set up SSL certificates (Let's Encrypt recommended)"
    echo "  3. Configure monitoring and alerting"
    echo "  4. Set up automated backups"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
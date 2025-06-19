#!/bin/bash

# WW3 Dashboard Production Deployment Script
# This script handles production deployment with health checks and rollback capabilities

set -e  # Exit on any error

# Configuration
APP_NAME="ww3-dashboard"
BUILD_DIR=".next"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
MAX_HEALTH_CHECK_ATTEMPTS=30
HEALTH_CHECK_INTERVAL=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in production environment
check_environment() {
    log_info "Checking deployment environment..."
    
    if [ "$NODE_ENV" != "production" ]; then
        log_warning "NODE_ENV is not set to 'production'. Setting it now..."
        export NODE_ENV=production
    fi
    
    # Check required environment variables
    if [ -z "$ACLED_API_KEY" ]; then
        log_error "ACLED_API_KEY environment variable is required for production"
        exit 1
    fi
    
    log_success "Environment checks passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Node.js version (require v18+)
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        log_warning ".env.local file not found. Make sure environment variables are set."
    fi
    
    log_success "Pre-deployment checks passed"
}

# Backup current deployment
backup_current_deployment() {
    if [ -d "$BUILD_DIR" ]; then
        log_info "Backing up current deployment to $BACKUP_DIR..."
        mkdir -p "$BACKUP_DIR"
        cp -r "$BUILD_DIR" "$BACKUP_DIR/"
        cp package.json "$BACKUP_DIR/"
        cp package-lock.json "$BACKUP_DIR/"
        log_success "Backup completed"
    else
        log_info "No existing deployment found to backup"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing production dependencies..."
    
    # Clean install for production
    npm ci --only=production --silent
    
    if [ $? -eq 0 ]; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Build the application
build_application() {
    log_info "Building application for production..."
    
    # Clean previous build
    rm -rf "$BUILD_DIR"
    
    # Build with production optimizations
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "Application built successfully"
    else
        log_error "Build failed"
        rollback_deployment
        exit 1
    fi
}

# Start the application
start_application() {
    log_info "Starting application..."
    
    # Kill existing process if running
    if pgrep -f "next start" > /dev/null; then
        log_info "Stopping existing application..."
        pkill -f "next start"
        sleep 3
    fi
    
    # Start the application in background
    nohup npm start > app.log 2>&1 &
    APP_PID=$!
    
    log_info "Application started with PID: $APP_PID"
    sleep 5  # Give the app time to start
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local attempt=1
    while [ $attempt -le $MAX_HEALTH_CHECK_ATTEMPTS ]; do
        log_info "Health check attempt $attempt/$MAX_HEALTH_CHECK_ATTEMPTS..."
        
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
        attempt=$((attempt + 1))
    done
    
    log_error "Health check failed after $MAX_HEALTH_CHECK_ATTEMPTS attempts"
    return 1
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Stop current application
        if pgrep -f "next start" > /dev/null; then
            pkill -f "next start"
        fi
        
        # Restore backup
        rm -rf "$BUILD_DIR"
        cp -r "$BACKUP_DIR/$BUILD_DIR" ./
        
        # Restart application
        nohup npm start > app.log 2>&1 &
        
        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
    fi
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove old backups (keep only last 5)
    ls -dt backup_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Post-deployment tasks
post_deployment_tasks() {
    log_info "Running post-deployment tasks..."
    
    # Warm up the application
    log_info "Warming up application..."
    curl -s "http://localhost:3000" > /dev/null 2>&1 || true
    curl -s "http://localhost:3000/api/test-acled" > /dev/null 2>&1 || true
    curl -s "http://localhost:3000/api/test-news" > /dev/null 2>&1 || true
    
    # Log deployment info
    echo "$(date): Deployment completed successfully" >> deployment.log
    
    log_success "Post-deployment tasks completed"
}

# Main deployment function
deploy() {
    log_info "Starting deployment of $APP_NAME..."
    
    # Run all deployment steps
    check_environment
    pre_deployment_checks
    backup_current_deployment
    install_dependencies
    build_application
    start_application
    
    # Health check with rollback on failure
    if health_check; then
        post_deployment_tasks
        cleanup
        log_success "🚀 Deployment completed successfully!"
        
        # Display deployment summary
        echo ""
        echo "=== Deployment Summary ==="
        echo "Application: $APP_NAME"
        echo "Environment: $NODE_ENV"
        echo "Build Directory: $BUILD_DIR"
        echo "Backup Directory: $BACKUP_DIR"
        echo "Health Check URL: $HEALTH_CHECK_URL"
        echo "Log File: app.log"
        echo "=========================="
        
    else
        log_error "Deployment failed health check"
        rollback_deployment
        exit 1
    fi
}

# Script entry point
case "$1" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback_deployment
        ;;
    "health-check")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy      - Full production deployment"
        echo "  rollback    - Rollback to previous deployment"
        echo "  health-check - Check application health"
        echo "  cleanup     - Clean up old backups"
        exit 1
        ;;
esac 
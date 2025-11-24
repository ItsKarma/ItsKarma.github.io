---
layout: base.html
title: "Local Development Environment"
permalink: /onboarding/local-development/
---

# Local Development Environment

**Time to Complete:** 1-2 hours  
**Prerequisites:** [CI/CD Pipeline Setup](/onboarding/cicd-pipeline/) completed

## Overview

Set up local development environments using Docker Compose for rapid iteration and K3s for local Kubernetes testing. This allows you to develop and test without deploying to the cloud.

---

## Option 1: Docker Compose (Recommended for App Development)

Docker Compose is ideal for rapid application development and testing of multi-service architectures.

### Install Docker Desktop

```bash
# macOS
brew install --cask docker

# Linux - install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker Desktop on macOS (or start docker service on Linux)
open -a Docker  # macOS
sudo systemctl start docker  # Linux
```

### Create Docker Compose Configuration

Create `docker-compose.yml` in your application repository:

```yaml
version: '3.8'

services:
  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - API_URL=http://backend:4000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    command: npm run dev

  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@database:5432/appdb
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - database
      - redis
    command: npm run dev

  # Database
  database:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # Nginx Reverse Proxy (optional)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres-data:
  redis-data:
```

### Create Development Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

### Create Database Initialization Script

Create `database/init.sql`:

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (email, name) VALUES
  ('john@example.com', 'John Doe'),
  ('jane@example.com', 'Jane Smith');

INSERT INTO products (name, price, stock) VALUES
  ('Product A', 29.99, 100),
  ('Product B', 49.99, 50),
  ('Product C', 19.99, 200);
```

### Start Local Environment

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Test the Local Environment

```bash
# Check service health
curl http://localhost:3000  # Frontend
curl http://localhost:4000/health  # Backend

# Connect to database
docker-compose exec database psql -U postgres -d appdb

# Connect to Redis
docker-compose exec redis redis-cli

# View container status
docker-compose ps

# Execute commands in containers
docker-compose exec backend npm test
docker-compose exec frontend npm run lint
```

---

## Option 2: K3s (Recommended for Kubernetes Testing)

K3s is a lightweight Kubernetes distribution perfect for local testing of Kubernetes manifests.

### Install K3s

```bash
# macOS - using k3d (K3s in Docker)
brew install k3d

# Create a local K3s cluster
k3d cluster create local-dev \
  --api-port 6550 \
  --servers 1 \
  --agents 2 \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer"

# Verify cluster is running
kubectl cluster-info
kubectl get nodes
```

### Alternative: Linux Native K3s

```bash
# Linux - install K3s directly
curl -sfL https://get.k3s.io | sh -

# Check status
sudo systemctl status k3s

# Get kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml

# Copy to standard location
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config

# Verify
kubectl get nodes
```

### Deploy Application to K3s

```bash
# Create namespace
kubectl create namespace local-dev

# Deploy using Kustomize
kubectl apply -k k8s/overlays/development

# Or apply manifests directly
kubectl apply -f k8s/base/ -n local-dev

# Watch deployment
kubectl get pods -n local-dev -w

# Check logs
kubectl logs -f deployment/sample-app -n local-dev
```

### Create Development Overlay

Create `k8s/overlays/development/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

namespace: local-dev

replicas:
  - name: sample-app
    count: 1

images:
  - name: ghcr.io/your-org/your-app
    newName: sample-app
    newTag: local

patches:
  - patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/imagePullPolicy
        value: IfNotPresent
    target:
      kind: Deployment
      name: sample-app
```

### Build and Load Local Images to K3s

```bash
# Build Docker image locally
docker build -t sample-app:local .

# Load image into k3d cluster
k3d image import sample-app:local -c local-dev

# Or for native K3s
sudo k3s ctr images import sample-app-local.tar

# Deploy with local image
kubectl apply -k k8s/overlays/development
```

### Port Forward to Access Services

```bash
# Forward application port
kubectl port-forward -n local-dev svc/sample-app 3000:80

# Access at http://localhost:3000

# Forward multiple services
kubectl port-forward -n local-dev svc/sample-app 3000:80 &
kubectl port-forward -n local-dev svc/postgres 5432:5432 &

# Kill port forwards
pkill -f "kubectl port-forward"
```

### Install Local Observability Stack

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.service.type=NodePort \
  --set grafana.service.type=NodePort

# Get Grafana password
kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 -d

# Port forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80

# Access Grafana at http://localhost:3001
# Username: admin
# Password: (from above command)
```

---

## Development Workflow

### Hot Reload with Docker Compose

With volume mounts, changes to code automatically reload:

```bash
# Start services
docker-compose up

# Make changes to frontend/src/App.js
# Browser automatically reloads

# Make changes to backend/src/server.js
# Nodemon restarts server automatically

# Run tests
docker-compose exec backend npm test

# Check database
docker-compose exec database psql -U postgres -d appdb -c "SELECT * FROM users;"
```

### Test Kubernetes Manifests Locally

```bash
# Make changes to k8s/base/deployment.yaml

# Apply changes
kubectl apply -k k8s/overlays/development

# Watch rollout
kubectl rollout status deployment/sample-app -n local-dev

# Test service
kubectl port-forward -n local-dev svc/sample-app 3000:80
curl http://localhost:3000

# View logs
kubectl logs -f -l app=sample-app -n local-dev

# Debug pod
kubectl exec -it -n local-dev deployment/sample-app -- /bin/sh
```

### Database Migrations

```bash
# Run migrations with Docker Compose
docker-compose exec backend npm run migrate

# Or connect directly
docker-compose exec database psql -U postgres -d appdb

# Run migrations in K3s
kubectl exec -it -n local-dev deployment/sample-app -- npm run migrate
```

---

## Useful Development Commands

### Docker Compose

```bash
# Rebuild specific service
docker-compose build backend

# Restart specific service
docker-compose restart backend

# View logs for specific service
docker-compose logs -f backend

# Scale service
docker-compose up -d --scale backend=3

# Remove all containers and volumes
docker-compose down -v

# Execute arbitrary commands
docker-compose exec backend sh -c "npm run seed-db"
```

### K3s/K3d

```bash
# List clusters
k3d cluster list

# Stop cluster
k3d cluster stop local-dev

# Start cluster
k3d cluster start local-dev

# Delete cluster
k3d cluster delete local-dev

# Create cluster with specific Kubernetes version
k3d cluster create local-dev --image rancher/k3s:v1.28.5-k3s1

# Export kubeconfig
k3d kubeconfig get local-dev > ~/.kube/local-dev-config
```

### Kubernetes

```bash
# Get all resources
kubectl get all -n local-dev

# Describe pod
kubectl describe pod <pod-name> -n local-dev

# Execute command in pod
kubectl exec -it <pod-name> -n local-dev -- /bin/sh

# Copy files to/from pod
kubectl cp local-dev/<pod-name>:/path/to/file ./local-file
kubectl cp ./local-file local-dev/<pod-name>:/path/to/file

# Delete all resources in namespace
kubectl delete all --all -n local-dev
```

---

## What Gets Created

After completing this step, you'll have:

✅ **Docker Compose Environment**
- Multi-service local development stack
- Hot reload for rapid iteration
- Local database and Redis
- Consistent development environment across team

✅ **K3s Local Cluster**
- Lightweight Kubernetes for testing
- Ability to test Kubernetes manifests locally
- Local observability stack (optional)
- Fast feedback loop for K8s changes

✅ **Development Workflow**
- Test changes locally before pushing
- Debug issues in isolated environment
- Validate Kubernetes configs
- Experiment without cloud costs

---

## Validation Checklist

Run these commands to verify everything is working:

### Docker Compose

```bash
# Verify all services are running
docker-compose ps

# Test frontend
curl http://localhost:3000

# Test backend
curl http://localhost:4000/health

# Test database connection
docker-compose exec database psql -U postgres -d appdb -c "SELECT 1;"

# Test Redis
docker-compose exec redis redis-cli ping
```

Expected outputs:
- All services show "Up" status
- Frontend returns HTML
- Backend returns 200 OK
- Database query returns "1"
- Redis returns "PONG"

### K3s

```bash
# Verify cluster is running
kubectl get nodes

# Verify pods are running
kubectl get pods -n local-dev

# Test service endpoint
kubectl port-forward -n local-dev svc/sample-app 3000:80 &
curl http://localhost:3000
```

Expected outputs:
- All nodes are Ready
- All pods are Running
- Service responds with 200 OK

---

## Troubleshooting

### Docker Compose Port Conflicts

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
# ports:
#   - "3001:3000"
```

### K3s Not Starting

```bash
# Check Docker is running
docker ps

# Check k3d cluster status
k3d cluster list

# View k3d logs
docker logs k3d-local-dev-server-0

# Recreate cluster
k3d cluster delete local-dev
k3d cluster create local-dev
```

### Image Pull Issues in K3s

```bash
# Verify image exists locally
docker images | grep sample-app

# Re-import image
k3d image import sample-app:local -c local-dev

# Check pod events
kubectl describe pod <pod-name> -n local-dev

# Force recreate pod
kubectl delete pod <pod-name> -n local-dev
```

---

## Next Steps

Continue to **[Step 6: Production Migration](/onboarding/step-6-production-migration/)** to plan and execute migration of existing applications.

---

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [K3d Documentation](https://k3d.io/)
- [K3s Documentation](https://k3s.io/)
- [Kubernetes Local Development Guide](https://kubernetes.io/docs/tasks/debug/)

# Local Development with Docker Compose

Run the complete application stack locally using Docker Compose. Perfect for development without needing Kubernetes.

## What's Included

- Frontend (React/Vue/etc)
- Backend API (Node.js/Python/Go/etc)
- Database (PostgreSQL)
- Redis cache
- Message queue (optional)

## Prerequisites

- Docker Desktop installed
- Docker Compose V2
- At least 8GB RAM allocated to Docker

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Services

### Frontend
- **Port**: 3000
- **URL**: http://localhost:3000
- **Hot Reload**: Enabled

### Backend API
- **Port**: 8080
- **URL**: http://localhost:8080
- **Swagger**: http://localhost:8080/swagger

### Database
- **Port**: 5432
- **Host**: localhost
- **Database**: app_db
- **User**: postgres
- **Password**: postgres

### Redis
- **Port**: 6379
- **URL**: redis://localhost:6379

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to customize:

```bash
# Application
APP_NAME=my-app
APP_ENV=development

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=app_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

## Development Workflow

### Making Code Changes

Code changes are automatically reflected (hot reload):

```bash
# Edit files in services/frontend or services/backend
# Changes are mounted as volumes and picked up automatically
```

### Running Commands

Execute commands inside containers:

```bash
# Backend shell
docker-compose exec backend sh

# Run database migrations
docker-compose exec backend npm run migrate

# Frontend shell
docker-compose exec frontend sh

# Install new npm package
docker-compose exec frontend npm install <package-name>
```

### Database Management

```bash
# Connect to database
docker-compose exec db psql -U postgres app_db

# Run SQL file
docker-compose exec -T db psql -U postgres app_db < schema.sql

# Backup database
docker-compose exec -T db pg_dump -U postgres app_db > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres app_db < backup.sql
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Containers Won't Start

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs <service-name>

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues

```bash
# Ensure database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Clear Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all unused images
docker system prune -a
```

## Custom Services

To add a new service, edit `docker-compose.yml`:

```yaml
  new-service:
    build:
      context: ./services/new-service
      dockerfile: Dockerfile
    ports:
      - "9000:9000"
    environment:
      - SERVICE_ENV=development
    depends_on:
      - db
      - redis
    volumes:
      - ./services/new-service:/app
    networks:
      - app-network
```

## Production Differences

This setup is for **development only**. Production differences:

- No hot reload (use built images)
- Different environment variables
- Proper secrets management
- Health checks and restart policies
- Resource limits
- Production-grade database
- Load balancing
- SSL/TLS

## Next Steps

1. Customize `docker-compose.yml` for your application
2. Add your application code to `services/` directories
3. Update environment variables in `.env`
4. Start development!

For production deployment, see the Kubernetes examples.

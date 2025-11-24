---
layout: base.html
title: "Production Migration"
permalink: /onboarding/production-migration/
---

# Step 6: Production Migration

**Time to Complete:** Ongoing (varies by application complexity)  
**Prerequisites:** [Local Development Environment](/onboarding/local-development/) completed

## Overview

Execute a phased migration of existing applications to the new infrastructure. This step focuses on minimizing risk through careful planning, testing, and incremental rollout.

---

## Phase 1: Discovery & Assessment (Week 1-2)

### Inventory Existing Applications

Create a comprehensive application inventory:

```bash
# Create inventory spreadsheet or document
cat > applications.csv <<EOF
Application,Technology,Dependencies,Traffic,Data Store,Critical,Owner
web-api,Node.js 16,PostgreSQL/Redis,10k req/day,RDS,High,Platform Team
admin-portal,React,web-api,100 users,None,Medium,Admin Team
batch-processor,Python,S3/SQS,Hourly,None,Low,Data Team
EOF

# Document current infrastructure
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,Tags[?Key==`Name`].Value|[0]]' --output table

# Document databases
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,Engine,EngineVersion,DBInstanceClass,Endpoint.Address]' --output table

# Document load balancers
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,Type,State.Code,DNSName]' --output table
```

### Assess Application Dependencies

```bash
# Map service dependencies
# Create dependency-map.md

cat > dependency-map.md <<EOF
# Application Dependency Map

## web-api
- **Depends on:**
  - PostgreSQL database (RDS)
  - Redis cache (ElastiCache)
  - S3 for file storage
  - SES for email
- **Consumed by:**
  - admin-portal
  - mobile-app
  - batch-processor

## admin-portal
- **Depends on:**
  - web-api
  - CloudFront for static assets
- **Consumed by:**
  - Internal users

## batch-processor
- **Depends on:**
  - web-api
  - SQS queue
  - S3 for input/output
- **Consumed by:**
  - Scheduled cron
EOF
```

### Identify Migration Risks

Create a risk assessment document:

```markdown
# Migration Risk Assessment

## High Risk
- **Database migration downtime**: 2-4 hours for 500GB database
  - Mitigation: Use read replica promotion
- **DNS propagation**: 24-48 hours for some users
  - Mitigation: Reduce TTL to 60s one week before migration
- **Data consistency**: Potential for data loss during cutover
  - Mitigation: Implement read-only mode during migration

## Medium Risk
- **SSL certificate renewal**: Existing certificates in old load balancer
  - Mitigation: Request new certificates via ACM
- **Third-party integrations**: Webhook URLs may need updating
  - Mitigation: Update webhooks to new endpoints
```

---

## Phase 2: Application Containerization (Week 3-4)

### Create Dockerfile for Each Application

Example for Node.js application:

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Build if needed (for TypeScript, etc.)
RUN npm run build

# Production image
FROM node:20-alpine

# Add non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Use non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
```

### Build and Test Containers Locally

```bash
# Build image
docker build -t web-api:local .

# Run locally
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@localhost:5432/db \
  -e REDIS_URL=redis://localhost:6379 \
  web-api:local

# Test health endpoint
curl http://localhost:3000/health

# Run integration tests
docker run --rm \
  -e NODE_ENV=test \
  web-api:local \
  npm test
```

### Create Kubernetes Manifests

Create production-ready manifests:

```yaml
# k8s/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  labels:
    app: web-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: web-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: web-api
        image: ghcr.io/your-org/web-api:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: web-api-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: web-api-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
---
# k8s/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-api
  labels:
    app: web-api
spec:
  type: ClusterIP
  selector:
    app: web-api
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
---
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-api
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-2:123456789012:certificate/abc123
    alb.ingress.kubernetes.io/ssl-redirect: "443"
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-api
            port:
              number: 80
```

---

## Phase 3: Database Migration (Week 5)

### Create Database Migration Plan

```bash
# 1. Create read replica in new VPC
aws rds create-db-instance-read-replica \
  --db-instance-identifier prod-db-replica \
  --source-db-instance-identifier prod-db \
  --db-subnet-group-name new-vpc-db-subnet \
  --publicly-accessible false

# 2. Monitor replication lag
aws rds describe-db-instances \
  --db-instance-identifier prod-db-replica \
  --query 'DBInstances[0].StatusInfos'

# 3. When lag is minimal, promote replica
aws rds promote-read-replica \
  --db-instance-identifier prod-db-replica

# 4. Update application connection strings
kubectl create secret generic web-api-secrets \
  --from-literal=database-url="postgresql://user:pass@new-db-endpoint:5432/db" \
  -n production --dry-run=client -o yaml | kubectl apply -f -

# 5. Restart pods to use new database
kubectl rollout restart deployment/web-api -n production
```

### Database Cutover Checklist

```markdown
# Database Migration Cutover

## Pre-Migration (1 week before)
- [ ] Create read replica in new VPC
- [ ] Monitor replication lag (should be < 10 seconds)
- [ ] Test application with replica endpoint
- [ ] Reduce DNS TTL to 60 seconds
- [ ] Schedule maintenance window (communicate to users)

## During Migration Window
- [ ] Enable maintenance mode on application
- [ ] Stop all write traffic to old database
- [ ] Wait for replication lag to reach 0
- [ ] Promote read replica to standalone instance
- [ ] Update connection strings in Kubernetes secrets
- [ ] Deploy updated configuration
- [ ] Verify application can read/write to new database
- [ ] Run smoke tests
- [ ] Disable maintenance mode

## Post-Migration
- [ ] Monitor error rates and latency
- [ ] Keep old database available for 1 week (read-only)
- [ ] Update backup policies for new database
- [ ] Decommission old database after verification period
```

---

## Phase 4: Staged Rollout (Week 6-8)

### Deploy to Staging Environment First

```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Run smoke tests
kubectl run smoke-test --rm -i --tty \
  --image=curlimages/curl \
  --restart=Never \
  -- curl -f http://web-api.staging.svc.cluster.local/health

# Run full test suite
kubectl apply -f k8s/test-job.yaml
kubectl wait --for=condition=complete job/integration-tests --timeout=600s
kubectl logs job/integration-tests
```

### Blue-Green Deployment Strategy

```bash
# Deploy green environment (new version)
kubectl apply -k k8s/overlays/production-green

# Verify green is healthy
kubectl get pods -l app=web-api,version=green -n production
kubectl logs -l app=web-api,version=green -n production --tail=100

# Route small percentage of traffic to green (using service mesh or ingress weights)
# Update ingress/service mesh configuration to split traffic 95% blue / 5% green

# Monitor metrics for green deployment
kubectl port-forward -n monitoring svc/grafana 3000:80
# Check dashboard for errors, latency, throughput

# Gradually increase traffic: 10%, 25%, 50%, 75%, 100%

# Once green is fully validated, remove blue
kubectl delete -k k8s/overlays/production-blue
```

### Canary Deployment with Argo Rollouts

Install Argo Rollouts:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Install kubectl plugin
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-darwin-amd64
chmod +x kubectl-argo-rollouts-darwin-amd64
sudo mv kubectl-argo-rollouts-darwin-amd64 /usr/local/bin/kubectl-argo-rollouts
```

Create Rollout manifest:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-api
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 5m}
      - setWeight: 40
      - pause: {duration: 5m}
      - setWeight: 60
      - pause: {duration: 5m}
      - setWeight: 80
      - pause: {duration: 5m}
  revisionHistoryLimit: 2
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
      - name: web-api
        image: ghcr.io/your-org/web-api:1.1.0
        # ... rest of container spec
```

Deploy and monitor:

```bash
# Deploy rollout
kubectl apply -f rollout.yaml

# Watch progress
kubectl argo rollouts get rollout web-api --watch

# Promote to next step manually
kubectl argo rollouts promote web-api

# Abort rollout if issues detected
kubectl argo rollouts abort web-api

# Full rollback
kubectl argo rollouts undo web-api
```

---

## Phase 5: Traffic Cutover (Week 9)

### DNS Migration Strategy

```bash
# 1. Verify new load balancer is ready
kubectl get ingress -n production

# 2. Get ALB DNS name
ALB_DNS=$(kubectl get ingress web-api -n production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo $ALB_DNS

# 3. Test new endpoint
curl -H "Host: api.example.com" http://$ALB_DNS/health

# 4. Update DNS record (use your DNS provider)
# Route53 example:
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# 5. Monitor DNS propagation
watch dig api.example.com

# 6. Monitor traffic shift
kubectl logs -f -l app=web-api -n production
```

### Weighted Routing During Cutover

Use Route53 weighted routing for gradual cutover:

```bash
# Create weighted record for old infrastructure (90% weight)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "old-infra",
        "Weight": 90,
        "TTL": 60,
        "ResourceRecords": [{"Value": "1.2.3.4"}]
      }
    }]
  }'

# Create weighted record for new infrastructure (10% weight)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "new-infra",
        "Weight": 10,
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Gradually increase new-infra weight: 25%, 50%, 75%, 100%
# Then delete old-infra record
```

---

## Phase 6: Monitoring & Optimization (Ongoing)

### Set Up Alerts for New Infrastructure

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: web-api-alerts
  namespace: production
spec:
  groups:
  - name: web-api
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{job="web-api",status=~"5.."}[5m]))
        /
        sum(rate(http_requests_total{job="web-api"}[5m]))
        > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }}"
    
    - alert: HighLatency
      expr: |
        histogram_quantile(0.95,
          rate(http_request_duration_seconds_bucket{job="web-api"}[5m])
        ) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency detected"
        description: "P95 latency is {{ $value }}s"
```

Apply the rules:

```bash
kubectl apply -f prometheus-rules.yaml
```

### Performance Optimization

```bash
# Horizontal Pod Autoscaler
kubectl autoscale deployment web-api \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n production

# Verify HPA
kubectl get hpa -n production

# Vertical Pod Autoscaler (install first)
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vertical-pod-autoscaler.yaml

# Create VPA recommendation
cat <<EOF | kubectl apply -f -
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  updatePolicy:
    updateMode: "Auto"
EOF

# Check VPA recommendations
kubectl describe vpa web-api-vpa -n production
```

### Cost Optimization

```bash
# Review resource usage
kubectl top pods -n production
kubectl top nodes

# Identify over-provisioned resources
kubectl resource-capacity --pods --util

# Use Spot instances for non-critical workloads
# Update node group to use Spot instances

# Review AWS Cost Explorer for EKS costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

---

## Rollback Plan

If critical issues are discovered:

```bash
# Immediate rollback via DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "OLD_IP_ADDRESS"}]
      }
    }]
  }'

# Rollback application version
kubectl argo rollouts undo web-api

# Or rollback via Kubernetes
kubectl rollout undo deployment/web-api -n production

# Rollback database (if within retention window)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier prod-db \
  --target-db-instance-identifier prod-db-restored \
  --restore-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
```

---

## Post-Migration Cleanup (Week 10+)

```bash
# Decommission old infrastructure after 2 weeks of successful operation

# Terminate EC2 instances
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0

# Delete old load balancers
aws elbv2 delete-load-balancer --load-balancer-arn arn:aws:elasticloadbalancing:...

# Delete old RDS instances (after final backup)
aws rds create-db-snapshot \
  --db-instance-identifier old-prod-db \
  --db-snapshot-identifier old-prod-db-final-snapshot

aws rds delete-db-instance \
  --db-instance-identifier old-prod-db \
  --skip-final-snapshot

# Remove old security groups
aws ec2 delete-security-group --group-id sg-old123

# Update documentation with new architecture
# Close migration project in project management tool
```

---

## What Gets Accomplished

After completing this step, you'll have:

✅ **Comprehensive Migration Plan**
- Application inventory
- Dependency mapping
- Risk assessment
- Rollback procedures

✅ **Containerized Applications**
- Production-ready Dockerfiles
- Kubernetes manifests
- Security hardening

✅ **Database Migration**
- Zero-downtime database cutover
- Connection string updates
- Backup verification

✅ **Gradual Traffic Shift**
- Blue-green or canary deployments
- Weighted DNS routing
- Real-time monitoring

✅ **Optimized Production Environment**
- Auto-scaling configured
- Cost optimization implemented
- Performance monitoring active

---

## Success Criteria

Your migration is successful when:

- [ ] All applications running in EKS with zero downtime
- [ ] Database migrated with no data loss
- [ ] Error rates and latency within acceptable thresholds
- [ ] All DNS records updated and propagated
- [ ] Old infrastructure decommissioned
- [ ] Cost targets met or exceeded
- [ ] Documentation updated with new architecture
- [ ] Team trained on new systems
- [ ] Runbooks created for common operations

---

## 30/60/90 Day Goals

### 30 Days
- Complete infrastructure setup (VPC, EKS, observability)
- Containerize first pilot application
- Deploy to staging environment
- Document migration process

### 60 Days
- Migrate first production application
- Complete database migration
- Establish CI/CD pipelines
- Train team on new tools

### 90 Days
- Migrate all applications to Kubernetes
- Decommission legacy infrastructure
- Optimize costs and performance
- Present metrics and improvements to leadership

---

## Congratulations!

You've completed the onboarding process and successfully established a modern, scalable infrastructure platform. Your organization now has:

- **Cloud-native infrastructure** on AWS EKS
- **Automated deployments** via GitOps
- **Comprehensive observability** with Prometheus and Grafana
- **Security best practices** integrated throughout
- **Local development** environments for rapid iteration
- **Cost-optimized** infrastructure with auto-scaling

Continue to iterate and improve based on team feedback and evolving requirements.

---

## Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Kubernetes Production Best Practices](https://learnk8s.io/production-best-practices)
- [The Twelve-Factor App](https://12factor.net/)
- [Site Reliability Engineering (SRE) Book](https://sre.google/books/)

---

<div style="display: flex; justify-content: flex-start; margin-top: 32px;">
  <a href="/onboarding/local-development/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Local Development Environment</a>
</div>
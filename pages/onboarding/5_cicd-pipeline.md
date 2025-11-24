---
layout: base.html
title: "CI/CD Pipeline Setup"
permalink: /onboarding/cicd-pipeline/
---

# CI/CD Pipeline Setup

**Time to Complete:** 3-4 hours  
**Prerequisites:** [Infrastructure Deployment](/onboarding/infrastructure/) completed

## Overview

Set up a complete CI/CD pipeline using GitHub Actions with security scanning, automated testing, and GitOps deployment via ArgoCD.

---

## 1. GitHub Actions Workflows

### Build and Test Workflow

Create `.github/workflows/build.yml` in your application repository:

```yaml
name: Build and Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

### Docker Build and Push Workflow

Create `.github/workflows/docker.yml`:

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      security-events: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Run Trivy vulnerability scanner on image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.version }}
          format: 'sarif'
          output: 'trivy-image-results.sarif'
      
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-image-results.sarif'
```

---

## 2. Install ArgoCD

### Deploy ArgoCD to EKS

```bash
# Create argocd namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Access ArgoCD at `https://localhost:8080`
- Username: `admin`
- Password: (from the command above)

### Install ArgoCD CLI

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# Login via CLI
argocd login localhost:8080 --username admin
```

---

## 3. Configure ArgoCD Application

### Create Application Manifest

Create `argocd/application.yaml` in your infrastructure repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sample-app
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/your-org/your-app-repo
    targetRevision: main
    path: k8s/overlays/production
  
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### Apply the Application

```bash
kubectl apply -f argocd/application.yaml

# Verify application is syncing
argocd app list
argocd app get sample-app

# Watch sync status
argocd app sync sample-app --watch
```

---

## 4. Set Up GitHub Secrets

### Create AWS Access Keys for GitHub Actions

```bash
# Create IAM policy for GitHub Actions
cat > github-actions-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create IAM user for GitHub Actions
aws iam create-user --user-name github-actions

# Attach policy
aws iam create-policy --policy-name GitHubActionsECR --policy-document file://github-actions-policy.json
aws iam attach-user-policy --user-name github-actions --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/GitHubActionsECR

# Create access keys
aws iam create-access-key --user-name github-actions
```

### Add Secrets to GitHub Repository

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID`: From the create-access-key output
- `AWS_SECRET_ACCESS_KEY`: From the create-access-key output
- `AWS_REGION`: Your AWS region (e.g., `us-east-2`)
- `EKS_CLUSTER_NAME`: Your EKS cluster name

---

## 5. Configure Image Pull Secrets

### Create Docker Registry Secret

```bash
# For GitHub Container Registry
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --docker-email=YOUR_EMAIL \
  -n production

# Patch default service account to use the secret
kubectl patch serviceaccount default -n production \
  -p '{"imagePullSecrets": [{"name": "ghcr-secret"}]}'
```

---

## 6. Deploy Kubernetes Manifests Structure

### Create Kustomize Directory Structure

In your application repository:

```bash
mkdir -p k8s/base k8s/overlays/staging k8s/overlays/production

# Create base deployment
cat > k8s/base/deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
      - name: app
        image: ghcr.io/your-org/your-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
EOF

# Create base service
cat > k8s/base/service.yaml <<EOF
apiVersion: v1
kind: Service
metadata:
  name: sample-app
spec:
  selector:
    app: sample-app
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
EOF

# Create base kustomization
cat > k8s/base/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
EOF

# Create production overlay
cat > k8s/overlays/production/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../../base
namespace: production
replicas:
  - name: sample-app
    count: 3
images:
  - name: ghcr.io/your-org/your-app
    newTag: latest
EOF
```

---

## 7. SonarQube Integration (Optional)

### Add SonarQube Scan to Workflow

Add to `.github/workflows/build.yml`:

```yaml
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

---

## What Gets Created

After completing this step, you'll have:

✅ **GitHub Actions Workflows**
- Automated testing on every PR
- Security scanning with Trivy
- Docker image building and pushing
- Image vulnerability scanning

✅ **ArgoCD Installation**
- GitOps deployment platform running in EKS
- Web UI for monitoring deployments
- CLI tools for management

✅ **ArgoCD Application**
- Automated sync from Git repository
- Self-healing deployments
- Automatic pruning of deleted resources

✅ **GitHub Secrets**
- AWS credentials for deployment
- Secure secret management

✅ **Kubernetes Manifests**
- Kustomize-based configuration
- Base and overlay structure
- Production-ready deployments

---

## Validation Checklist

Run these commands to verify everything is working:

```bash
# Verify ArgoCD is running
kubectl get pods -n argocd

# Verify application is synced
argocd app get sample-app

# Check application health
kubectl get pods -n production

# Verify GitHub Actions workflows
# Go to your repository → Actions tab and check recent runs

# Test image pull
kubectl run test-pod --image=ghcr.io/your-org/your-app:latest -n production --rm -it -- /bin/sh
```

Expected outputs:
- All ArgoCD pods are Running
- ArgoCD application shows "Synced" and "Healthy"
- Application pods are Running in production namespace
- GitHub Actions workflows are passing
- Test pod can pull image successfully

---

## Troubleshooting

### ArgoCD Application Not Syncing

```bash
# Check application events
argocd app get sample-app --show-params

# View sync status
kubectl describe application sample-app -n argocd

# Force sync
argocd app sync sample-app --force
```

### GitHub Actions Failing

```bash
# Test AWS credentials locally
aws sts get-caller-identity

# Verify ECR login
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-2.amazonaws.com

# Check workflow logs in GitHub UI
```

### Image Pull Errors

```bash
# Verify secret exists
kubectl get secret ghcr-secret -n production -o yaml

# Check service account
kubectl get sa default -n production -o yaml

# Test image pull manually
docker pull ghcr.io/your-org/your-app:latest
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Kustomize Documentation](https://kustomize.io/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/infrastructure/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Infrastructure Deployment</a>
  <a href="/onboarding/local-development/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Local Development Environment &rarr;</a>
</div>
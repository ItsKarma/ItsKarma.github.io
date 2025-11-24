# Infrastructure & Deployment Examples

This directory contains step-by-step examples for setting up a complete cloud infrastructure and deployment pipeline from scratch. Each step builds on the previous one, taking you from an empty AWS account to a fully functional production-ready environment.

## Getting Started

Follow these steps in order. Each directory contains its own README with detailed instructions.

### Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured
- Terraform >= 1.5.0
- kubectl >= 1.28
- Helm >= 3.12
- Docker Desktop (for local development)

## Step-by-Step Guide

### Step 1: AWS Organization Setup
**Directory:** `terraform/aws-organization/`

Set up AWS Organizations with separate accounts for dev, staging, and production.

```bash
cd terraform/aws-organization
terraform init
terraform plan
terraform apply
```

**What you get:** Multi-account structure with centralized billing and security policies.

---

### Step 2: Security Baseline
**Directory:** `terraform/security/`

Configure AWS Config, budgets, IAM policies, and root account security.

```bash
cd terraform/security
terraform init
terraform plan
terraform apply
```

**What you get:** AWS Config enabled, budget alerts configured, security guardrails in place.

---

### Step 3: Network Infrastructure
**Directory:** `terraform/vpc/`

Create VPC with public/private subnets across multiple availability zones.

```bash
cd terraform/vpc
terraform init
terraform plan
terraform apply
```

**What you get:** Secure VPC with proper subnet isolation, NAT gateways, and routing.

---

### Step 4: EKS Cluster
**Directory:** `terraform/eks/`

Deploy production-grade EKS cluster with node groups and add-ons.

```bash
cd terraform/eks
terraform init
terraform plan
terraform apply

# Update kubeconfig
aws eks update-kubeconfig --name production-cluster --region us-east-1
```

**What you get:** Running EKS cluster ready for workloads.

---

### Step 5: Observability Stack
**Directory:** `kubernetes/helm-charts/observability/`

Deploy Prometheus, Grafana, and Loki for monitoring and logging.

```bash
cd kubernetes/helm-charts/observability
./install.sh
```

**What you get:** Full observability stack with dashboards and log aggregation.

---

### Step 6: ArgoCD for GitOps
**Directory:** `kubernetes/helm-charts/argocd/`

Install ArgoCD for GitOps-based deployment management.

```bash
cd kubernetes/helm-charts/argocd
./install.sh

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

**What you get:** ArgoCD running and ready to manage deployments.

---

### Step 7: Sample Application
**Directory:** `kubernetes/helm-charts/sample-app/`

Deploy a 3-tier sample application to test the full stack.

```bash
cd kubernetes/helm-charts/sample-app
helm install sample-app . -n sample-app --create-namespace
```

**What you get:** Running application with frontend, backend, and database.

---

### Step 8: CI/CD Pipeline
**Directory:** `github-actions/workflows/`

Set up GitHub Actions workflows for automated deployments.

```bash
# Copy workflow files to your repository
cp github-actions/workflows/*.yml <your-repo>/.github/workflows/

# Configure secrets in GitHub
# - AWS_ACCESS_KEY_ID (or use OIDC - recommended)
# - AWS_SECRET_ACCESS_KEY
# - KUBE_CONFIG_DATA
```

**What you get:** Automated CI/CD pipeline with security scans and deployments.

---

## Local Development (Optional)

### Option A: Docker Compose
**Directory:** `docker/`

Run the full stack locally with Docker Compose.

```bash
cd docker
docker-compose up -d
```

### Option B: K3s
**Directory:** `k3s/`

Run a local Kubernetes cluster with K3s.

```bash
cd k3s
./install.sh
./deploy-sample-app.sh
```

---

## Directory Structure

```
examples/
├── terraform/           # Infrastructure as Code
├── kubernetes/          # Kubernetes manifests and Helm charts
├── docker/             # Local development with Docker Compose
├── k3s/                # Local Kubernetes with K3s
├── github-actions/     # CI/CD workflows
└── scripts/            # Utility scripts
```

## Quick Links

- [Terraform Examples](./terraform/)
- [Kubernetes & Helm](./kubernetes/)
- [Docker Compose Setup](./docker/)
- [K3s Local Development](./k3s/)
- [GitHub Actions Workflows](./github-actions/)
- [Utility Scripts](./scripts/)

## Estimated Timeline

- **Day 1**: Steps 1-3 (AWS Organization, Security, VPC)
- **Day 2**: Steps 4-5 (EKS, Observability)
- **Day 3**: Steps 6-8 (ArgoCD, Sample App, CI/CD)

## Getting Help

Each subdirectory has its own README with detailed instructions. If you encounter issues:

1. Check the README in the specific directory
2. Verify prerequisites are installed
3. Ensure AWS credentials are configured correctly
4. Review Terraform/Helm output for error messages

## Notes

- Run Terraform commands from each directory separately
- Apply changes in order - later steps depend on earlier infrastructure
- Keep track of outputs from each step (they may be needed in subsequent steps)
- Test in a dev account before running in production

---
layout: base.html
title: "Infrastructure Deployment"
permalink: /onboarding/infrastructure/
---

1. VPC networking with public/private subnets
2. EKS Kubernetes cluster
3. Observability stack (Prometheus, Grafana, Loki)
4. Sample 3-tier application

---

## VPC Networking

Create isolated networking with best practices.

### Terraform Deployment

```bash
cd examples/terraform/vpc

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### What Gets Created

- **VPC**: Isolated network in your AWS account
- **Public Subnets**: 3 subnets across availability zones for load balancers
- **Private Subnets**: 3 subnets for EKS nodes and applications
- **NAT Gateways**: One per AZ for outbound internet from private subnets
- **Internet Gateway**: For inbound/outbound traffic to public subnets
- **Route Tables**: Configured for public and private routing
- **Security Groups**: Base security groups for cluster communication

### Key Considerations

- Network isolation and security groups
- Multi-AZ deployment for high availability
- Proper CIDR block sizing for growth
- VPC endpoints for AWS services (S3, ECR, etc.)

**Terraform VPC Module**: [Link to examples/terraform/vpc/]

---

## EKS Cluster

Deploy a production-ready Kubernetes cluster.

### Terraform Deployment

```bash
cd examples/terraform/eks

# Initialize Terraform (with VPC state as data source)
terraform init

# Review the plan
terraform plan

# Apply the configuration (takes ~15-20 minutes)
terraform apply
```

### What Gets Created

- **EKS Control Plane**: Managed Kubernetes control plane
- **Node Groups**: Auto-scaling groups for worker nodes
- **IAM Roles**: For cluster, nodes, and service accounts
- **Security Groups**: Cluster and node communication rules
- **EKS Add-ons**: CoreDNS, kube-proxy, VPC CNI
- **OIDC Provider**: For IAM roles for service accounts (IRSA)

### Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region us-east-2 \
  --name my-company-eks-cluster \
  --profile terraform-admin

# Verify connection
kubectl get nodes
kubectl get pods -A
```

### Best Practices

- Use managed node groups for simplified operations
- Enable cluster logging to CloudWatch
- Use IRSA instead of node IAM roles where possible
- Implement pod security standards
- Use private endpoint access for production

**Terraform EKS Module**: [Link to examples/terraform/eks/]

---

## Observability Stack

Deploy monitoring and logging before applications.

### Prerequisites

Ensure your EKS cluster is running and kubectl is configured.

### Deploy with Helm

```bash
cd examples/kubernetes/helm-charts/observability

# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values values-prometheus.yaml

# Install Loki for logs
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --values values-loki.yaml

# Verify installation
kubectl get pods -n monitoring
```

### What Gets Deployed

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards
- **Loki**: Log aggregation
- **Alertmanager**: Alert routing and management
- **Node Exporter**: Node-level metrics
- **kube-state-metrics**: Kubernetes object metrics

### Access Grafana

```bash
# Port-forward to access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Open browser to http://localhost:3000
# Default credentials: admin / prom-operator
```

### Pre-configured Dashboards

- Kubernetes cluster overview
- Node resource usage
- Pod metrics and logs
- Persistent volume usage
- Network traffic

**Helm Charts**: [Link to examples/kubernetes/helm-charts/observability/]

---

## Sample Application

Deploy a 3-tier application to validate the setup.

### Architecture

- **Frontend**: React web application (NGINX)
- **Backend**: Node.js API
- **Database**: PostgreSQL

### Deploy with Helm

```bash
cd examples/kubernetes/helm-charts/sample-app

# Install the sample application
helm install sample-app . \
  --namespace sample-app \
  --create-namespace \
  --values values.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l app=sample-app \
  -n sample-app \
  --timeout=300s

# Get the load balancer URL
kubectl get svc -n sample-app sample-app-frontend
```

### Verify Application

```bash
# Check all components are running
kubectl get pods -n sample-app

# View logs
kubectl logs -n sample-app -l app=sample-app-backend

# Test the application
curl http://<LOAD_BALANCER_URL>
```

**Sample App Chart**: [Link to examples/kubernetes/helm-charts/sample-app/]

---

## Validation

Before moving to Step 4, verify:

- ✅ VPC created with public and private subnets
- ✅ EKS cluster running with worker nodes
- ✅ kubectl configured and able to query cluster
- ✅ Prometheus and Grafana deployed and accessible
- ✅ Loki deployed for log aggregation
- ✅ Sample application deployed and responding
- ✅ All pods in `Running` state
- ✅ Grafana dashboards showing metrics

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/basic-security/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Basic Security</a>
  <a href="/onboarding/cicd-pipeline/" style="text-decoration: none; color: #4ade80; font-weight: 500;">CI/CD Pipeline &rarr;</a>
</div>
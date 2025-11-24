# Kubernetes & Helm Examples

Kubernetes manifests and Helm charts for deploying applications and infrastructure components to EKS.

## Prerequisites

- EKS cluster running (from Terraform step 4)
- kubectl configured to access the cluster
- Helm 3.12+ installed
- kubeconfig updated: `aws eks update-kubeconfig --name <cluster-name> --region <region>`

## Helm Charts

### 1. Observability Stack
**Directory:** `helm-charts/observability/`

Complete monitoring and logging solution with Prometheus, Grafana, and Loki.

```bash
cd helm-charts/observability
./install.sh
```

**Access Grafana:**
```bash
kubectl port-forward -n observability svc/grafana 3000:80
# Open http://localhost:3000
# Default: admin/admin
```

---

### 2. ArgoCD
**Directory:** `helm-charts/argocd/`

GitOps continuous delivery tool for Kubernetes.

```bash
cd helm-charts/argocd
./install.sh

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

**Access ArgoCD:**
```bash
kubectl port-forward -n argocd svc/argocd-server 8080:443
# Open https://localhost:8080
```

---

### 3. Sample Application
**Directory:** `helm-charts/sample-app/`

3-tier application example (frontend, backend, database).

```bash
cd helm-charts/sample-app
helm install sample-app . -n sample-app --create-namespace

# Check deployment
kubectl get pods -n sample-app
```

---

## Raw Manifests

The `manifests/` directory contains raw Kubernetes YAML files:

- `namespaces/` - Namespace definitions for different environments
- `rbac/` - Role-based access control configurations
- `network-policies/` - Network policy examples for isolation

Apply manifests:
```bash
kubectl apply -f manifests/namespaces/
kubectl apply -f manifests/rbac/
```

## ArgoCD Applications

The `argocd-apps/` directory contains ArgoCD Application definitions for GitOps workflows:

```bash
# Deploy dev environment apps
kubectl apply -f argocd-apps/dev/

# Deploy production environment apps
kubectl apply -f argocd-apps/production/
```

## Chart Development

To create a new Helm chart:

```bash
helm create my-app
cd my-app
# Edit values.yaml and templates/
helm lint .
helm template . | kubectl apply --dry-run=client -f -
```

## Useful Commands

```bash
# List Helm releases
helm list -A

# Upgrade a release
helm upgrade <release-name> <chart-path> -n <namespace>

# Rollback a release
helm rollback <release-name> -n <namespace>

# Uninstall a release
helm uninstall <release-name> -n <namespace>

# View pod logs
kubectl logs -f <pod-name> -n <namespace>

# Get pod details
kubectl describe pod <pod-name> -n <namespace>
```

## Troubleshooting

**Pods not starting:**
```bash
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
kubectl describe pod <pod-name> -n <namespace>
```

**Checking resources:**
```bash
kubectl top nodes
kubectl top pods -n <namespace>
```

**Exec into pod:**
```bash
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh
```

## Next Steps

After deploying charts:
1. Configure Grafana dashboards
2. Set up ArgoCD applications for your services
3. Deploy your actual application using the sample-app as template
4. Proceed to Step 8: CI/CD Pipeline

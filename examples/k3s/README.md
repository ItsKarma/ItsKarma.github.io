# Local Kubernetes with K3s

Run a lightweight local Kubernetes cluster using K3s. Perfect for testing Helm charts and Kubernetes manifests before deploying to production.

## What is K3s?

K3s is a lightweight Kubernetes distribution perfect for local development. It provides a full Kubernetes experience in under 512MB of RAM.

## Prerequisites

- macOS, Linux, or WSL2 on Windows
- 4GB+ RAM recommended
- Docker Desktop (optional, for container runtime)
- kubectl installed
- Helm installed

## Installation

### Automated Setup

```bash
./install.sh
```

This script:
1. Installs K3s
2. Configures kubeconfig
3. Installs Helm
4. Verifies the installation

### Manual Setup

```bash
# Install K3s
curl -sfL https://get.k3s.io | sh -

# Copy kubeconfig
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config

# Verify installation
kubectl get nodes
```

## Quick Start

```bash
# Check cluster status
kubectl get nodes

# Deploy sample application
./deploy-sample-app.sh

# Access application
kubectl port-forward -n sample-app svc/frontend 3000:80
# Open http://localhost:3000
```

## Configuration

K3s configuration is in `config.yaml`. Key settings:

```yaml
# Disable Traefik (use your own ingress)
disable:
  - traefik

# Use Docker instead of containerd
docker: true

# Resource limits
node-memory-limit: 4096
```

Apply custom config:

```bash
sudo systemctl stop k3s
sudo k3s server --config config.yaml
```

## Working with the Cluster

### Deploy Helm Charts

```bash
# Add Helm repo
helm repo add stable https://charts.helm.sh/stable
helm repo update

# Install chart
helm install my-app stable/nginx-ingress -n my-app --create-namespace

# List releases
helm list -A
```

### Deploy Raw Manifests

```bash
# Apply manifests from kubernetes examples
kubectl apply -f ../kubernetes/manifests/

# Check resources
kubectl get all -A
```

### Testing Deployments

```bash
# Deploy from local Helm chart
helm install test-app ../kubernetes/helm-charts/sample-app/

# Watch deployment
kubectl get pods -w

# Check logs
kubectl logs -f deployment/test-app
```

## Port Forwarding

Access services running in the cluster:

```bash
# Forward service port
kubectl port-forward svc/<service-name> <local-port>:<service-port> -n <namespace>

# Example: Access Grafana
kubectl port-forward svc/grafana 3000:80 -n observability
```

## Load Balancer (Optional)

K3s includes a simple load balancer. Services with `type: LoadBalancer` get assigned IPs:

```bash
# Check load balancer IPs
kubectl get svc -A | grep LoadBalancer
```

## Resource Management

### View Resource Usage

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -A

# Detailed node info
kubectl describe node
```

### Scaling

```bash
# Scale deployment
kubectl scale deployment <name> --replicas=3 -n <namespace>

# Autoscaling
kubectl autoscale deployment <name> --min=2 --max=10 --cpu-percent=80
```

## Cleanup

### Remove Specific Deployments

```bash
# Uninstall Helm release
helm uninstall <release-name> -n <namespace>

# Delete namespace
kubectl delete namespace <namespace>
```

### Reset Cluster

```bash
# Remove all resources
kubectl delete all --all -A

# Or completely reset K3s
./uninstall.sh
```

### Uninstall K3s

```bash
# Automated
./uninstall.sh

# Manual
sudo /usr/local/bin/k3s-uninstall.sh
```

## Differences from Production EKS

K3s is great for development but has some differences:

| Feature | K3s | EKS |
|---------|-----|-----|
| Node management | Single node | Managed node groups |
| Load balancer | Built-in | AWS ELB/ALB |
| Storage | Local-path | EBS/EFS |
| HA | Single master | Multi-master |
| Add-ons | Basic | AWS integrations |

## Troubleshooting

### Cluster Not Starting

```bash
# Check K3s status
sudo systemctl status k3s

# View logs
sudo journalctl -u k3s -f

# Restart K3s
sudo systemctl restart k3s
```

### Pod Stuck Pending

```bash
# Check events
kubectl describe pod <pod-name>

# Check node resources
kubectl top nodes

# May need to increase resource limits
```

### Network Issues

```bash
# Restart K3s networking
sudo systemctl restart k3s

# Check CoreDNS
kubectl get pods -n kube-system | grep coredns
```

## Tips

1. **Test Helm Charts**: Validate charts locally before deploying to EKS
2. **Practice kubectl**: Learn Kubernetes commands in a safe environment
3. **CI/CD Testing**: Run tests against K3s in CI pipelines
4. **Resource Limits**: Test how apps behave with limited resources
5. **Quick Iteration**: Faster than deploying to cloud for development

## Next Steps

1. Deploy the observability stack to monitor your local cluster
2. Test your Helm charts and manifests
3. Practice kubectl commands
4. When ready, deploy to EKS using the Terraform examples

## References

- [K3s Documentation](https://docs.k3s.io/)
- [K3s GitHub](https://github.com/k3s-io/k3s)

# Utility Scripts

Helper scripts for common AWS, Kubernetes, and infrastructure tasks.

## AWS Scripts

### `aws/rotate-access-keys.sh`
Automate IAM access key rotation.

```bash
./aws/rotate-access-keys.sh <iam-username>
```

### `aws/audit-unused-keys.sh`
Find and report IAM access keys not used in 90+ days.

```bash
./aws/audit-unused-keys.sh > unused-keys-report.txt
```

### `aws/setup-mfa.sh`
Interactive script to set up MFA for IAM user.

```bash
./aws/setup-mfa.sh
```

## Kubernetes Scripts

### `k8s/setup-observability.sh`
Deploy complete observability stack (Prometheus, Grafana, Loki).

```bash
./k8s/setup-observability.sh
```

### `k8s/deploy-argocd.sh`
Install and configure ArgoCD.

```bash
./k8s/deploy-argocd.sh

# Get admin password
./k8s/get-argocd-password.sh
```

## Local Development Scripts

### `local-dev/setup-k3s.sh`
Automated K3s installation and configuration.

```bash
./local-dev/setup-k3s.sh
```

### `local-dev/setup-docker-compose.sh`
Initialize Docker Compose development environment.

```bash
./local-dev/setup-docker-compose.sh
```

## Usage

All scripts include:
- Input validation
- Error handling
- Help text (`--help`)
- Dry-run mode where applicable

## Requirements

Most scripts require:
- AWS CLI configured
- kubectl (for K8s scripts)
- Appropriate IAM permissions
- Bash 4.0+

Check individual script comments for specific requirements.

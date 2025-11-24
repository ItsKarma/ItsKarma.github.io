# GitHub Actions CI/CD Workflows

Complete CI/CD pipeline examples using GitHub Actions for automated testing, security scanning, and deployment to EKS.

## Prerequisites

- GitHub repository
- AWS credentials configured as GitHub secrets
- EKS cluster running
- Docker Hub or ECR for container registry

## Workflows

### 1. CI Pipeline (`ci-pipeline.yml`)

Complete continuous integration pipeline with testing and security scans.

**Triggers:** Push to any branch, pull requests

**Steps:**
1. Checkout code
2. Lint (ESLint, Prettier, etc.)
3. Run unit tests
4. Generate code coverage
5. SonarQube scan
6. Trivy security scan
7. Build Docker image
8. Push to registry (on main branch)

**Usage:**
```bash
# Copy to your repository
cp workflows/ci-pipeline.yml <your-repo>/.github/workflows/
```

---

### 2. Deploy to EKS (`deploy-to-eks.yml`)

Automated deployment to EKS cluster.

**Triggers:** Push to main branch (after CI passes), manual workflow dispatch

**Steps:**
1. Configure AWS credentials
2. Update kubeconfig for EKS
3. Deploy with Helm or kubectl
4. Run smoke tests
5. Verify deployment health

**Usage:**
```bash
cp workflows/deploy-to-eks.yml <your-repo>/.github/workflows/
```

---

### 3. Security Scan (`security-scan.yml`)

Standalone security scanning workflow.

**Triggers:** Pull requests, scheduled (daily), manual

**Steps:**
1. Trivy vulnerability scan
2. SonarQube code quality scan
3. Dependency check
4. SAST analysis
5. Generate security report

---

### 4. Terraform (`terraform.yml`)

Infrastructure as code deployment workflow.

**Triggers:** Pull requests (plan), push to main (apply), manual

**Steps:**
1. Terraform fmt check
2. Terraform validate
3. Terraform plan (on PR)
4. Terraform apply (on merge to main)
5. Comment plan results on PR

---

## Reusable Workflows

The `reusable-workflows/` directory contains modular workflow components:

- `lint.yml` - Code linting
- `test.yml` - Unit and integration tests
- `build.yml` - Docker image build and push

Use in your workflows:

```yaml
jobs:
  lint:
    uses: ./.github/workflows/reusable-workflows/lint.yml
    
  test:
    uses: ./.github/workflows/reusable-workflows/test.yml
    needs: lint
```

## Required GitHub Secrets

Configure these secrets in your repository settings:

### AWS Credentials (Option 1: Access Keys)
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

### AWS Credentials (Option 2: OIDC - Recommended)
```
AWS_ROLE_TO_ASSUME
AWS_REGION
```

### Kubernetes
```
KUBE_CONFIG_DATA (base64 encoded kubeconfig)
```

### Container Registry
```
DOCKER_USERNAME
DOCKER_PASSWORD
# Or for ECR, use AWS credentials above
```

### SonarQube
```
SONAR_TOKEN
SONAR_HOST_URL
```

## Setting Up AWS OIDC (Recommended)

Instead of storing AWS access keys, use OIDC for secure authentication:

```bash
# Create OIDC provider in AWS
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list <thumbprint>

# Create IAM role for GitHub Actions
# See workflows/terraform.yml for trust policy example
```

## Workflow Customization

### Environment Variables

Common variables to customize:

```yaml
env:
  AWS_REGION: us-east-1
  EKS_CLUSTER_NAME: production-cluster
  ECR_REPOSITORY: my-app
  HELM_CHART_PATH: ./charts/my-app
  NAMESPACE: production
```

### Matrix Builds

Test across multiple versions:

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
    os: [ubuntu-latest, macos-latest]
```

### Conditional Steps

Run steps based on conditions:

```yaml
- name: Deploy to Production
  if: github.ref == 'refs/heads/main'
  run: |
    helm upgrade --install app ./chart
```

## Pipeline Stages

### Full Pipeline Flow

```
┌──────────┐
│   Push   │
└────┬─────┘
     │
     ▼
┌──────────┐
│   Lint   │
└────┬─────┘
     │
     ▼
┌──────────┐
│   Test   │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│  Code Coverage  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│   SonarQube     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Trivy Scan     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│     Build       │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Push Image     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Deploy to Test │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Smoke Tests    │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Deploy to Prod │
└─────────────────┘
```

## Best Practices

1. **Security**
   - Use OIDC instead of access keys
   - Scan images before deployment
   - Never commit secrets to code
   - Use GitHub secrets for sensitive data

2. **Performance**
   - Cache dependencies
   - Use matrix builds wisely
   - Parallelize independent jobs
   - Optimize Docker builds with layers

3. **Reliability**
   - Pin action versions (@v2, not @main)
   - Set timeouts on jobs
   - Add retry logic for flaky tests
   - Use status checks as branch protection

4. **Visibility**
   - Add job summaries
   - Post comments on PRs
   - Send Slack notifications
   - Track deployment metrics

## Monitoring Workflows

### View Workflow Runs

```bash
# Using GitHub CLI
gh run list
gh run view <run-id>
gh run watch
```

### Debug Failed Workflows

1. Check workflow logs in GitHub UI
2. Re-run failed jobs
3. Enable debug logging:
   ```
   ACTIONS_STEP_DEBUG: true
   ACTIONS_RUNNER_DEBUG: true
   ```

## Example Usage

```bash
# Push code to trigger CI
git push origin feature-branch

# Merge PR to trigger deployment
# (After PR approval and CI passes)

# Manual deployment
gh workflow run deploy-to-eks.yml

# View status
gh run list --workflow=deploy-to-eks.yml
```

## Integration with ArgoCD

For GitOps workflow:

1. CI pipeline builds and tags image
2. CI updates image tag in Git repository
3. ArgoCD detects change and deploys
4. No cluster credentials in CI

Example workflow step:

```yaml
- name: Update Image Tag
  run: |
    cd k8s-manifests
    yq -i '.image.tag = "${{ github.sha }}"' values.yaml
    git commit -am "Update image to ${{ github.sha }}"
    git push
```

## Troubleshooting

### Workflow Not Triggering

- Check branch name in trigger conditions
- Verify workflow file syntax
- Check if workflows are enabled for the repo

### Authentication Failures

- Verify secrets are set correctly
- Check IAM permissions for AWS
- Ensure OIDC provider is configured

### Deployment Failures

- Check EKS cluster accessibility
- Verify kubeconfig is correct
- Check pod logs: `kubectl logs -f <pod>`

## Next Steps

1. Copy relevant workflows to your repository
2. Configure GitHub secrets
3. Customize workflows for your application
4. Set up branch protection rules
5. Monitor first few deployments
6. Iterate and improve based on team feedback

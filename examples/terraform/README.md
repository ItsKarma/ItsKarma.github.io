# Terraform Examples

Infrastructure as Code examples for AWS using Terraform. These modules build a production-ready AWS environment from scratch.

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured with admin credentials
- An AWS account (preferably empty or for testing)

## Modules

### 1. AWS Organization Setup
**Directory:** `aws-organization/`

Creates AWS Organizations structure with multiple accounts.

```bash
cd aws-organization
terraform init
terraform plan
terraform apply
```

**Creates:**
- Management account
- Development account
- Production account
- Security account
- Service Control Policies (SCPs)

---

### 2. Security Baseline
**Directory:** `security/`

Implements security best practices across all accounts.

```bash
cd security
terraform init
terraform plan
terraform apply
```

**Configures:**
- AWS Config in all regions
- Budget alerts
- IAM password policies
- GuardDuty
- CloudTrail

---

### 3. VPC Network
**Directory:** `vpc/`

Creates VPC with best-practice networking setup.

```bash
cd vpc
terraform init
terraform plan
terraform apply
```

**Creates:**
- VPC with public and private subnets
- NAT gateways for high availability
- Internet gateway
- Route tables
- Network ACLs

---

### 4. EKS Cluster
**Directory:** `eks/`

Deploys production-ready EKS cluster.

```bash
cd eks
terraform init
terraform plan
terraform apply
```

**Creates:**
- EKS cluster
- Managed node groups
- IRSA (IAM Roles for Service Accounts)
- Security groups
- EKS add-ons (CoreDNS, kube-proxy, VPC CNI)

---

## Reusable Modules

The `modules/` directory contains reusable Terraform modules that can be imported into your own projects:

- `modules/vpc/` - VPC module with sensible defaults
- `modules/eks/` - EKS cluster module
- `modules/security-baseline/` - Security configuration module

## Usage Pattern

Each example follows the same pattern:

1. **Initialize**: `terraform init`
2. **Review**: `terraform plan`
3. **Apply**: `terraform apply`
4. **Save outputs**: Note important outputs for next steps

## Variables

Most modules use `variables.tf` for configuration. Common variables:

- `region` - AWS region (default: us-east-1)
- `environment` - Environment name (dev/staging/prod)
- `project_name` - Project identifier
- `tags` - Common tags applied to all resources

## Outputs

Important outputs from each module are saved and can be used in subsequent steps. Access outputs:

```bash
terraform output
terraform output -json
```

## State Management

For production use, configure remote state:

```hcl
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "path/to/state"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-locks"
  }
}
```

## Cleanup

To destroy resources (be careful!):

```bash
terraform destroy
```

**Destroy in reverse order:**
1. EKS cluster
2. VPC
3. Security baseline
4. AWS Organization (last)

## Notes

- Review plans carefully before applying
- Start with small changes and test thoroughly
- Use workspaces for multiple environments
- Always tag resources for cost tracking

# AWS Organization Setup

Creates a multi-account AWS Organization structure with separate accounts for different environments.

## What This Creates

- AWS Organization in the management account
- Development account
- Production account
- Security account (for centralized logging/security tools)
- Service Control Policies (SCPs) for security guardrails

## Prerequisites

- AWS CLI configured with credentials for the management account
- Admin permissions in the AWS account
- Terraform >= 1.5.0

## Usage

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

## Configuration

Edit `variables.tf` or create a `terraform.tfvars` file:

```hcl
org_name = "my-company"
dev_account_email = "aws-dev@company.com"
prod_account_email = "aws-prod@company.com"
security_account_email = "aws-security@company.com"
```

## Important Notes

- Email addresses must be unique and not already associated with AWS accounts
- You'll receive verification emails for each new account
- The current account becomes the management account
- You cannot undo organization creation (only delete member accounts)

## After Applying

1. Check your email for account verification links
2. Note the account IDs from the outputs
3. Set up cross-account roles for access
4. Configure AWS SSO (IAM Identity Center) for user management

## Outputs

- `organization_id` - The Organization ID
- `dev_account_id` - Development account ID
- `prod_account_id` - Production account ID  
- `security_account_id` - Security account ID

## Next Steps

After creating the organization:
1. Enable AWS SSO in the management account
2. Set up permission sets for different roles
3. Configure SCPs for additional security controls
4. Proceed to Step 2: Security Baseline

## Clean Up

To remove the organization (not recommended in production):

```bash
# First remove member accounts
terraform destroy

# Then manually close the organization in AWS Console
```

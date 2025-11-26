---
layout: base.html
title: "Basic Security Setup"
permalink: /onboarding/basic-security/
---

# Basic Security Setup

Establish foundational security monitoring and cost controls before deploying infrastructure.

**Time to Complete:** 2-3 hours  
**Prerequisites:** [Terraform State Setup](/onboarding/terraform-state/) completed

## Overview

In this step, we'll configure **required, low-cost security basics**:
1. AWS Config for compliance monitoring
2. Per-account cost budgets and alerts
3. IAM credential management policies

**Account Scope**: These configurations should be applied **per-account** in each member account (Development, Staging, Production, Security, Shared Services).

---

## Optional Enhanced Security Features

**For teams just starting out**: The configurations on this page cover the essentials and are low/no cost. You can skip advanced security features and enable them later when needed (e.g., when pursuing SOC2 certification or scaling to production).

Consider enabling these optional features based on your needs:

- 📊 [CloudTrail Logging](/onboarding/optional/cloudtrail/) - Required for SOC2 and audit compliance (~$2-10/month per account)
- 🛡️ [GuardDuty Threat Detection](/onboarding/optional/guardduty/) - AI-powered threat detection (~$5-50/month per account)
- ✅ [Security Hub](/onboarding/optional/security-hub/) - Compliance frameworks like CIS and PCI-DSS (~$0.001 per check)
- 💰 [Cost Anomaly Detection](/onboarding/optional/cost-anomaly-detection/) - **Free** ML-based spend alerts
- 🔒 [Service Control Policies](/onboarding/optional/service-control-policies/) - Organization-wide guardrails (free)

**When to enable**: Most teams enable these when preparing for compliance certifications (SOC2, ISO 27001) or when managing production workloads at scale.

---

## AWS Config

AWS Config continuously monitors and records resource configurations for compliance and security auditing.

**Account Scope**: Run this configuration in **each member account** (Development, Staging, Production, Security, Shared Services).

**Cost**: ~$0.003 per configuration item recorded + ~$0.001 per config rule evaluation. Typical cost: $10-30/month per account.

### Implementation

Enable AWS Config across all regions to track resources:

```bash
# Run this in each member account by assuming the OrganizationAccountAccessRole
# You'll repeat this process for each account, or use a tool like aws-vault or Terragrunt

# Example for Development account:
aws sts assume-role \
  --role-arn arn:aws:iam::111111111111:role/OrganizationAccountAccessRole \
  --role-session-name config-setup

# Set credentials from assume-role output
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."

# Then navigate to AWS Config console or apply Terraform
```

### Terraform Configuration

Create `terraform/security/aws-config.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "development/security/aws-config.tfstate"  # Change per account
    region         = "us-east-2"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-2"
}

data "aws_caller_identity" "current" {}

# S3 bucket for Config snapshots
resource "aws_s3_bucket" "config" {
  bucket = "aws-config-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "AWS Config Bucket"
    Environment = "Development"  # Change per account
    ManagedBy   = "Terraform"
  }
}

# IAM role for Config
resource "aws_iam_role" "config" {
  name = "AWSConfigRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}

resource "aws_iam_role_policy" "config_s3" {
  name = "config-s3-policy"
  role = aws_iam_role.config.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketVersioning",
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = [
          aws_s3_bucket.config.arn,
          "${aws_s3_bucket.config.arn}/*"
        ]
      }
    ]
  })
}

# Config recorder
resource "aws_config_configuration_recorder" "main" {
  name     = "aws-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# Config delivery channel
resource "aws_config_delivery_channel" "main" {
  name           = "aws-config-delivery"
  s3_bucket_name = aws_s3_bucket.config.bucket

  depends_on = [aws_config_configuration_recorder.main]
}

# Start recording
resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}
```

### Configuration Rules

Set up managed rules for compliance:

```hcl
# Add to aws-config.tf

# Detect inactive IAM users
resource "aws_config_config_rule" "iam_unused_credentials" {
  name = "iam-user-unused-credentials-check"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_UNUSED_CREDENTIALS_CHECK"
  }

  input_parameters = jsonencode({
    maxCredentialUsageAge = "90"
  })

  depends_on = [aws_config_configuration_recorder.main]
}

# Prevent public S3 buckets
resource "aws_config_config_rule" "s3_public_read" {
  name = "s3-bucket-public-read-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure EBS encryption
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

### Apply Configuration

```bash
cd terraform/security
terraform init
terraform apply
```

---

## Cost Management & Budget Alerts

Create per-account budgets to give teams ownership and visibility into their spending.

**Account Scope**: Create budgets in **each member account** to monitor that account's spending.

**Cost**: AWS Budgets are **free** for the first 2 budgets per account, then $0.02 per budget per day.

### Why Per-Account Budgets?

- **Team Accountability**: Each team gets alerts for their own account
- **Granular Control**: Set different thresholds for Development ($1k) vs Production ($10k)
- **Faster Response**: Alerts go directly to the responsible team
- **Multi-layer Protection**: Works alongside optional Cost Anomaly Detection

### Terraform Budget Configuration

Create `terraform/security/budgets.tf`:

```hcl
# Monthly budget with alerts
resource "aws_budgets_budget" "monthly" {
  name              = "monthly-budget"
  budget_type       = "COST"
  limit_amount      = "1000"  # Adjust per account
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-01-01_00:00"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team-dev@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team-dev@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team-dev@company.com", "finance@company.com"]
  }

  cost_filter {
    name   = "LinkedAccount"
    values = [data.aws_caller_identity.current.account_id]
  }
}
```

### Example Budgets by Environment

- **Development**: $1,000/month with alerts at 50%, 80%, 100%
- **Staging**: $2,000/month with alerts at 50%, 80%, 100%
- **Production**: $10,000/month with alerts at 50%, 80%, 100%
- **Security**: $500/month with alerts at 50%, 80%, 100%
- **Shared Services**: $2,000/month with alerts at 50%, 80%, 100%

---

## IAM Access Keys & Credential Management

Eliminate long-lived credentials to reduce security risk.

**Account Scope**: Apply IAM policies and credential auditing in **each member account**.

**Cost**: Free (IAM policies have no cost)

### Best Practices

1. **Use IAM Roles**: Prefer roles over access keys wherever possible
   - EC2 instance profiles for applications
   - EKS service accounts with IRSA (IAM Roles for Service Accounts)
   - GitHub Actions OIDC for CI/CD (no stored secrets)

2. **Rotate Credentials**: If access keys are necessary:
   - Set maximum age policy (90 days)
   - Automate rotation where possible
   - Use AWS Secrets Manager for storage

3. **Remove Unused Keys**: Regular audits to delete:
   - Keys not used in 90+ days
   - Keys for departed employees
   - Keys from testing/development

4. **Least Privilege**: Grant minimal permissions required
   - Use IAM policy conditions
   - Implement permission boundaries
   - Regular access reviews

5. **MFA for Console Access**: Require MFA for all human users

### Automation

Set up automated credential monitoring with a Lambda function or script:

```bash
#!/bin/bash
# Script: audit-unused-keys.sh
# Purpose: Find IAM access keys older than 90 days

aws iam list-users --query 'Users[*].UserName' --output text | while read user; do
  aws iam list-access-keys --user-name "$user" --query 'AccessKeyMetadata[*].[UserName,AccessKeyId,CreateDate,Status]' --output text | while read username keyid createdate status; do
    age_days=$(( ($(date +%s) - $(date -d "$createdate" +%s)) / 86400 ))
    if [ $age_days -gt 90 ]; then
      echo "WARNING: $username has key $keyid that is $age_days days old"
    fi
  done
done
```

**Terraform IAM Policy**: Create policies that enforce credential rotation:

```hcl
# Deny old access keys
resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_numbers                = true
  require_uppercase_characters   = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 24
}
```

---

## Validation

Before moving to Step 4, verify in **each member account**:

- ✅ AWS Config enabled and recording
- ✅ Config rules deployed (IAM credentials, S3 public access, EBS encryption)
- ✅ Cost budget created with email notifications at 50%, 80%, 100%
- ✅ IAM credential audit process established
- ✅ MFA enforced for console users
- ✅ Password policy configured

### Verification Commands

```bash
# Verify Config is recording
aws configservice describe-configuration-recorder-status

# List Config rules
aws configservice describe-config-rules

# Verify budgets
aws budgets describe-budgets --account-id YOUR_ACCOUNT_ID

# Check password policy
aws iam get-account-password-policy
```

**Tip**: Use Terraform workspaces or Terragrunt to manage per-account configurations efficiently rather than manually switching between accounts.

---

## What We Accomplished

✅ **AWS Config**: Monitoring resource configurations in all member accounts  
✅ **Cost Budgets**: Per-account spending alerts at multiple thresholds  
✅ **IAM Policies**: Credential rotation and MFA enforcement  
✅ **Baseline Security**: Foundation for compliance and governance  

---

## Cost Summary

- **AWS Config**: ~$10-30/month per account (configuration items + rule evaluations)
- **Budgets**: Free (first 2 per account)
- **IAM**: Free
- **Total per account**: ~$10-30/month

**For 6 accounts** (management + 5 members): ~$60-180/month

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/terraform-state/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Terraform State Setup</a>
  <a href="/onboarding/infrastructure/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Infrastructure Deployment &rarr;</a>
</div>

---
layout: base.html
title: "Terraform Organization Setup"
permalink: /onboarding/terraform-organization/
---

# Terraform Organization Setup

**Time to Complete:** 2-3 hours  
**Prerequisites:** [AWS Account Setup](/onboarding/aws-account-setup/) completed

## Overview

Now that we've set up the AWS Organization structure, we'll create the Terraform state infrastructure and bring everything under Terraform management. This includes:

1. Creating the S3 bucket and DynamoDB table for Terraform state
2. Importing the state bucket and DynamoDB table into Terraform management
3. Enabling organization-wide security features (CloudTrail, GuardDuty, Security Hub, Config)
4. Applying Service Control Policies (SCPs) for governance

---

## Step 1: Create Terraform State Infrastructure

Set up remote state storage to enable team collaboration and prevent state conflicts.

### Create S3 Bucket for State

```bash
# Create bucket (use your company name)
aws s3api create-bucket \
  --bucket my-company-terraform-state \
  --region us-east-2 \
  --profile terraform-admin

# Enable versioning (critical for rollback)
aws s3api put-bucket-versioning \
  --bucket my-company-terraform-state \
  --versioning-configuration Status=Enabled \
  --profile terraform-admin

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket my-company-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --profile terraform-admin

# Block public access
aws s3api put-public-access-block \
  --bucket my-company-terraform-state \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile terraform-admin
```

### Create DynamoDB Table for Locking

```bash
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-2 \
  --profile terraform-admin
```

### Verify State Infrastructure

```bash
# Verify S3 bucket exists
aws s3 ls s3://my-company-terraform-state --profile terraform-admin

# Verify DynamoDB table exists
aws dynamodb describe-table --table-name terraform-state-lock --profile terraform-admin
```

Expected outputs:
- S3 bucket is accessible
- DynamoDB table status is `ACTIVE`

---

## Step 2: Import State Resources into Terraform

Now that we've manually created the S3 bucket and DynamoDB table, let's bring them under Terraform management so future changes are tracked in code.

### Create Terraform Configuration

Create a new directory for state management:

```bash
mkdir -p terraform/state-backend
cd terraform/state-backend
```

Create `main.tf`:

```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = "us-east-2"
  profile = "terraform-admin"
}

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-company-terraform-state"

  tags = {
    Name        = "Terraform State Bucket"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Terraform State Lock Table"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}
```

### Initialize Terraform (Local State)

For now, we'll use local state to import these resources:

```bash
# Initialize Terraform
terraform init

# Verify configuration is valid
terraform validate
```

### Import Existing Resources

Import the S3 bucket and DynamoDB table into Terraform state:

```bash
# Import S3 bucket
terraform import aws_s3_bucket.terraform_state my-company-terraform-state

# Import S3 bucket versioning
terraform import aws_s3_bucket_versioning.terraform_state my-company-terraform-state

# Import S3 bucket encryption
terraform import aws_s3_bucket_server_side_encryption_configuration.terraform_state my-company-terraform-state

# Import S3 bucket public access block
terraform import aws_s3_bucket_public_access_block.terraform_state my-company-terraform-state

# Import DynamoDB table
terraform import aws_dynamodb_table.terraform_locks terraform-state-lock
```

### Verify Import

Check that Terraform now manages these resources:

```bash
# Show current state
terraform state list

# Expected output:
# aws_s3_bucket.terraform_state
# aws_s3_bucket_versioning.terraform_state
# aws_s3_bucket_server_side_encryption_configuration.terraform_state
# aws_s3_bucket_public_access_block.terraform_state
# aws_dynamodb_table.terraform_locks

# Verify no changes needed
terraform plan

# Should show: "No changes. Your infrastructure matches the configuration."
```

### Migrate to Remote State

Now that Terraform manages the state infrastructure, migrate this state to the S3 backend:

Create `backend.tf` in the same directory:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "management/state-backend/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
    profile        = "terraform-admin"
  }
}
```

Migrate the state:

```bash
# Reinitialize with new backend
terraform init -migrate-state

# Terraform will ask: "Do you want to copy existing state to the new backend?"
# Type: yes

# Verify state is now in S3
aws s3 ls s3://my-company-terraform-state/management/state-backend/ --profile terraform-admin

# You should see: terraform.tfstate

# Verify local state is gone (optional cleanup)
rm -f terraform.tfstate terraform.tfstate.backup
```

### Test State Locking

Verify the DynamoDB lock works:

```bash
# Run a plan (should acquire lock)
terraform plan

# In another terminal, try to run plan simultaneously
# It should wait for the lock to be released
```

### Commit Configuration

**Important**: Commit the Terraform configuration to Git (but not the state files):

```bash
# In your terraform/state-backend directory
cat > .gitignore <<EOF
# Local state files
*.tfstate
*.tfstate.backup
.terraform/
.terraform.lock.hcl

# Sensitive variable files
*.tfvars
*.auto.tfvars
EOF

# Add and commit
git add main.tf backend.tf .gitignore
git commit -m "Add Terraform config for state backend infrastructure"
```

---

## Step 3: Enable Organization-Wide Features

Enable security and governance features across all accounts using Terraform.

Create a new directory for organization-wide features:

```bash
mkdir -p terraform/organization
cd terraform/organization
```

Create `organization-features.tf`:

```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "management/organization/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
    profile        = "terraform-admin"
  }
}

provider "aws" {
  region  = "us-east-2"
  profile = "terraform-admin"
}

data "aws_caller_identity" "current" {}

# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "organization-cloudtrail-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "Organization CloudTrail Logs"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Organization-wide CloudTrail
resource "aws_cloudtrail" "organization" {
  name                          = "organization-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_organization_trail         = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  tags = {
    Name        = "Organization Trail"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}

# Enable GuardDuty delegated admin (Security account)
resource "aws_guardduty_organization_admin_account" "security" {
  admin_account_id = "222222222222" # Replace with your Security Account ID
}

# Enable GuardDuty detector
resource "aws_guardduty_detector" "main" {
  enable = true

  tags = {
    Name        = "Organization GuardDuty"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# Enable GuardDuty with auto-enable for new accounts
resource "aws_guardduty_organization_configuration" "main" {
  auto_enable = true
  detector_id = aws_guardduty_detector.main.id

  datasources {
    s3_logs {
      auto_enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }
}

# Enable Security Hub delegated admin
resource "aws_securityhub_organization_admin_account" "security" {
  admin_account_id = "222222222222" # Replace with your Security Account ID
}

# Enable Security Hub with auto-enable
resource "aws_securityhub_organization_configuration" "main" {
  auto_enable = true
}

# S3 bucket for Config
resource "aws_s3_bucket" "config" {
  bucket = "organization-config-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "Organization Config Logs"
    Environment = "Management"
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

  tags = {
    Name        = "AWS Config Role"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
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

# Enable AWS Config across organization
resource "aws_config_configuration_recorder" "main" {
  name     = "organization-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "organization-config-delivery"
  s3_bucket_name = aws_s3_bucket.config.bucket

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}
```

### Apply the Configuration

```bash
# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Apply the configuration
terraform apply
```

### What Gets Enabled

After applying, you'll have:

- ✅ **Organization-wide CloudTrail** with log file validation and S3 storage
- ✅ **GuardDuty** with auto-enable for new member accounts and S3/Kubernetes monitoring
- ✅ **Security Hub** with auto-enable for new member accounts
- ✅ **AWS Config** recorder and delivery channel for compliance monitoring

**Note:** Some features like IAM Identity Center still require initial setup via Console, but can be managed via Terraform afterward using the `aws_ssoadmin_*` resources.

---

## Step 4: Apply Service Control Policies (SCPs)

Create SCPs using Terraform to enforce guardrails across all accounts.

Create `service-control-policies.tf` in the same directory:

```hcl
# SCP: Prevent disabling security services
resource "aws_organizations_policy" "prevent_security_disablement" {
  name        = "PreventSecurityDisablement"
  description = "Prevent disabling CloudTrail, GuardDuty, Config, and Security Hub"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = [
          "cloudtrail:StopLogging",
          "cloudtrail:DeleteTrail",
          "guardduty:DeleteDetector",
          "guardduty:DisassociateFromMasterAccount",
          "guardduty:DisassociateMembers",
          "config:DeleteConfigRule",
          "config:DeleteConfigurationRecorder",
          "config:DeleteDeliveryChannel",
          "config:StopConfigurationRecorder",
          "securityhub:DisableSecurityHub",
          "securityhub:DisassociateFromMasterAccount"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "Prevent Security Disablement"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# SCP: Restrict to approved regions
resource "aws_organizations_policy" "restrict_regions" {
  name        = "RestrictRegions"
  description = "Only allow us-east-2 and us-west-2"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Deny"
        Action   = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = [
              "us-east-2",
              "us-west-2"
            ]
          }
          # Allow global services
          ArnNotLike = {
            "aws:PrincipalArn" = [
              "arn:aws:iam::*:role/aws-service-role/*"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name        = "Restrict Regions"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# SCP: Require MFA for sensitive actions
resource "aws_organizations_policy" "require_mfa" {
  name        = "RequireMFA"
  description = "Require MFA for sensitive API calls"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = [
          "ec2:StopInstances",
          "ec2:TerminateInstances",
          "rds:DeleteDBInstance",
          "s3:DeleteBucket",
          "iam:DeleteUser",
          "iam:DeleteRole"
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "Require MFA"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# Get organization root
data "aws_organizations_organization" "main" {}

# Attach SCPs to organization root (applies to all accounts)
resource "aws_organizations_policy_attachment" "prevent_security_root" {
  policy_id = aws_organizations_policy.prevent_security_disablement.id
  target_id = data.aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_policy_attachment" "restrict_regions_root" {
  policy_id = aws_organizations_policy.restrict_regions.id
  target_id = data.aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_policy_attachment" "require_mfa_root" {
  policy_id = aws_organizations_policy.require_mfa.id
  target_id = data.aws_organizations_organization.main.roots[0].id
}
```

### Apply SCPs

```bash
# Plan to see what SCPs will be created
terraform plan

# Apply the SCPs
terraform apply
```

### Verify SCPs

```bash
# List all SCPs
aws organizations list-policies --filter SERVICE_CONTROL_POLICY

# View SCP details
aws organizations describe-policy --policy-id p-xxxxxxxxxx

# List policy attachments
aws organizations list-policies-for-target --target-id r-xxxx
```

---

## What We Accomplished

After completing this step, you'll have:

✅ **Terraform State Management**: S3 bucket and DynamoDB table managed by Terraform  
✅ **Remote State**: State stored in S3 with locking  
✅ **Organization-wide CloudTrail**: All API calls logged across all accounts  
✅ **GuardDuty**: Threat detection with auto-enable for new accounts  
✅ **Security Hub**: Centralized security findings  
✅ **AWS Config**: Compliance monitoring and configuration history  
✅ **Service Control Policies**: Guardrails preventing security disablement, restricting regions, and requiring MFA  

---

## Validation Checklist

Run these commands to verify everything is configured:

```bash
# Verify Terraform state is in S3
aws s3 ls s3://my-company-terraform-state/management/ --recursive --profile terraform-admin

# Verify CloudTrail is enabled
aws cloudtrail describe-trails --profile terraform-admin

# Verify GuardDuty is enabled
aws guardduty list-detectors --profile terraform-admin

# Verify Security Hub is enabled
aws securityhub describe-hub --profile terraform-admin

# Verify Config is recording
aws configservice describe-configuration-recorder-status --profile terraform-admin

# Verify SCPs are attached
aws organizations list-policies-for-target --target-id $(aws organizations list-roots --query 'Roots[0].Id' --output text) --filter SERVICE_CONTROL_POLICY
```

Expected outputs:
- Terraform state files visible in S3
- CloudTrail trail shows "organization-trail"
- GuardDuty detector ID returned
- Security Hub status shows "ACTIVE"
- Config recorder status shows "Recording: true"
- Three SCPs attached to root

---

## Troubleshooting

### Terraform Import Fails

```bash
# Check if resource already exists
aws s3api head-bucket --bucket my-company-terraform-state --profile terraform-admin

# Verify DynamoDB table
aws dynamodb describe-table --table-name terraform-state-lock --profile terraform-admin

# If import fails, check resource IDs match exactly
```

### GuardDuty Delegation Fails

```bash
# Check if Security account exists
aws organizations describe-account --account-id 222222222222

# Verify GuardDuty is enabled in management account
aws guardduty list-detectors
```

### SCP Not Taking Effect

```bash
# Verify SCP is attached
aws organizations list-targets-for-policy --policy-id p-xxxxxxxxxx

# Check if account is exempt (management account is always exempt from SCPs)
# Test in a member account to verify SCP works
```

---

## Next Steps

Continue to **[Step 2: Security & Compliance Setup](/onboarding/step-2-security-setup/)** to configure detailed security monitoring and cost controls.

---

## Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Organizations SCPs](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [AWS CloudTrail Best Practices](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html)
- [GuardDuty in Organizations](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html)

---
layout: base.html
title: "Terraform State Setup"
permalink: /onboarding/terraform-state/
---

# Terraform State Setup

**Time to Complete:** 30-60 minutes  
**Prerequisites:** [AWS Account Setup](/onboarding/aws-account-setup/) completed

## Overview

Set up remote state storage to enable team collaboration and prevent state conflicts. This is a **required** foundational step before deploying any infrastructure with Terraform.

**Account Scope**: Run all commands in the **management/root account** using the `terraform-admin` IAM user profile.

---

## Why Remote State?

- **Team Collaboration**: Multiple team members can work with Terraform simultaneously
- **State Locking**: Prevents conflicting changes with DynamoDB locking
- **State History**: S3 versioning enables rollback to previous states
- **Security**: Encrypted storage of sensitive infrastructure data
- **Disaster Recovery**: State is backed up and recoverable

---

1. [Create S3 Bucket for State](/terraform-state/s3-bucket/)
2. [Create DynamoDB Table for Locking](/terraform-state/dynamo-lock-table/)
3. [Import State Resources into Terraform](/terraform-state/state-import/)

---

## Step 4: Import State Resources into Terraform

Now bring the manually created resources under Terraform management.

### Create Terraform Configuration

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

### Initialize Terraform

```bash
# Initialize Terraform (using local state for now)
terraform init

# Verify configuration is valid
terraform validate
```

### Import Existing Resources

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

---

## Step 5: Migrate to Remote State

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

# Clean up local state files (optional)
rm -f terraform.tfstate terraform.tfstate.backup
```

---

## Step 6: Test State Locking

```bash
# Run a plan (should acquire lock)
terraform plan

# In another terminal, try to run plan simultaneously
# It should wait for the lock to be released
```

---

## Step 7: Commit Configuration

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

## What We Accomplished

✅ **S3 Bucket**: Created and configured for Terraform state storage  
✅ **DynamoDB Table**: Created for state locking  
✅ **Terraform Management**: State resources now managed by Terraform  
✅ **Remote State**: State migrated to S3 with locking enabled  
✅ **Version Control**: Terraform configuration committed to Git  

---

## Validation Checklist

```bash
# Verify Terraform state is in S3
aws s3 ls s3://my-company-terraform-state/management/state-backend/ --profile terraform-admin

# Verify state locking works
terraform plan
# Should show lock being acquired and released

# Verify Git commit
git log --oneline -1
# Should show your commit
```

Expected outputs:
- ✅ `terraform.tfstate` file visible in S3
- ✅ DynamoDB lock acquired/released during terraform operations
- ✅ Terraform configuration committed to Git

---

## Cost Estimate

- **S3 Storage**: ~$0.023 per GB/month (state files are typically < 1MB)
- **S3 Requests**: ~$0.0004 per 1,000 requests
- **DynamoDB**: Pay-per-request pricing, ~$0.000001 per lock operation
- **Total**: < $1/month for most teams

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; AWS Account Setup</a>
  <a href="/onboarding/basic-security/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Basic Security Setup &rarr;</a>
</div>

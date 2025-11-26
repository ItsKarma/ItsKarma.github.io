---
layout: base.html
title: "Terraform State S3 Bucket"
permalink: /onboarding/terraform-state/s3-bucket/
---

## Create S3 Bucket for State

First we will create the s3 bucket via aws cli. Later we will import the bucket into state so we can continue to manage it with Terraform going forward.

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

## Verify State Infrastructure

```bash
# Verify S3 bucket exists
aws s3 ls s3://my-company-terraform-state --profile terraform-admin
```

Expected outputs:
- S3 bucket is accessible

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; AWS Account Setup</a>
  <a href="/onboarding/basic-security/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Basic Security Setup &rarr;</a>
</div>

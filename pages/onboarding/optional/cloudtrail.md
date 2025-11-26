---
layout: base.html
title: "CloudTrail Logging (Optional)"
permalink: /onboarding/optional/cloudtrail/
---

# CloudTrail Logging (Optional)

**Enable organization-wide audit logging for compliance and security analysis.**

## When to Enable

- ✅ **SOC2 Compliance**: Required for audit logging
- ✅ **ISO 27001**: Needed for security event tracking
- ✅ **Security Incident Response**: Essential for investigating security events
- ✅ **Compliance Audits**: Provides detailed API call history
- ✅ **Production Workloads**: Recommended for all production accounts

## When to Skip

- ⏭️ **Early Development**: Not critical for initial experimentation
- ⏭️ **Cost-Conscious Startups**: Can enable later when pursuing compliance
- ⏭️ **Personal Projects**: Overkill for hobby/learning projects

---

## What is CloudTrail?

CloudTrail records all API calls made in your AWS account, providing:
- **Who**: Which user or role made the call
- **What**: Which API action was performed
- **When**: Timestamp of the action
- **Where**: Source IP and region
- **Result**: Success or failure

This creates an immutable audit log for compliance, security investigations, and troubleshooting.

---

## Cost Estimate

- **CloudTrail Trail**: $2.00 per 100,000 management events
- **S3 Storage**: ~$0.023 per GB/month (logs are typically 1-5 GB/month per account)
- **Data Events** (optional): $0.10 per 100,000 events (S3/Lambda calls)

**Typical Cost**: $2-10/month per account for management events only  
**With Data Events**: $10-50/month per account depending on activity

**For 6 accounts** (management + 5 members): ~$12-60/month

---

## Implementation

**Account Scope**: Run in the **management account** - automatically collects logs from all member accounts.

### Terraform Configuration

Create `terraform/organization/cloudtrail.tf`:

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
    key            = "management/cloudtrail/terraform.tfstate"
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

# Enable versioning for log retention
resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rule to transition old logs to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  rule {
    id     = "transition-old-logs"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365  # Delete logs after 1 year (adjust per compliance needs)
    }
  }
}

# Bucket policy to allow CloudTrail to write logs
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

# Optional: Enable data events for S3 (additional cost)
# Uncomment if you need S3 object-level logging
/*
resource "aws_cloudtrail" "organization_data_events" {
  name                          = "organization-trail-data-events"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_organization_trail         = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::*//*"]  # All S3 objects
    }
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}
*/
```

### Apply Configuration

```bash
cd terraform/organization
terraform init
terraform plan
terraform apply
```

---

## What You Get

✅ **Organization-Wide Logging**: Automatically collects logs from all member accounts  
✅ **Multi-Region**: Captures events from all AWS regions  
✅ **Log File Validation**: Cryptographic verification prevents tampering  
✅ **Global Service Events**: Captures IAM, Route53, CloudFront events  
✅ **Immutable Audit Trail**: Required for most compliance frameworks  

---

## Validation

```bash
# Verify CloudTrail is enabled
aws cloudtrail describe-trails --profile terraform-admin

# Check trail status
aws cloudtrail get-trail-status --name organization-trail --profile terraform-admin

# Verify logs are being written to S3
aws s3 ls s3://organization-cloudtrail-logs-YOUR_ACCOUNT_ID/AWSLogs/ --profile terraform-admin
```

Expected outputs:
- Trail status shows `IsLogging: true`
- S3 bucket contains log files organized by account/region/date
- Log file validation is enabled

---

## Integration with Security Tools

Once CloudTrail is enabled, you can integrate with:
- **[GuardDuty](/onboarding/optional/guardduty/)**: Uses CloudTrail logs for threat detection
- **AWS Athena**: Query logs with SQL for analysis
- **SIEM Tools**: Forward logs to Splunk, Datadog, or ELK stack
- **AWS Config**: Cross-reference API calls with resource configurations

---

## Cost Optimization Tips

1. **Exclude High-Volume Events**: Filter out noisy read-only events you don't need
2. **Lifecycle Policies**: Automatically transition old logs to Glacier (shown in config above)
3. **Data Events**: Only enable for critical S3 buckets or Lambda functions
4. **Log Analysis**: Use S3 Select or Athena instead of downloading entire logs

---

## Compliance Mapping

| Framework | Requirement | CloudTrail Coverage |
|-----------|------------|---------------------|
| **SOC2** | Audit logging of user actions | ✅ Full coverage |
| **ISO 27001** | Security event logging | ✅ Full coverage |
| **PCI-DSS** | Logging and monitoring | ✅ Full coverage |
| **HIPAA** | Access audit controls | ✅ Full coverage |
| **GDPR** | Data access logging | ✅ Full coverage |

---

## Troubleshooting

### Logs not appearing in S3

```bash
# Check trail status
aws cloudtrail get-trail-status --name organization-trail

# Verify bucket policy
aws s3api get-bucket-policy --bucket organization-cloudtrail-logs-YOUR_ACCOUNT_ID
```

### High costs

```bash
# Check event volume
aws cloudtrail lookup-events --max-results 50

# Review data events (if enabled)
aws cloudtrail get-event-selectors --trail-name organization-trail
```

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/basic-security/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Back to Basic Security</a>
  <a href="/onboarding/optional/guardduty/" style="text-decoration: none; color: #4ade80; font-weight: 500;">GuardDuty &rarr;</a>
</div>

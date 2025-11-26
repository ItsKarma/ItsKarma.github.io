---
layout: base.html
title: "Security Hub (Optional)"
permalink: /onboarding/optional/security-hub/
---

# Security Hub (Optional)

**Centralize security findings and run compliance frameworks (CIS, PCI-DSS) across your AWS organization.**

## When to Enable

- ✅ **SOC2 Compliance**: Required for comprehensive security posture
- ✅ **PCI-DSS Compliance**: Needed for payment card data
- ✅ **CIS Benchmarks**: Industry best practices compliance
- ✅ **Multi-Tool Integration**: Consolidate findings from GuardDuty, Inspector, Macie, IAM Access Analyzer
- ✅ **Security Reporting**: Need executive dashboards and compliance scores

## When to Skip

- ⏭️ **Early Development**: Not needed during prototyping
- ⏭️ **No Compliance Requirements**: Skip if not pursuing certifications
- ⏭️ **Cost-Sensitive**: Can enable later when approaching compliance audits

---

## What is Security Hub?

Security Hub aggregates security findings from multiple AWS services and runs automated compliance checks against standards like:
- **AWS Foundational Security Best Practices**
- **CIS AWS Foundations Benchmark v1.2.0 and v1.4.0**
- **PCI DSS v3.2.1**
- **NIST 800-53**

---

## Cost Estimate

- **Security Checks**: $0.0010 per security check per month
- **Finding Ingestion**: $0.00003 per finding ingested (from GuardDuty, Inspector, etc.)

**Typical Cost**:
- **Per Account**: ~$10-30/month (depends on number of resources and enabled standards)
- **For 6 accounts**: ~$60-180/month

**First 30 days**: Free trial!

---

## Implementation

**Account Scope**: Run in the **management account** - automatically enables in all member accounts.

### Terraform Configuration

Create `terraform/organization/security-hub.tf`:

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
    key            = "management/security-hub/terraform.tfstate"
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

# Enable Security Hub in management account
resource "aws_securityhub_account" "main" {}

# Delegate Security Hub administration to Security account
resource "aws_securityhub_organization_admin_account" "security" {
  admin_account_id = "222222222222"  # Replace with your Security Account ID

  depends_on = [aws_securityhub_account.main]
}

# Enable Security Hub organization configuration
# Auto-enables Security Hub in all current and future member accounts
resource "aws_securityhub_organization_configuration" "main" {
  auto_enable           = true
  auto_enable_standards = "DEFAULT"  # Enables AWS Foundational Security Best Practices

  depends_on = [aws_securityhub_organization_admin_account.security]
}

# Enable CIS AWS Foundations Benchmark v1.4.0
resource "aws_securityhub_standards_subscription" "cis_v140" {
  standards_arn = "arn:aws:securityhub:us-east-2::standards/cis-aws-foundations-benchmark/v/1.4.0"

  depends_on = [aws_securityhub_account.main]
}

# Enable AWS Foundational Security Best Practices
resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:aws:securityhub:us-east-2::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.main]
}

# Optional: Enable PCI DSS v3.2.1 (only if you handle payment card data)
# resource "aws_securityhub_standards_subscription" "pci_dss" {
#   standards_arn = "arn:aws:securityhub:us-east-2::standards/pci-dss/v/3.2.1"
#
#   depends_on = [aws_securityhub_account.main]
# }

# Optional: SNS topic for critical findings
resource "aws_sns_topic" "security_hub_alerts" {
  name = "security-hub-critical-findings"

  tags = {
    Name        = "Security Hub Alerts"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

resource "aws_sns_topic_subscription" "security_hub_email" {
  topic_arn = aws_sns_topic.security_hub_alerts.arn
  protocol  = "email"
  endpoint  = "security-team@company.com"
}

# EventBridge rule for CRITICAL findings
resource "aws_cloudwatch_event_rule" "security_hub_critical" {
  name        = "security-hub-critical-findings"
  description = "Capture Security Hub findings with CRITICAL severity"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Severity = {
          Label = ["CRITICAL"]
        }
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "security_hub_sns" {
  rule      = aws_cloudwatch_event_rule.security_hub_critical.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.security_hub_alerts.arn
}

resource "aws_sns_topic_policy" "security_hub_publish" {
  arn = aws_sns_topic.security_hub_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.security_hub_alerts.arn
      }
    ]
  })
}
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

✅ **Organization-Wide Compliance**: Automatically runs compliance checks across all accounts  
✅ **Centralized Findings**: Aggregates findings from GuardDuty, Inspector, Macie, Config, IAM Access Analyzer  
✅ **Compliance Frameworks**: CIS, AWS Best Practices, PCI-DSS, NIST 800-53  
✅ **Security Score**: Overall compliance score for each standard  
✅ **Automated Remediation**: Integration with AWS Systems Manager for auto-fixes  
✅ **Executive Dashboards**: Visual security posture reporting  

---

## Validation

```bash
# Verify Security Hub is enabled
aws securityhub describe-hub --profile terraform-admin

# List enabled standards
aws securityhub get-enabled-standards --profile terraform-admin

# Check organization configuration
aws securityhub describe-organization-configuration --profile terraform-admin

# View compliance score for CIS Benchmark
aws securityhub get-findings --filters '{
  "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}],
  "GeneratorId": [{"Value": "cis", "Comparison": "PREFIX"}]
}' --profile terraform-admin
```

Expected outputs:
- Hub status shows enabled
- Standards include CIS and AWS Foundational Security Best Practices
- Organization auto-enable is true

---

## Understanding Compliance Scores

Security Hub provides scores for each enabled standard:

| Standard | Focus | Typical Pass Rate |
|----------|-------|-------------------|
| **AWS Foundational** | AWS best practices | 70-85% initially |
| **CIS Benchmark** | Industry standards | 60-80% initially |
| **PCI DSS** | Payment card security | 50-70% initially |

Improving scores involves:
1. Review failed controls
2. Implement remediation (often via Config rules or SCPs)
3. Suppress findings for accepted risks
4. Re-evaluate after changes

---

## Common Findings and Fixes

| Finding | Fix |
|---------|-----|
| **IAM.1: Root account MFA not enabled** | Enable MFA on root account (covered in Step 1) |
| **S3.1: S3 Block Public Access disabled** | Enable via S3 bucket settings |
| **EC2.2: VPC default security group allows traffic** | Remove inbound/outbound rules from default SG |
| **RDS.1: RDS snapshots are public** | Make snapshots private |
| **IAM.4: IAM root user access key exists** | Delete root access keys (covered in Step 1) |

---

## Integration with Remediation

Security Hub integrates with:
- **AWS Systems Manager**: Automated remediation via runbooks
- **Lambda**: Custom remediation functions
- **EventBridge**: Trigger workflows on new findings
- **SIEM Tools**: Forward findings to Splunk, Datadog, etc.

---

## Cost Optimization Tips

1. **Start with AWS Foundational**: Enable CIS and PCI-DSS only when needed
2. **Suppress Accepted Risks**: Mark low-priority findings as suppressed
3. **Filter Finding Ingestion**: Only ingest HIGH/CRITICAL findings if budget-constrained
4. **Monitor Monthly Costs**: Review Security Hub charges in Cost Explorer

---

## Compliance Mapping

| Certification | Security Hub Support |
|---------------|---------------------|
| **SOC2** | ✅ Provides evidence of continuous monitoring |
| **ISO 27001** | ✅ Demonstrates security controls |
| **PCI-DSS** | ✅ Dedicated standard available |
| **HIPAA** | ✅ Covered by AWS Foundational + Config rules |
| **GDPR** | ✅ Helps demonstrate security measures |

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/optional/guardduty/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; GuardDuty</a>
  <a href="/onboarding/optional/cost-anomaly-detection/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Cost Anomaly Detection &rarr;</a>
</div>

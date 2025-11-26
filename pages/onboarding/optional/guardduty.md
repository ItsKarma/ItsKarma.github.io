---
layout: base.html
title: "GuardDuty Threat Detection (Optional)"
permalink: /onboarding/optional/guardduty/
---

# GuardDuty Threat Detection (Optional)

**Enable AI-powered threat detection across your AWS organization.**

## When to Enable

- ✅ **Production Workloads**: Recommended for all production environments
- ✅ **SOC2 Compliance**: Often required for security monitoring
- ✅ **Security-Sensitive Applications**: Financial, healthcare, or PII handling
- ✅ **Threat Monitoring**: Need automated detection of suspicious activity
- ✅ **Compliance Audits**: Demonstrates proactive security posture

## When to Skip

- ⏭️ **Early Development**: Not critical during initial prototyping
- ⏭️ **Cost-Conscious Startups**: Can enable before production launch
- ⏭️ **Low-Risk Projects**: Personal or non-production learning environments

---

## What is GuardDuty?

GuardDuty uses machine learning to detect threats including:
- **Compromised Credentials**: Unusual API calls from stolen access keys
- **Cryptocurrency Mining**: Unauthorized EC2 instances mining crypto
- **Reconnaissance**: Port scanning and network probing
- **Data Exfiltration**: Large data transfers to unusual destinations
- **Malware**: Communication with known command-and-control servers

---

## Cost Estimate

GuardDuty pricing is based on:
- **CloudTrail Events**: $4.00 per million events analyzed
- **VPC Flow Logs**: $1.00 per GB analyzed
- **DNS Logs**: $0.40 per million queries analyzed
- **S3 Data Events**: $0.80 per million events (if S3 Protection enabled)
- **EKS Audit Logs**: $0.12 per GB analyzed (if Kubernetes Protection enabled)

**Typical Cost**:
- **Small Account** (few resources): ~$5-15/month
- **Medium Account** (moderate activity): ~$15-50/month
- **Large Account** (high activity): ~$50-200/month

**For 6 accounts**: ~$30-300/month depending on activity level

**First 30 days**: Free trial for new accounts!

---

## How It Works

1. **Automatic Enablement**: When configured at organization level, GuardDuty automatically enables in all member accounts
2. **Retroactive Coverage**: Applies to existing accounts immediately
3. **Future Accounts**: Auto-enables in any new accounts added to the organization
4. **No Agent Required**: Uses existing AWS logs (CloudTrail, VPC Flow Logs, DNS logs)
5. **Delegated Admin**: Security team can manage findings from dedicated Security account

---

## Implementation

**Account Scope**: Run in the **management account** - automatically enables in all member accounts.

### Terraform Configuration

Create `terraform/organization/guardduty.tf`:

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
    key            = "management/guardduty/terraform.tfstate"
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

# Enable GuardDuty detector in management account
resource "aws_guardduty_detector" "main" {
  enable = true

  # Enable S3 Protection (monitors S3 data events)
  datasources {
    s3_logs {
      enable = true
    }
    
    # Enable Kubernetes Protection (monitors EKS audit logs)
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    
    # Enable Malware Protection (scans EBS volumes)
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  tags = {
    Name        = "Organization GuardDuty"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# Delegate GuardDuty administration to Security account
resource "aws_guardduty_organization_admin_account" "security" {
  admin_account_id = "222222222222"  # Replace with your Security Account ID
}

# Enable GuardDuty organization configuration
# This automatically enables GuardDuty in all current and future member accounts
resource "aws_guardduty_organization_configuration" "main" {
  auto_enable = true
  detector_id = aws_guardduty_detector.main.id

  # Auto-enable S3 Protection in all accounts
  datasources {
    s3_logs {
      auto_enable = true
    }
    
    # Auto-enable Kubernetes Protection in all accounts
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    
    # Auto-enable Malware Protection in all accounts
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  depends_on = [aws_guardduty_organization_admin_account.security]
}

# Optional: SNS topic for GuardDuty findings
resource "aws_sns_topic" "guardduty_alerts" {
  name = "guardduty-alerts"

  tags = {
    Name        = "GuardDuty Alerts"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

resource "aws_sns_topic_subscription" "guardduty_email" {
  topic_arn = aws_sns_topic.guardduty_alerts.arn
  protocol  = "email"
  endpoint  = "security-team@company.com"
}

# Optional: EventBridge rule to send high/critical findings to SNS
resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name        = "guardduty-high-severity-findings"
  description = "Capture GuardDuty findings with HIGH or CRITICAL severity"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [7, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9,
                  8, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9]
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_findings.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.guardduty_alerts.arn
}

resource "aws_sns_topic_policy" "guardduty_publish" {
  arn = aws_sns_topic.guardduty_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.guardduty_alerts.arn
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

✅ **Organization-Wide Protection**: Automatically monitors all current and future member accounts  
✅ **AI-Powered Threat Detection**: Machine learning identifies suspicious activity  
✅ **S3 Protection**: Monitors S3 data events for unusual access patterns  
✅ **Kubernetes Protection**: Analyzes EKS audit logs for threats  
✅ **Malware Protection**: Scans EBS volumes when threats are detected  
✅ **Centralized Management**: Security team views findings from dedicated Security account  
✅ **Real-Time Alerts**: Notifications for high/critical severity findings  

---

## Validation

```bash
# Verify GuardDuty is enabled in management account
aws guardduty list-detectors --profile terraform-admin

# Check detector status
DETECTOR_ID=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text --profile terraform-admin)
aws guardduty get-detector --detector-id $DETECTOR_ID --profile terraform-admin

# Verify organization configuration
aws guardduty describe-organization-configuration --detector-id $DETECTOR_ID --profile terraform-admin

# List member accounts (should show all member accounts auto-enrolled)
aws guardduty list-members --detector-id $DETECTOR_ID --profile terraform-admin
```

Expected outputs:
- Detector status shows `Status: ENABLED`
- `AutoEnable: true` for organization configuration
- All member accounts listed with `RelationshipStatus: ENABLED`

---

## Understanding Findings

GuardDuty findings are categorized by:

### Severity Levels
- **Low** (1.0-3.9): Informational, investigate when time permits
- **Medium** (4.0-6.9): Potential security issue, investigate soon
- **High** (7.0-8.9): Likely security issue, investigate immediately
- **Critical** (9.0-10.0): Confirmed security breach, respond immediately

### Common Finding Types

| Finding | Description | Action |
|---------|-------------|--------|
| **UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration** | Credentials used outside AWS | Rotate keys immediately |
| **CryptoCurrency:EC2/BitcoinTool.B!DNS** | EC2 mining cryptocurrency | Terminate instance |
| **Recon:IAMUser/MaliciousIPCaller** | API calls from known threat IP | Block IP, rotate credentials |
| **Trojan:EC2/DriveBySourceTraffic!DNS** | EC2 communicating with malware C&C | Isolate instance, investigate |
| **UnauthorizedAccess:S3/MaliciousIPCaller** | S3 access from threat actor IP | Review S3 permissions |

---

## Integration with Other Tools

GuardDuty findings can be sent to:
- **[Security Hub](/onboarding/optional/security-hub/)**: Centralized security findings
- **AWS Detective**: Investigate root cause of findings
- **EventBridge**: Trigger automated responses (Lambda, Step Functions)
- **SIEM Tools**: Forward to Splunk, Datadog, or ELK stack
- **PagerDuty/Opsgenie**: Alert on-call security team

---

## Cost Optimization Tips

1. **Start with Free Trial**: 30 days free for new accounts
2. **Disable Unused Features**: Turn off S3 or Kubernetes protection if not needed
3. **Filter Low-Severity Findings**: Focus alerts on HIGH/CRITICAL only
4. **Suppress Known False Positives**: Create suppression rules for recurring non-threats
5. **Monitor Usage**: Check GuardDuty cost in Cost Explorer monthly

---

## Troubleshooting

### GuardDuty not enabled in member account

```bash
# Verify organization configuration
aws guardduty describe-organization-configuration --detector-id $DETECTOR_ID

# Check if auto-enable is true
# If false, manually enable in member accounts or fix organization config
```

### High costs

```bash
# Check which data source is generating most events
aws guardduty get-usage-statistics --detector-id $DETECTOR_ID \
  --usage-statistic-type SUM_BY_DATA_SOURCE \
  --usage-criteria "DataSources={}"

# Consider disabling expensive data sources if not needed
```

### Missing findings

```bash
# Verify detector is enabled and healthy
aws guardduty get-detector --detector-id $DETECTOR_ID

# Check if CloudTrail is enabled (GuardDuty needs it)
aws cloudtrail describe-trails
```

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/optional/cloudtrail/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; CloudTrail</a>
  <a href="/onboarding/optional/security-hub/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Security Hub &rarr;</a>
</div>

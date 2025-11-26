---
layout: base.html
title: "Cost Anomaly Detection (Optional)"
permalink: /onboarding/optional/cost-anomaly-detection/
---

# Cost Anomaly Detection (Optional)

**Enable ML-powered spend monitoring across your AWS organization - completely free!**

## When to Enable

- ✅ **Multiple Teams**: Different teams managing different accounts
- ✅ **Unpredictable Workloads**: Traffic spikes or batch processing
- ✅ **Cost Visibility**: Want proactive alerts before bills get out of control
- ✅ **Early Detection**: Catch misconfigurations (e.g., forgotten EC2 instances) quickly
- ✅ **Always Recommended**: It's free, so there's no reason not to enable it!

## When to Skip

- ⏭️ **Never**: Seriously, it's free and provides valuable early warnings

---

## What is Cost Anomaly Detection?

AWS Cost Anomaly Detection uses machine learning to:
- **Learn Spending Patterns**: Understands normal spending for each service and account
- **Detect Unusual Spend**: Alerts when costs deviate from expected patterns
- **Root Cause Analysis**: Shows which service, account, or resource caused the spike
- **Proactive Notifications**: Email/SNS alerts before month-end

---

## Cost Estimate

**FREE** ✅  
No charge for Cost Anomaly Detection itself. You only pay for normal AWS usage.

---

## How It Works

1. **Monitors Organization-Wide**: Analyzes spending across all member accounts
2. **Machine Learning**: Learns normal patterns over 7-14 days
3. **Anomaly Detection**: Identifies unusual cost increases
4. **Smart Alerts**: Only notifies when anomalies exceed your threshold (e.g., $100)
5. **Root Cause**: Provides detailed breakdown of what caused the anomaly

---

## Implementation

**Account Scope**: Configure in the **management account** to monitor all member accounts.

### Option 1: Enable via Console (Recommended)

```bash
# Navigate to AWS Cost Management Console in management account
# 1. Go to: AWS Cost Management → Cost Anomaly Detection → Get Started
# 2. Create monitor:
#    - Monitor type: AWS Services
#    - Monitor scope: All AWS accounts (organization-wide)
# 3. Configure alert preferences:
#    - Alert threshold: $100 (adjust based on your needs)
#    - Notification frequency: Immediately
# 4. Set up subscribers:
#    - Add email addresses or SNS topics for alerts
```

### Option 2: Enable via Terraform

Create `terraform/organization/cost-anomaly-detection.tf`:

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
    key            = "management/cost-anomaly-detection/terraform.tfstate"
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

# SNS topic for cost anomaly alerts
resource "aws_sns_topic" "cost_anomaly_alerts" {
  name = "cost-anomaly-detection-alerts"

  tags = {
    Name        = "Cost Anomaly Alerts"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

resource "aws_sns_topic_subscription" "cost_anomaly_email" {
  topic_arn = aws_sns_topic.cost_anomaly_alerts.arn
  protocol  = "email"
  endpoint  = "finance-team@company.com"  # Change to your email
}

# Cost Anomaly Detection Monitor - Organization-wide
resource "aws_ce_anomaly_monitor" "organization" {
  name              = "OrganizationWideMonitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = {
    Name        = "Organization Anomaly Monitor"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# Alert subscription for anomalies >= $100
resource "aws_ce_anomaly_subscription" "organization_alerts" {
  name      = "organization-anomaly-alerts"
  frequency = "IMMEDIATE"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.organization.arn
  ]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]  # Alert when anomaly >= $100
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = {
    Name        = "Organization Anomaly Subscription"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# Optional: Create per-account monitors for finer granularity
resource "aws_ce_anomaly_monitor" "per_account" {
  name              = "PerAccountMonitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "LINKED_ACCOUNT"

  tags = {
    Name        = "Per-Account Anomaly Monitor"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ce_anomaly_subscription" "per_account_alerts" {
  name      = "per-account-anomaly-alerts"
  frequency = "IMMEDIATE"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.per_account.arn
  ]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["50"]  # Lower threshold for per-account alerts
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = {
    Name        = "Per-Account Anomaly Subscription"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}
```

### Apply Configuration

```bash
cd terraform/organization
terraform init
terraform plan
terraform apply

# Confirm SNS subscription email
# Check your email and click the confirmation link
```

---

## What You Get

✅ **Organization-Wide Monitoring**: Automatic monitoring across all member accounts  
✅ **ML-Based Detection**: Learns normal patterns and detects deviations  
✅ **Root Cause Analysis**: Identifies which service/account caused the anomaly  
✅ **Immediate Alerts**: Email/SNS notifications when anomalies detected  
✅ **Historical Analysis**: View past anomalies and trends  
✅ **Zero Cost**: Completely free service  

---

## Validation

```bash
# Verify anomaly monitors are created
aws ce get-anomaly-monitors --profile terraform-admin

# List anomaly subscriptions
aws ce get-anomaly-subscriptions --profile terraform-admin

# Check SNS topic subscription status
aws sns list-subscriptions --profile terraform-admin | grep cost-anomaly
```

Expected outputs:
- Two monitors: OrganizationWideMonitor and PerAccountMonitor
- Two subscriptions with IMMEDIATE frequency
- SNS subscription confirmed

---

## Understanding Anomalies

Cost Anomaly Detection classifies anomalies by:

### Impact Levels
- **Minor**: < $50 unexpected cost
- **Medium**: $50-$200 unexpected cost
- **Major**: > $200 unexpected cost

### Common Anomaly Types

| Anomaly | Likely Cause | Action |
|---------|--------------|--------|
| **EC2 spike** | Forgot to terminate instances | Check EC2 console, terminate unused |
| **Data Transfer spike** | Misconfigured data sync | Review network traffic |
| **RDS spike** | Database instance left running | Stop or downsize database |
| **S3 spike** | Large file uploads | Review S3 buckets and usage |
| **Lambda spike** | Runaway function or infinite loop | Check Lambda logs and metrics |

---

## Anomaly Alert Example

When an anomaly is detected, you'll receive an email with:
- **Total Impact**: $250 unexpected cost
- **Service**: Amazon EC2
- **Account**: Production (123456789012)
- **Root Cause**: m5.2xlarge instance running 24/7 in us-west-2
- **Time Frame**: November 20-24, 2025
- **Link**: Direct link to Cost Explorer for investigation

---

## Integration with Other Tools

Cost Anomaly Detection works alongside:
- **[Per-Account Budgets](/onboarding/basic-security/)**: Budgets set hard limits, anomaly detection catches unusual patterns
- **Cost Explorer**: Drill down into anomaly details
- **EventBridge**: Trigger automated responses (Lambda, Step Functions)
- **PagerDuty/Opsgenie**: Route alerts to on-call team

---

## Best Practices

1. **Set Realistic Thresholds**: $50-100 for small accounts, $200-500 for large accounts
2. **Review Weekly**: Check Cost Anomaly Detection dashboard for trends
3. **Act Quickly**: Investigate anomalies within 24 hours to minimize cost impact
4. **Tune Over Time**: Adjust thresholds based on alert fatigue
5. **Combine with Budgets**: Use budgets for hard limits, anomaly detection for early warnings

---

## Troubleshooting

### Not receiving alerts

```bash
# Check SNS subscription status
aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:us-east-2:ACCOUNT_ID:cost-anomaly-detection-alerts

# Verify email is confirmed (SubscriptionArn should not be "PendingConfirmation")
```

### Too many false positives

```bash
# Increase alert threshold in Terraform
# Change threshold_expression values from "100" to "200" or higher
# Re-apply: terraform apply
```

### Missing anomalies

```bash
# Verify monitors are active
aws ce get-anomaly-monitors

# Check if learning period has completed (needs 7-14 days of data)
```

---

## Enable Cost Explorer (If Not Already Enabled)

Cost Anomaly Detection requires Cost Explorer to be enabled:

```bash
# Enable Cost Explorer via Console (one-time setup)
# 1. Go to: AWS Cost Management → Cost Explorer
# 2. Click "Enable Cost Explorer"
# 3. Wait 24 hours for initial data population
```

Cost Explorer provides:
- Detailed spending analysis
- Forecast future costs
- Drill down by service, account, tag
- **Organization-wide visibility** when enabled in management account

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/optional/security-hub/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Security Hub</a>
  <a href="/onboarding/optional/service-control-policies/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Service Control Policies &rarr;</a>
</div>

---
layout: base.html
title: "Security & Compliance Setup"
permalink: /onboarding/security-setup/
---

1. AWS Config for compliance monitoring
2. Cost budgets and alerts
3. IAM credential management policies

---

## AWS Config

AWS Config continuously monitors and records resource configurations for compliance and security auditing.

### Implementation

Enable AWS Config across all regions to track resources:

```bash
# This is typically done via Terraform, but can be done manually via Console
# Navigate to: AWS Config → Get Started → Enable in all regions
```

### Configuration Rules

Set up managed rules for compliance:

- `iam-user-unused-credentials-check`: Detect inactive IAM users
- `s3-bucket-public-read-prohibited`: Prevent public S3 buckets
- `ec2-security-group-attached-to-eni`: Identify unused security groups
- `required-tags`: Enforce tagging standards
- `encrypted-volumes`: Ensure EBS encryption

### Centralized Logging

- Store Config snapshots in dedicated S3 bucket
- Enable SNS notifications for non-compliant resources
- Set up CloudWatch alarms for configuration drift

**Terraform Config Setup**: [Link to examples/terraform/security/aws-config.tf]

---

## Cost Management & Budget Alerts

Prevent surprise AWS bills with proactive spending monitoring.

### Budget Setup

Create budgets for different thresholds:

```bash
# Create a monthly budget with email alerts
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json \
  --profile terraform-admin
```

**budget.json example:**
```json
{
  "BudgetName": "Monthly-Development-Budget",
  "BudgetLimit": {
    "Amount": "1000",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### Alert Thresholds

Set up multiple alert levels:
- 50% of budget (warning)
- 80% of budget (alert)
- 100% of budget (critical)
- 120% of budget (overage)

### Cost Optimization

- Enable Cost Explorer for detailed spending analysis
- Set up AWS Cost Anomaly Detection
- Tag resources for cost allocation (team, project, environment)
- Review Reserved Instance and Savings Plan opportunities
- Configure S3 lifecycle policies to transition to cheaper storage

### Example Budgets by Environment

- **Development**: $1,000/month with alerts at $500, $800, $1,000
- **Staging**: $2,000/month with alerts at $1,000, $1,600, $2,000
- **Production**: $10,000/month with alerts at $5,000, $8,000, $10,000

**Terraform Budgets Setup**: [Link to examples/terraform/security/budgets.tf]

---

## IAM Access Keys & Credential Management

Eliminate long-lived credentials to reduce security risk.

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

Set up automated credential monitoring:

```bash
# Lambda function to detect old access keys
# Script available at: examples/scripts/aws/audit-unused-keys.sh
```

**Terraform IAM Policies**: [Link to examples/terraform/security/iam-policies.tf]

---

## Validation

Before moving to Step 3, verify:

- ✅ AWS Config enabled in all regions
- ✅ Config rules deployed for key compliance checks
- ✅ Cost budgets created with email notifications
- ✅ Cost Explorer and Anomaly Detection enabled
- ✅ IAM credential audit process established
- ✅ MFA enforced for console users

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
   <a href="/onboarding/terraform-organization/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Terraform Organization</a>
   <a href="/onboarding/infrastructure/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Infrastructure Deployment &rarr;</a>
</div>
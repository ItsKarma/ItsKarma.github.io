---
layout: base.html
title: "Service Control Policies (Optional)"
permalink: /onboarding/optional/service-control-policies/
---

# Service Control Policies (Optional)

**Enforce organization-wide guardrails and governance across all AWS accounts.**

## When to Enable

- ✅ **Multiple Teams**: Different teams managing different AWS accounts
- ✅ **Compliance Requirements**: Need to enforce security policies organization-wide
- ✅ **Risk Mitigation**: Prevent accidental or malicious security disablement
- ✅ **Region Restrictions**: Limit operations to specific AWS regions for compliance
- ✅ **Cost Control**: Prevent expensive resource types from being created
- ✅ **Production Environments**: Recommended once moving beyond development

## When to Skip

- ⏭️ **Single Developer**: Solo projects without compliance needs
- ⏭️ **Early Prototyping**: Can restrict experimentation and learning
- ⏭️ **Full Trust**: Small team with complete trust in all members

---

## What are Service Control Policies (SCPs)?

SCPs are organization-level policies that set maximum permissions for all IAM users and roles in member accounts:
- **Guardrails**: Prevent certain actions even if IAM policies allow them
- **Organization-Wide**: Apply automatically to all member accounts
- **Management Account Exempt**: SCPs never apply to the management account itself
- **Inheritance**: Policies attached to OUs apply to all accounts within

**Key Concept**: SCPs don't grant permissions - they limit what IAM policies can grant.

---

## Cost Estimate

**FREE** ✅  
No charge for Service Control Policies.

---

## Implementation

**Account Scope**: Create and attach in the **management account** - automatically applies to all member accounts.

### Terraform Configuration

Create `terraform/organization/service-control-policies.tf`:

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
    key            = "management/scps/terraform.tfstate"
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

data "aws_organizations_organization" "main" {}

# SCP 1: Prevent disabling security services
resource "aws_organizations_policy" "prevent_security_disablement" {
  name        = "PreventSecurityDisablement"
  description = "Prevent disabling CloudTrail, GuardDuty, Config, and Security Hub"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PreventSecurityDisablement"
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

# SCP 2: Restrict to approved AWS regions
resource "aws_organizations_policy" "restrict_regions" {
  name        = "RestrictRegions"
  description = "Only allow operations in us-east-2 and us-west-2"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "RestrictRegions"
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
          # Exempt global services (IAM, CloudFront, Route53)
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

# SCP 3: Require MFA for sensitive actions
resource "aws_organizations_policy" "require_mfa" {
  name        = "RequireMFA"
  description = "Require MFA for destructive operations"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RequireMFAForDestructiveActions"
        Effect = "Deny"
        Action = [
          "ec2:StopInstances",
          "ec2:TerminateInstances",
          "rds:DeleteDBInstance",
          "rds:DeleteDBCluster",
          "s3:DeleteBucket",
          "dynamodb:DeleteTable",
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

# Optional SCP 4: Prevent expensive EC2 instance types
resource "aws_organizations_policy" "restrict_instance_types" {
  name        = "RestrictInstanceTypes"
  description = "Prevent creation of expensive EC2 instance types"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PreventExpensiveInstances"
        Effect = "Deny"
        Action = [
          "ec2:RunInstances"
        ]
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringLike = {
            "ec2:InstanceType" = [
              "*.32xlarge",
              "*.24xlarge",
              "*.16xlarge",
              "*.12xlarge",
              "p*.*",      # GPU instances
              "g*.*",      # Graphics instances
              "inf*.*",    # Inferentia instances
              "trn*.*"     # Trainium instances
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name        = "Restrict Instance Types"
    Environment = "Management"
    ManagedBy   = "Terraform"
  }
}

# Attach SCPs to organization root (applies to all member accounts)
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

# Optional: Uncomment to attach instance type restrictions
# resource "aws_organizations_policy_attachment" "restrict_instances_root" {
#   policy_id = aws_organizations_policy.restrict_instance_types.id
#   target_id = data.aws_organizations_organization.main.roots[0].id
# }
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

✅ **Security Services Protection**: Prevents disabling CloudTrail, GuardDuty, Config, Security Hub  
✅ **Region Restrictions**: Limits operations to approved AWS regions  
✅ **MFA for Destructive Actions**: Requires MFA to delete/terminate critical resources  
✅ **Cost Control** (optional): Prevents creation of expensive instance types  
✅ **Organization-Wide Enforcement**: Applies automatically to all member accounts  
✅ **Management Account Exempt**: Doesn't restrict management account operations  

---

## Validation

```bash
# List all SCPs
aws organizations list-policies --filter SERVICE_CONTROL_POLICY --profile terraform-admin

# View specific SCP details
aws organizations describe-policy --policy-id p-xxxxxxxxxx --profile terraform-admin

# List policy attachments to organization root
ROOT_ID=$(aws organizations list-roots --query 'Roots[0].Id' --output text --profile terraform-admin)
aws organizations list-policies-for-target --target-id $ROOT_ID --filter SERVICE_CONTROL_POLICY --profile terraform-admin

# Test in a member account (should be denied)
aws ec2 run-instances --image-id ami-xxxxx --instance-type p3.16xlarge  # Should fail
```

Expected outputs:
- Three SCPs listed (PreventSecurityDisablement, RestrictRegions, RequireMFA)
- All three policies attached to organization root
- Operations violating SCPs are denied in member accounts

---

## Common SCP Patterns

### 1. Prevent Root User Usage

```hcl
resource "aws_organizations_policy" "deny_root_account_usage" {
  name        = "DenyRootAccountUsage"
  description = "Prevent root account usage except in management account"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringLike = {
            "aws:PrincipalArn" = "arn:aws:iam::*:root"
          }
        }
      }
    ]
  })
}
```

### 2. Require Resource Tagging

```hcl
resource "aws_organizations_policy" "require_tags" {
  name        = "RequireTags"
  description = "Require specific tags on resources"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = [
          "ec2:RunInstances",
          "rds:CreateDBInstance",
          "s3:CreateBucket"
        ]
        Resource = "*"
        Condition = {
          "Null" = {
            "aws:RequestTag/Environment" = "true"
            "aws:RequestTag/Owner"       = "true"
          }
        }
      }
    ]
  })
}
```

### 3. Prevent Public S3 Buckets

```hcl
resource "aws_organizations_policy" "deny_public_s3" {
  name        = "DenyPublicS3"
  description = "Prevent creation of public S3 buckets"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = [
          "s3:PutBucketPublicAccessBlock"
        ]
        Resource = "*"
        Condition = {
          Bool = {
            "s3:BlockPublicAcls"       = "false"
            "s3:BlockPublicPolicy"     = "false"
            "s3:IgnorePublicAcls"      = "false"
            "s3:RestrictPublicBuckets" = "false"
          }
        }
      }
    ]
  })
}
```

---

## Testing SCPs

Before applying SCPs organization-wide, test in a non-production OU:

1. **Create Test OU**: Create an OU for testing
2. **Move Test Account**: Move one member account into test OU
3. **Attach SCP**: Attach SCP to test OU only
4. **Validate**: Test that denied actions are blocked
5. **Roll Out**: Attach to organization root once validated

---

## Troubleshooting

### SCP not taking effect

```bash
# Verify SCP is attached
aws organizations list-targets-for-policy --policy-id p-xxxxxxxxxx

# Check if account is in the right OU
aws organizations list-parents --child-id 123456789012

# Remember: Management account is exempt from SCPs
```

### Legitimate actions blocked

```bash
# Review SCP content
aws organizations describe-policy --policy-id p-xxxxxxxxxx

# Update SCP to allow specific actions or principals
# Add exceptions using Condition blocks
```

### Can't delete SCP

```bash
# First detach from all targets
aws organizations detach-policy --policy-id p-xxxxxxxxxx --target-id r-xxxx

# Then delete
aws organizations delete-policy --policy-id p-xxxxxxxxxx
```

---

## Best Practices

1. **Start Small**: Begin with one or two SCPs, add more as needed
2. **Test First**: Always test in a non-production OU before organization-wide
3. **Document Exceptions**: Clearly document why specific actions are denied
4. **Review Quarterly**: Reassess SCPs as your organization evolves
5. **Use Deny by Default**: SCPs should deny specific actions, not try to allow everything
6. **Monitor Denied Requests**: Use CloudTrail to see what's being blocked

---

## SCP vs IAM Policies

| Aspect | SCP | IAM Policy |
|--------|-----|------------|
| **Scope** | Organization/OU/Account | User/Role/Group |
| **Effect** | Sets maximum permissions | Grants permissions |
| **Managed By** | Management account | Individual accounts |
| **Applies To** | Member accounts only | Specific identities |
| **Purpose** | Guardrails and governance | Access control |

**Remember**: Even if IAM policy allows an action, SCP can deny it!

---

## Compliance Mapping

| Requirement | SCP Solution |
|-------------|--------------|
| **SOC2**: Prevent security service disablement | ✅ PreventSecurityDisablement SCP |
| **PCI-DSS**: Restrict to compliant regions | ✅ RestrictRegions SCP |
| **ISO 27001**: MFA for sensitive operations | ✅ RequireMFA SCP |
| **GDPR**: Data residency requirements | ✅ RestrictRegions SCP |

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/optional/cost-anomaly-detection/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; Cost Anomaly Detection</a>
  <a href="/onboarding/basic-security/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Back to Basic Security &rarr;</a>
</div>

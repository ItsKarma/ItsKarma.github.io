---
layout: base.html
title: "AWS Account Setup"
permalink: /onboarding/aws-account-setup/
---

# AWS Account Setup

This is the foundational step where you secure your AWS account and prepare it for infrastructure deployment.

**Time to Complete:** 2-4 hours  
**Prerequisites:** New or existing AWS account with root access

## Overview

Before building any infrastructure, we need to:
1. Secure the root account
2. Set up AWS Organizations for multi-account management
3. Create an IAM admin user for Terraform
4. Set up remote state storage for Terraform

---

## Root Account Security

**Do this FIRST** - before creating the organization or any other resources.

The AWS root account has unrestricted access and should be locked down immediately:

### Steps

1. **Enable MFA**: Add multi-factor authentication to root account using hardware token or authenticator app
2. **Remove Access Keys**: Delete any root account access keys - root should never use programmatic access
3. **Create Strong Password**: Use a long, randomly generated password stored in password manager
4. **Secure Email**: Ensure root account email has MFA and is monitored
5. **Document Recovery**: Store root credentials and MFA recovery codes in secure location (e.g., vault)

### Why it matters

Root account compromise can lead to complete account takeover, data loss, and unlimited spending.

**Complete these steps before proceeding to create your AWS Organization.**

---

## AWS Organizations & Multi-Account Strategy

We'll use AWS Organizations to create a multi-account structure with proper security boundaries and cost isolation. This is the **only recommended approach** - running everything in a single account creates blast radius and security issues.

### Account Structure

We'll create 5 accounts in addition to the management account:

- **Management Account**: Root organization account for billing and organization-wide policies (no workloads run here)
- **Development Account**: Development and testing environments
- **Staging Account**: Pre-production environment for final testing
- **Production Account**: All production infrastructure and applications
- **Security Account**: Centralized logging, GuardDuty, Security Hub, audit logs
- **Shared Services Account**: CI/CD pipelines, container registry (ECR), shared DNS, VPN

### Why Multi-Account is Required

- **Blast Radius Isolation**: A compromised dev account can't access production data
- **Cost Allocation**: Clear visibility into spending per environment
- **Security Boundaries**: Different security policies and access controls per environment
- **Regulatory Compliance**: Easier to demonstrate separation for audits
- **Consolidated Billing**: Single bill with volume discounts across all accounts

---

### Step 1: Create AWS Organization

**Note:** Make sure you've completed the Root Account Security steps above before proceeding.

Start from your existing AWS account (it will become the Management account):

```bash
# Create the organization
aws organizations create-organization --feature-set ALL

# Verify organization was created
aws organizations describe-organization
```

**Important**: Save the Organization ID from the output - you'll need it later.

Alternatively, use the AWS Console:
1. Sign in to AWS Console as root user
2. Navigate to AWS Organizations
3. Click "Create an organization"
4. Choose "Enable all features"

---

### Step 2: Create Member Accounts

Create each account using the AWS CLI. Each account needs a unique email address:

```bash
# Create Development Account
aws organizations create-account \
  --email aws+dev@yourcompany.com \
  --account-name "Development" \
  --role-name OrganizationAccountAccessRole

# Create Staging Account
aws organizations create-account \
  --email aws+staging@yourcompany.com \
  --account-name "Staging" \
  --role-name OrganizationAccountAccessRole

# Create Production Account
aws organizations create-account \
  --email aws+prod@yourcompany.com \
  --account-name "Production" \
  --role-name OrganizationAccountAccessRole

# Create Security Account
aws organizations create-account \
  --email aws+security@yourcompany.com \
  --account-name "Security" \
  --role-name OrganizationAccountAccessRole

# Create Shared Services Account
aws organizations create-account \
  --email aws+sharedservices@yourcompany.com \
  --account-name "Shared-Services" \
  --role-name OrganizationAccountAccessRole
```

**Email Setup Tip:**
Most email providers support plus addressing (e.g., `aws+dev@yourcompany.com`), which allows all emails to go to the same inbox (`aws@yourcompany.com`) while AWS treats each as a unique address. This is perfect for managing multiple AWS accounts without creating separate email accounts.

**Important**: Save the Account IDs returned for each account creation. You can also list them:

```bash
# List all accounts in the organization
aws organizations list-accounts --query 'Accounts[*].[Name,Id,Email]' --output table
```

---

### Step 3: Create Organizational Units (Optional)

Organize accounts into logical groups:

```bash
# Create Production OU
aws organizations create-organizational-unit \
  --parent-id r-xxxx \
  --name "Production"

# Create Non-Production OU
aws organizations create-organizational-unit \
  --parent-id r-xxxx \
  --name "Non-Production"

# Create Infrastructure OU
aws organizations create-organizational-unit \
  --parent-id r-xxxx \
  --name "Infrastructure"

# Move accounts to OUs
# Get the OU IDs from the create commands above, then:
aws organizations move-account \
  --account-id 111111111111 \
  --source-parent-id r-xxxx \
  --destination-parent-id ou-xxxx-xxxxxxxx
```

**Organizational Structure:**
```
Root
├── Production/
│   └── Production Account
├── Non-Production/
│   ├── Development Account
│   └── Staging Account
└── Infrastructure/
    ├── Security Account
    └── Shared Services Account
```

---

### Step 4: Enable AWS IAM Identity Center (AWS SSO)

Set up centralized user access across all accounts:

```bash
# Enable IAM Identity Center (must be done via Console)
# 1. Go to IAM Identity Center in AWS Console
# 2. Click "Enable"
# 3. Choose "Enable with AWS Organizations"
```

**Create Permission Sets:**

Via AWS Console:
1. Go to IAM Identity Center → Permission sets
2. Create the following permission sets:

**Administrator Access:**
- Use predefined `AdministratorAccess` policy
- Session duration: 4 hours
- Require MFA

**Developer Access:**
- Use predefined `PowerUserAccess` policy
- Session duration: 8 hours
- Require MFA

**ReadOnly Access:**
- Use predefined `ViewOnlyAccess` policy
- Session duration: 12 hours

**Assign Users to Accounts:**
1. Go to IAM Identity Center → AWS accounts
2. Select an account
3. Assign users or groups
4. Select permission set

**Example Assignment:**
- **Management Account**: Only administrators with ReadOnly
- **Development Account**: Developers and administrators with full access
- **Staging Account**: Developers with ReadOnly, administrators with full access
- **Production Account**: Everyone with ReadOnly, administrators can elevate if needed
- **Security Account**: Security team with full access, administrators with ReadOnly
- **Shared Services Account**: DevOps team with full access

---

### Step 7: Set Up Cross-Account Access

The `OrganizationAccountAccessRole` was automatically created when you created each account. This role allows administrators in the Management account to assume roles in member accounts.

**Assume Role to Access Member Account:**

```bash
# Get credentials for a member account
aws sts assume-role \
  --role-arn arn:aws:iam::111111111111:role/OrganizationAccountAccessRole \
  --role-session-name admin-session

# Or configure AWS CLI profile - ~/.aws/confi
[profile dev-admin]
role_arn = arn:aws:iam::111111111111:role/OrganizationAccountAccessRole
source_profile = default
region = us-east-2

[profile prod-admin]
role_arn = arn:aws:iam::222222222222:role/OrganizationAccountAccessRole
source_profile = default
region = us-east-2

# Use the profile
aws sts get-caller-identity --profile dev-admin
```

---

**What We Accomplished:**

✅ **AWS Organization created** with all features enabled  
✅ **5 member accounts created**: Dev, Staging, Prod, Security, Shared Services  
✅ **IAM Identity Center (SSO) enabled** for centralized access management  
✅ **Cross-account access** configured with OrganizationAccountAccessRole  

---

## Step 5: Create IAM Admin User

Create an IAM user with admin access for Terraform execution:

```bash
# Create the user
aws iam create-user --user-name terraform-admin

# Attach admin policy
aws iam attach-user-policy \
  --user-name terraform-admin \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create access keys
aws iam create-access-key --user-name terraform-admin
```

**Important**: 
- Save the access key ID and secret access key securely
- Consider using a more restrictive policy than `AdministratorAccess` based on your needs
- Enable MFA for this user if they need console access
- Rotate these credentials regularly (every 90 days)

### Configure AWS CLI

```bash
# Configure AWS CLI with the new credentials
aws configure --profile terraform-admin

# Test access
aws sts get-caller-identity --profile terraform-admin
```

---

## What We Accomplished

After completing Step 1, you have:

✅ **Root account secured** with MFA and no access keys  
✅ **AWS Organization created** with all features enabled  
✅ **5 member accounts**: Development, Staging, Production, Security, and Shared Services  
✅ **Organizational Units** (optional) for logical grouping  
✅ **IAM Identity Center (AWS SSO)** enabled for centralized access  
✅ **Cross-account access** configured via OrganizationAccountAccessRole  
✅ **IAM admin user** created for Terraform  

---

## Validation Checklist

Before moving to Step 1B, verify:

```bash
# Verify Organization exists
aws organizations describe-organization

# List all member accounts
aws organizations list-accounts

# Verify root account MFA (must be done via Console)
# Go to IAM → My Security Credentials → Check MFA devices

# Test IAM admin user
aws sts get-caller-identity --profile terraform-admin
```

Expected outputs:
- Organization ID starts with `o-`
- 6 accounts total (management + 5 members)
- Root account has MFA device assigned
- IAM user identity shows `terraform-admin`

---

## Next Steps

[Continue to Step 1B: Terraform Organization Setup →](/onboarding/step-1b-terraform-organization/)

In Step 1B, you'll:
- Create the Terraform state infrastructure (S3 bucket and DynamoDB table)
- Import the state infrastructure into Terraform management
- Enable organization-wide security features (CloudTrail, GuardDuty, Security Hub, Config)
- Apply Service Control Policies (SCPs) for governance

---

## Additional Resources

- [AWS Organizations Best Practices](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [AWS Multi-Account Strategy](https://aws.amazon.com/organizations/getting-started/best-practices/)
- [IAM Identity Center Getting Started](https://docs.aws.amazon.com/singlesignon/latest/userguide/getting-started.html)
- [Terraform Backend Configuration](https://www.terraform.io/docs/language/settings/backends/s3.html)

---
layout: base.html
title: "AWS Organizations"
permalink: /onboarding/aws-account-setup/aws-organizations/
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

### 1. Create AWS Organization

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

### 2. Create Member Accounts

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

### Step 3: Create Organizational Units

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

**What We Accomplished:**

✅ **AWS Organization created** with all features enabled  
✅ **5 member accounts created**: Dev, Staging, Prod, Security, Shared Services  
✅ **Organizational Units Created** and accounts organized into OUs

---

## Additional Resources

- [AWS Organizations Best Practices](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [AWS Multi-Account Strategy](https://aws.amazon.com/organizations/getting-started/best-practices/)

---

<div style="display: flex; justify-content: flex-end; margin-top: 32px;">
  <a href="/onboarding/terraform-organization/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Terraform Organization &rarr;</a>
</div>

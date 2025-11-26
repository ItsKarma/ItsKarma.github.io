---
layout: base.html
title: "AWS SSO"
permalink: /onboarding/aws-account-setup/aws-sso/
---

## Enable AWS IAM Identity Center (AWS SSO)

Set up centralized user access across all accounts:

Enable IAM Identity Center (must be done via Console):
1. Go to [IAM Identity Center](https://us-east-2.console.aws.amazon.com/singlesignon/home?region=us-east-2#/) in AWS Console
2. Click "Enable"
3. Choose "Enable with AWS Organizations"

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

## Set Up Cross-Account Access

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

**What We Accomplished:**

✅ **IAM Identity Center (SSO) enabled** for centralized access management  
✅ **Cross-account access** configured with OrganizationAccountAccessRole

## Additional Resources

- [AWS SSO Identity Center](https://docs.aws.amazon.com/res/latest/ug/sso-idc.html)

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; AWS Account Setup</a>
  <a href="/onboarding/aws-account-setup/aws-organizations" style="text-decoration: none; color: #4ade80; font-weight: 500;">AWS Organizations &rarr;</a>
</div>

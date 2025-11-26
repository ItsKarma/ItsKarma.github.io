---
layout: base.html
title: "AWS Account Setup Recap"
permalink: /onboarding/aws-account-setup/recap/
---

# AWS Account Setup Recap

## What We Accomplished

After completing this section, you will have:

✅ **Root account secured** with MFA and no access keys  
✅ **AWS Organization created** with all features enabled  
✅ **5 member accounts**: Development, Staging, Production, Security, and Shared Services  
✅ **Organizational Units** for logical grouping  
✅ **IAM Identity Center (AWS SSO)** enabled for centralized access  
✅ **Cross-account access** configured via OrganizationAccountAccessRole  
✅ **IAM admin user** created for Terraform  

---

## Validation Checklist

Before moving on to the next step, verify:

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

## Additional Resources

- [IAM Identity Center Getting Started](https://docs.aws.amazon.com/singlesignon/latest/userguide/getting-started.html)
- [Terraform Backend Configuration](https://www.terraform.io/docs/language/settings/backends/s3.html)

---

<div style="display: flex; justify-content: flex-end; margin-top: 32px;">
  <a href="/onboarding/terraform-organization/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Terraform Organization &rarr;</a>
</div>

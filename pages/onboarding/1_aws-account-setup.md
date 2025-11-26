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

1. [Secure the root account](/onboarding/aws-account-setup/aws-root-account-security)
2. [Set up AWS Organizations](/onboarding/aws-account-setup/aws-organizations) for multi-account management.
3. [Enable AWS SSO](/onboarding/aws-account-setup/aws-sso) - Even if you don't have an SSO provider, you can manage IAM users in the management account for all of your other accounts.
4. Create the [GitHub OIDC Provider](/onboarding/aws-account-setup/aws-github-oidc-connector) in the management account.
5. Use [AWS StackSets](/onboarding/aws-account-setup/aws-stacksets-github-role) to create the roles in the member accounts for GitHub to assume.

---

## What We Will Accomplish

After completing this section, you will have:

✅ **Root account secured** with MFA and no access keys  
✅ **AWS Organization created** with all features enabled  
✅ **5 member accounts**: Development, Staging, Production, Security, and Shared Services  
✅ **Organizational Units** for logical grouping  
✅ **IAM Identity Center (AWS SSO)** enabled for centralized access  
✅ **Cross-account access** configured via OrganizationAccountAccessRole  
✅ **IAM admin user** created for Terraform  

---

<div style="display: flex; justify-content: flex-end; margin-top: 32px;">
  <a href="/onboarding/terraform-organization/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Terraform Organization &rarr;</a>
</div>

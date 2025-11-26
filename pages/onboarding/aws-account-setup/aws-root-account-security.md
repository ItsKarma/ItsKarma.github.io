---
layout: base.html
title: "AWS Root Account Security"
permalink: /onboarding/aws-account-setup/aws-root-account-security/
---

## AWS Root Account Security

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

## Additional Resources

- [AWS Root User Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html)

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; AWS Account Setup</a>
  <a href="/onboarding/aws-account-setup/aws-organizations" style="text-decoration: none; color: #4ade80; font-weight: 500;">AWS Organizations &rarr;</a>
</div>


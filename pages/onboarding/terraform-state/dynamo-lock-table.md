---
layout: base.html
title: "Terraform State Dynamo Lock Table"
permalink: /onboarding/terraform-state/dynamo-lock-table/
---

## Create DynamoDB Table for Locking

```bash
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-2 \
  --profile terraform-admin
```

---

## Verify State Infrastructure

```bash
# Verify DynamoDB table exists
aws dynamodb describe-table --table-name terraform-state-lock --profile terraform-admin
```

Expected outputs:
- DynamoDB table status is `ACTIVE`

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; AWS Account Setup</a>
  <a href="/onboarding/basic-security/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Basic Security Setup &rarr;</a>
</div>

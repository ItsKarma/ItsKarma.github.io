---
layout: base.html
title: "GitHub Actions Workflow"
permalink: /onboarding/aws-account-setup/github-actions-workflow/
---

## GitHub Actions Workflow

Now that we have the OIDC Connector set up, and the roles created. We'll set up the GitHub Actions workflow to utilize that and apply the remainder of our terraform state.

We will cover the GitHub Workflow in this document. The Terraform we will be applying is covered in the next section.

---

Add a workflow like `.github/workflows/terraform.yml` to your repo:

```yaml
name: terraform

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

permissions:
  id-token: write   # needed for OIDC
  contents: read

env:
  AWS_REGION: us-east-2
  # Map env->account id (example)
  DEV_ACCOUNT_ID: "111111111111"
  STAGING_ACCOUNT_ID: "222222222222"
  PROD_ACCOUNT_ID: "333333333333"

jobs:
  plan:
    name: plan (PR)
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        env: [ dev ]  # add staging/prod if you plan on PR for those
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS creds (member account)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ env.DEV_ACCOUNT_ID }}:role/GithubActionsTerraformExecution
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.5

      - name: Terraform Init
        working-directory: ./terraform/dev
        run: terraform init -input=false

      - name: Terraform Plan
        working-directory: ./terraform/dev
        run: terraform plan -input=false -no-color

  apply:
    name: apply (main)
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - env: dev
            account_id: ${{ env.DEV_ACCOUNT_ID }}
            dir: ./terraform/dev
          # - env: staging
          #   account_id: ${{ env.STAGING_ACCOUNT_ID }}
          #   dir: ./terraform/staging
          # - env: prod
          #   account_id: ${{ env.PROD_ACCOUNT_ID }}
          #   dir: ./terraform/prod
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS creds (member account)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ matrix.account_id }}:role/GithubActionsTerraformExecution
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.5

      - name: Terraform Init
        working-directory: ${{ matrix.dir }}
        run: terraform init -input=false

      - name: Terraform Apply
        working-directory: ${{ matrix.dir }}
        run: terraform apply -input=false -auto-approve
```

Notes:
- Ensure your backend `key` paths are unique per env/account.
- Roles need `s3` + `dynamodb` permissions for the state backend used in that env.

---

## Validation

- Add a quick step in Actions to print caller identity:

```yaml
- name: Who am I?
  run: aws sts get-caller-identity
```

- In AWS Console → IAM → Roles, check Access Advisor for usage.
- Attempt a workflow from a non‑allowed branch; it should be denied.

---

## Troubleshooting

- OIDC error: Verify trust policy `aud=sts.amazonaws.com` and `sub` matches your repo/branch.
- Access denied to backend: Add S3/Dynamo permissions to the role used by that env.
- Thumbprint mismatch: Use the `tls_certificate` data source as shown to derive the fingerprint.

---

## What We Accomplished

- CI can assume AWS roles securely with no long‑lived keys
- Centralized auth, short‑lived creds, clear audit trail
- Ready to run Terraform plans/applies from GitHub Actions per account

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; AWS Account Setup</a>
  <a href="/onboarding/terraform-state/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Terraform State Setup &rarr;</a>
</div>

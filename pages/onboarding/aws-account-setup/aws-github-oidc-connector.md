---
layout: base.html
title: "AWS GitHub OIDC Connector"
permalink: /onboarding/aws-account-setup/aws-github-oidc-connector/
---

## AWS GitHub OIDC Connector

Set up GitHub Actions to assume short‑lived AWS roles via OpenID Connect (OIDC), so your CI can run Terraform without long‑lived AWS keys.

---

## Cost

- **AWS OIDC provider**: Free
- **AWS STS (AssumeRoleWithWebIdentity)**: Free
- **GitHub Actions**: Minutes/billing as per your plan
- **S3 state bucket**: ~$0.023/GB per month + minimal request costs
- **AWS usage**: Normal service costs for whatever Terraform creates

---

## Prerequisites

- A GitHub repository that will run Terraform (e.g., `ItsKarma/infrastructure`)
- AWS management account access to create the OIDC provider and org/account roles.
- AWS CLI configured - Optionally you can do this through the AWS Console.

---

## Architecture

- GitHub Actions requests an OIDC token from `token.actions.githubusercontent.com`.
- AWS IAM OIDC provider validates token; an IAM role trust policy checks claims (repo, branch, environment).
- AWS issues temporary credentials; workflow runs Terraform with least privilege.
- Terraform state stored in S3 with native state locking (no DynamoDB needed).

---

## Step 1: Enable StackSets Trusted Access

One-time setup to allow StackSets to deploy across your organization:

```bash
aws organizations enable-aws-service-access \
  --service-principal member.org.stacksets.cloudformation.amazonaws.com
```

Verify it was enabled:
```bash
aws organizations list-aws-service-access-for-organization | grep stacksets
```

Expected output: `member.org.stacksets.cloudformation.amazonaws.com`

> **Why not in CloudFormation?** AWS [recommends enabling service access](https://docs.aws.amazon.com/organizations/latest/APIReference/API_EnableAWSServiceAccess.html) through the service's own console or CLI commands rather than directly through the Organizations API. This ensures the service (CloudFormation StackSets in this case) can properly create required resources. This is a one-time operation that only needs to be run once per organization.

---

## Step 2: Create Foundation Resources (Management Account)

Use CloudFormation to create the OIDC provider, GitHub Actions role, and Terraform state bucket in the management account.

Create `management-account-foundation.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: GitHub OIDC provider, IAM role, and Terraform state bucket for management account

Parameters:
  GitHubOrg:
    Type: String
    Description: GitHub organization or username
    Default: ItsKarma
  
  GitHubRepo:
    Type: String
    Description: GitHub repository name (without org prefix)
    Default: infrastructure
  
  StateBucketName:
    Type: String
    Description: S3 bucket name for Terraform state (must be globally unique)
    Default: itskarma-management-terraform-state

Resources:
  # GitHub OIDC Provider
  GitHubOIDCProvider:
    Type: AWS::IAM::OIDCProvider
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList:
        - sts.amazonaws.com
      ThumbprintList:
        # GitHub's OIDC thumbprint (valid long-term, rarely changes)
        - 6938fd4d98bab03faadb97b34396831e3780aea1

  # S3 Bucket for Terraform State
  TerraformStateBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref StateBucketName
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldVersions
            Status: Enabled
            NoncurrentVersionExpirationInDays: 90
      Tags:
        - Key: Name
          Value: Terraform State Bucket
        - Key: ManagedBy
          Value: CloudFormation

  # Bucket policy to enforce encryption and security
  TerraformStateBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref TerraformStateBucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: DenyUnencryptedObjectUploads
            Effect: Deny
            Principal: '*'
            Action: s3:PutObject
            Resource: !Sub '${TerraformStateBucket.Arn}/*'
            Condition:
              StringNotEquals:
                s3:x-amz-server-side-encryption: AES256
          - Sid: DenyInsecureTransport
            Effect: Deny
            Principal: '*'
            Action: s3:*
            Resource:
              - !GetAtt TerraformStateBucket.Arn
              - !Sub '${TerraformStateBucket.Arn}/*'
            Condition:
              Bool:
                aws:SecureTransport: false

  # GitHub Actions Role for Management Account
  GithubActionsOrgRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: GithubActionsOrgRole
      Description: GitHub Actions role for organization-level Terraform
      MaxSessionDuration: 3600
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Federated: !Ref GitHubOIDCProvider
            Action: sts:AssumeRoleWithWebIdentity
            Condition:
              StringEquals:
                token.actions.githubusercontent.com:aud: sts.amazonaws.com
              StringLike:
                token.actions.githubusercontent.com:sub:
                  - !Sub 'repo:${GitHubOrg}/${GitHubRepo}:ref:refs/heads/main'
                  - !Sub 'repo:${GitHubOrg}/${GitHubRepo}:pull_request'
      ManagedPolicyArns:
        - !Ref GithubActionsOrgPolicy
      Tags:
        - Key: ManagedBy
          Value: CloudFormation

  # Policy for GitHub Actions Role
  GithubActionsOrgPolicy:
    Type: AWS::IAM::ManagedPolicy
    Properties:
      ManagedPolicyName: GithubActionsOrgAdminMin
      Description: Permissions for org-level Terraform and state backend access
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: Organizations
            Effect: Allow
            Action:
              - organizations:Describe*
              - organizations:List*
              - organizations:EnablePolicyType
              - organizations:AttachPolicy
              - organizations:DetachPolicy
              - organizations:CreatePolicy
              - organizations:UpdatePolicy
              - organizations:DeletePolicy
              - organizations:RegisterDelegatedAdministrator
              - organizations:DeregisterDelegatedAdministrator
            Resource: '*'
          
          - Sid: StateBackend
            Effect: Allow
            Action:
              - s3:GetObject
              - s3:PutObject
              - s3:ListBucket
              - s3:DeleteObject
            Resource:
              - !GetAtt TerraformStateBucket.Arn
              - !Sub '${TerraformStateBucket.Arn}/*'
          
          - Sid: AssumeMemberAccountRoles
            Effect: Allow
            Action: sts:AssumeRole
            Resource: arn:aws:iam::*:role/GithubActionsTerraformExecution
          
          - Sid: CloudFormationStackSets
            Effect: Allow
            Action: cloudformation:*
            Resource: '*'

Outputs:
  OIDCProviderArn:
    Description: ARN of the GitHub OIDC provider
    Value: !Ref GitHubOIDCProvider
    Export:
      Name: GitHubOIDCProviderArn
  
  GithubActionsRoleArn:
    Description: ARN of the GitHub Actions role
    Value: !GetAtt GithubActionsOrgRole.Arn
    Export:
      Name: GithubActionsOrgRoleArn
  
  StateBucketName:
    Description: Name of the Terraform state bucket
    Value: !Ref TerraformStateBucket
    Export:
      Name: TerraformStateBucketName
```

### Deploy the Stack

```bash
# Replace with your values
ACCOUNT_NAME=itskarma
ENVIRONMENT=management
aws cloudformation create-stack \
  --stack-name github-oidc-foundation \
  --template-body file://management-account-foundation.yaml \
  --parameters \
      ParameterKey=GitHubOrg,ParameterValue=ItsKarma \
      ParameterKey=GitHubRepo,ParameterValue=infrastructure \
      ParameterKey=StateBucketName,ParameterValue=$ACCOUNT_NAME-$ENVIRONMENT-terraform-state \
  --capabilities CAPABILITY_NAMED_IAM
```

Wait for stack creation to complete:
```bash
aws cloudformation wait stack-create-complete \
  --stack-name github-oidc-foundation

# View outputs
aws cloudformation describe-stacks \
  --stack-name github-oidc-foundation \
  --query 'Stacks[0].Outputs'
```

> **Note:** The OIDC thumbprint (`6938fd4d98bab03faadb97b34396831e3780aea1`) is for GitHub's root CA certificate and is valid long-term. Root CAs are valid for 10-20+ years. When GitHub rotates their TLS certificate, it's signed by the same root CA, so this thumbprint remains valid.

---

## Security Hardening

- **Branch Protection**: Trust policy restricts to `main` branch and pull requests. For production, add GitHub Environment restrictions:
  ```yaml
  StringEquals:
    token.actions.githubusercontent.com:environment: production
  ```
- **Session Duration**: Set to 1 hour; reduce for production environments.
- **Least Privilege**: Scope IAM policies to only required services and actions.
- **State Encryption**: S3 buckets enforce AES256 encryption at rest.
- **Transport Security**: Bucket policies deny unencrypted connections.

---

## Troubleshooting

- **OIDC authentication failed**: Verify trust policy `aud=sts.amazonaws.com` and `sub` matches your repo/branch pattern.
- **Access denied to state bucket**: Check IAM role has S3 permissions for the bucket.
- **Thumbprint mismatch**: The hardcoded thumbprint is GitHub's root CA and should work. If not, you can fetch it:
  ```bash
  echo | openssl s_client -servername token.actions.githubusercontent.com \
    -connect token.actions.githubusercontent.com:443 2>/dev/null | \
    openssl x509 -fingerprint -sha1 -noout | cut -d'=' -f2 | tr -d ':'
  ```

---

## What We Accomplished

✅ GitHub Actions can authenticate to AWS without long-lived keys  
✅ Terraform state stored securely in S3 with versioning and encryption  
✅ Native S3 state locking (no DynamoDB required)  
✅ Foundation for multi-account Terraform deployments  
✅ Centralized OIDC management with distributed execution  

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; AWS Account Setup</a>
  <a href="/onboarding/aws-account-setup/aws-stacksets-github-role/" style="text-decoration: none; color: #4ade80; font-weight: 500;">StackSets: Deploy GitHub OIDC Role &rarr;</a>
</div>

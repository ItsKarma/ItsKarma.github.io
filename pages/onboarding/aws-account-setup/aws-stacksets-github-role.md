---
layout: base.html
title: "StackSets: Deploy GitHub OIDC Role"
permalink: /onboarding/aws-account-setup/aws-stacksets-github-role/
---

# CloudFormation StackSets: Deploy GitHub OIDC Role

Use AWS CloudFormation StackSets to deploy the `GithubActionsTerraformExecution` role to all member accounts in a single operation.

---

## Why StackSets?

- ✅ **One command**: Deploy the role to multiple accounts at once instead of running Terraform 5 times
- ✅ **Automatic**: New member accounts automatically get the role
- ✅ **Consistent**: Same role name, trust policy, and permissions across all accounts
- ✅ **Updates**: Change once, update everywhere
- ✅ **AWS-native**: No Terraform state import juggling to manage for this cross-account IAM setup

---

## Prerequisites

- AWS Organizations enabled with member accounts created
- OIDC provider created in management account ([AWS GitHub OIDC Connector](/onboarding/aws-account-setup/aws-github-oidc-connector/))
- AWS CLI configured with management account credentials
- Your GitHub repository name (e.g., `<GH-Org>/infrastructure`)

---

## Step 1: Create the CloudFormation Template

Create `github-oidc-role-stackset.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: GitHub Actions OIDC Terraform execution role and state bucket for member accounts

Parameters:
  ManagementAccountId:
    Type: String
    Description: Management account ID where OIDC provider lives
  
  GitHubOrg:
    Type: String
    Description: GitHub organization or username
    Default: ItsKarma
  
  GitHubRepo:
    Type: String
    Description: GitHub repository name (without org prefix)
    Default: infrastructure
  
  OrganizationName:
    Type: String
    Description: Organization or company name for bucket naming
    Default: itskarma

Resources:
Resources:
  # S3 Bucket for Terraform State (per member account)
  TerraformStateBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${OrganizationName}-${AWS::AccountId}-terraform-state'
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
          Value: CloudFormation-StackSet

  # Bucket policy to enforce encryption
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

  # GitHub Actions Role
  GithubActionsTerraformExecution:
    Type: AWS::IAM::Role
    Properties:
      RoleName: GithubActionsTerraformExecution
      Description: Allows GitHub Actions to run Terraform in this member account
      MaxSessionDuration: 3600
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          # Allow GitHub OIDC to assume this role directly
          - Sid: AllowGitHubOIDC
            Effect: Allow
            Principal:
              Federated: !Sub 'arn:aws:iam::${ManagementAccountId}:oidc-provider/token.actions.githubusercontent.com'
            Action: sts:AssumeRoleWithWebIdentity
            Condition:
              StringEquals:
                token.actions.githubusercontent.com:aud: sts.amazonaws.com
              StringLike:
                token.actions.githubusercontent.com:sub:
                  - !Sub 'repo:${GitHubOrg}/${GitHubRepo}:ref:refs/heads/main'
                  - !Sub 'repo:${GitHubOrg}/${GitHubRepo}:pull_request'
          
          # Allow management account role to assume this role (optional chain)
          - Sid: AllowManagementAccountRole
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${ManagementAccountId}:role/GithubActionsOrgRole'
            Action: sts:AssumeRole
      
      Tags:
        - Key: ManagedBy
          Value: CloudFormation-StackSet
        - Key: Purpose
          Value: GitHub-Actions-Terraform

  # Policy for Terraform state backend access
  TerraformStateAccess:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: TerraformStateBackendAccess
      Roles:
        - !Ref GithubActionsTerraformExecution
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          # Access to local member account state bucket only
          - Sid: LocalStateAccess
            Effect: Allow
            Action:
              - s3:GetObject
              - s3:PutObject
              - s3:DeleteObject
              - s3:ListBucket
            Resource:
              - !GetAtt TerraformStateBucket.Arn
              - !Sub '${TerraformStateBucket.Arn}/*'

  # Terraform execution permissions (customize per account needs)
  TerraformExecutionPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: TerraformExecutionPermissions
      Roles:
        - !Ref GithubActionsTerraformExecution
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          # VPC and Networking
          - Sid: VPCManagement
            Effect: Allow
            Action:
              - ec2:*Vpc*
              - ec2:*Subnet*
              - ec2:*InternetGateway*
              - ec2:*NatGateway*
              - ec2:*RouteTable*
              - ec2:*SecurityGroup*
              - ec2:*NetworkAcl*
              - ec2:*ElasticIp*
              - ec2:Describe*
              - ec2:CreateTags
              - ec2:DeleteTags
            Resource: '*'
          
          # EKS and Container Services
          - Sid: EKSManagement
            Effect: Allow
            Action:
              - eks:*
              - ecr:*
              - ecs:*
            Resource: '*'
          
          # Load Balancing and Auto Scaling
          - Sid: LoadBalancingAndAutoScaling
            Effect: Allow
            Action:
              - elasticloadbalancing:*
              - autoscaling:*
            Resource: '*'
          
          # IAM (limited to service roles)
          - Sid: IAMServiceRoles
            Effect: Allow
            Action:
              - iam:GetRole
              - iam:GetRolePolicy
              - iam:ListAttachedRolePolicies
              - iam:ListRolePolicies
              - iam:CreateRole
              - iam:DeleteRole
              - iam:AttachRolePolicy
              - iam:DetachRolePolicy
              - iam:PutRolePolicy
              - iam:DeleteRolePolicy
              - iam:PassRole
              - iam:TagRole
              - iam:UntagRole
              - iam:CreatePolicy
              - iam:DeletePolicy
              - iam:CreatePolicyVersion
              - iam:DeletePolicyVersion
              - iam:GetPolicy
              - iam:GetPolicyVersion
              - iam:ListPolicyVersions
            Resource: '*'
            Condition:
              StringEquals:
                iam:PassedToService:
                  - eks.amazonaws.com
                  - ec2.amazonaws.com
                  - ecs.amazonaws.com
                  - lambda.amazonaws.com
          
          # S3 (for application buckets, not state)
          - Sid: S3Management
            Effect: Allow
            Action:
              - s3:*
            Resource: '*'
          
          # KMS for encryption
          - Sid: KMSManagement
            Effect: Allow
            Action:
              - kms:Create*
              - kms:Describe*
              - kms:Enable*
              - kms:List*
              - kms:Put*
              - kms:Update*
              - kms:Revoke*
              - kms:Disable*
              - kms:Get*
              - kms:Delete*
              - kms:TagResource
              - kms:UntagResource
              - kms:ScheduleKeyDeletion
              - kms:CancelKeyDeletion
            Resource: '*'
          
          # CloudWatch Logs
          - Sid: CloudWatchLogs
            Effect: Allow
            Action:
              - logs:*
            Resource: '*'
          
          # Secrets Manager
          - Sid: SecretsManager
            Effect: Allow
            Action:
              - secretsmanager:*
            Resource: '*'

Outputs:
  RoleArn:
    Description: ARN of the GitHub Actions Terraform execution role
    Value: !GetAtt GithubActionsTerraformExecution.Arn
    Export:
      Name: GithubActionsTerraformExecutionRoleArn
  
  RoleName:
    Description: Name of the role
    Value: !Ref GithubActionsTerraformExecution
  
  StateBucketName:
    Description: Name of the Terraform state bucket
    Value: !Ref TerraformStateBucket
    Export:
      Name: TerraformStateBucketName
```

---

## Step 2: Create the StackSet

> **Note:** Ensure StackSets trusted access is enabled before proceeding. This was done in Step 1 of the [GitHub OIDC Connector](/onboarding/aws-account-setup/aws-github-oidc-connector/) guide.

Replace placeholders with your values:

```bash
# Set your variables
export MGMT_ACCOUNT_ID="123456789012"
export GITHUB_ORG="ItsKarma"
export GITHUB_REPO="infrastructure"
export ORG_NAME="itskarma"

# Create the StackSet
aws cloudformation create-stack-set \
  --stack-set-name github-oidc-member-role \
  --template-body file://github-oidc-role-stackset.yaml \
  --parameters \
      ParameterKey=ManagementAccountId,ParameterValue=$MGMT_ACCOUNT_ID \
      ParameterKey=GitHubOrg,ParameterValue=$GITHUB_ORG \
      ParameterKey=GitHubRepo,ParameterValue=$GITHUB_REPO \
      ParameterKey=OrganizationName,ParameterValue=$ORG_NAME \
  --capabilities CAPABILITY_NAMED_IAM \
  --permission-model SERVICE_MANAGED \
  --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false
```

Expected output:
```json
{
    "StackSetId": "github-oidc-member-role:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

---

## Step 3: Deploy to All Member Accounts

Deploy the role to your entire organization by targeting the root:

```bash
# Get your organization root ID
ROOT_ID=$(aws organizations list-roots --query 'Roots[0].Id' --output text)
echo "Organization Root ID: $ROOT_ID"

# Deploy to entire organization (all member accounts)
aws cloudformation create-stack-instances \
  --stack-set-name github-oidc-member-role \
  --deployment-targets OrganizationalUnitIds=$ROOT_ID \
  --regions us-east-2
```

This will deploy the `GithubActionsTerraformExecution` role to **all member accounts** in your organization, including any new accounts added in the future (because we enabled auto-deployment).

**State bucket naming:** Buckets will be named `{OrganizationName}-{AccountId}-terraform-state` (e.g., `itskarma-123456789012-terraform-state`). Using Account IDs ensures unique bucket names and works seamlessly with auto-deployment for new accounts.

> **Note:** The management account is automatically excluded - StackSets only deploy to member accounts.

---

## Step 4: Monitor Deployment

```bash
# Check StackSet status
aws cloudformation describe-stack-set \
  --stack-set-name github-oidc-member-role

# List all stack instances
aws cloudformation list-stack-instances \
  --stack-set-name github-oidc-member-role

# Get operation status
aws cloudformation list-stack-set-operations \
  --stack-set-name github-oidc-member-role
```

Wait for `Status: SUCCEEDED` on all instances (typically 2-5 minutes).

---

## Step 5: Verify in Member Accounts

Switch to a member account (via AWS Console or `aws sso login`) and check:

```bash
# List roles in member account
aws iam list-roles --query 'Roles[?RoleName==`GithubActionsTerraformExecution`]'

# Get role details
aws iam get-role --role-name GithubActionsTerraformExecution

# Verify trust policy includes GitHub OIDC
aws iam get-role --role-name GithubActionsTerraformExecution \
  --query 'Role.AssumeRolePolicyDocument'
```

---

## Updating the Role

When you need to change permissions or trust policy:

```bash
# Update the YAML template
vim github-oidc-role-stackset.yaml

# Update the StackSet
aws cloudformation update-stack-set \
  --stack-set-name github-oidc-member-role \
  --template-body file://github-oidc-role-stackset.yaml \
  --parameters \
      ParameterKey=ManagementAccountId,UsePreviousValue=true \
      ParameterKey=GitHubOrg,UsePreviousValue=true \
      ParameterKey=GitHubRepo,UsePreviousValue=true \
      ParameterKey=OrganizationName,UsePreviousValue=true \
  --capabilities CAPABILITY_NAMED_IAM \
  --permission-model SERVICE_MANAGED

# Deploy the update to all instances
aws cloudformation create-stack-instances \
  --stack-set-name github-oidc-member-role \
  --deployment-targets OrganizationalUnitIds=ou-xxxx-yyyyyyyy \
  --regions us-east-2 \
  --operation-preferences MaxConcurrentCount=5
```

---

## New Member Accounts

If you used `--auto-deployment Enabled=true`, new accounts added to the OU automatically get the role within minutes.

If you already had an existing account before following this guide, you can manually add an account:

```bash
aws cloudformation create-stack-instances \
  --stack-set-name github-oidc-member-role \
  --accounts 444444444444 \
  --regions us-east-2
```

---

## Security Notes

- **Least Privilege**: The template includes broad permissions for demo purposes. Tailor `TerraformExecutionPolicy` to only the services your Terraform uses in each environment.
- **Branch Protection**: Trust policy restricts to `main` branch and PRs. Tighten further if needed.
- **Environment Constraints**: For production accounts, add GitHub Environment conditions:
  ```yaml
  StringEquals:
    token.actions.githubusercontent.com:environment: production
  ```
- **Session Duration**: 1 hour (`MaxSessionDuration: 3600`). Reduce for stricter security.

---

## Troubleshooting

### StackSet creation fails with permissions error

Verify trusted access is enabled:
```bash
aws organizations list-aws-service-access-for-organization | grep stacksets
```

If not enabled, enable it:
```bash
aws organizations enable-aws-service-access \
  --service-principal member.org.stacksets.cloudformation.amazonaws.com
```

### Stack instance stuck in `OUTDATED` status

The account may not have the required execution role. Check:
```bash
aws cloudformation describe-stack-set-operation \
  --stack-set-name github-oidc-member-role \
  --operation-id <operation-id>
```

### GitHub Actions can't assume the role

- Verify OIDC provider exists in management account
- Check trust policy `sub` matches your repo/branch
- Ensure `aud` is `sts.amazonaws.com`
- Verify GitHub Actions workflow has `permissions: id-token: write`

---

## What We Accomplished

✅ Deployed `GithubActionsTerraformExecution` role to all member accounts  
✅ Created per-account S3 state buckets with versioning and encryption  
✅ Role has state backend access to its own account's bucket only (isolated state)  
✅ Predictable bucket naming using account IDs (works with auto-deployment)  
✅ Auto-deployment enabled for new accounts  
✅ No per-account manual Terraform runs needed  
✅ Centralized management via StackSet  

---

<div style="display: flex; justify-content: space-between; margin-top: 32px;">
  <a href="/onboarding/aws-account-setup/aws-github-oidc-connector/" style="text-decoration: none; color: #4ade80; font-weight: 500;">&larr; GitHub OIDC Connector</a>
  <a href="/onboarding/terraform-state/" style="text-decoration: none; color: #4ade80; font-weight: 500;">Terraform State Setup &rarr;</a>
</div>

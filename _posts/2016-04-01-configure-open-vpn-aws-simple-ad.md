---
layout: base.html
title:  "Configure OpenVPN to AWS Simple AD"
date:   2016-04-02
---
Connecting OpenVPN to authenticate with AWS Simple AD.

AWS provides a redundant Samba4 Active Directory solution, as well as DNS servers for the domain, for less than the price of a single t2.medium instance.

We are going to set up 3 things  
1. AWS Simple DB  
2. A windows management server for Active Directory (or you can manage with ldap)  
3. Connect an OpenVPN server to your AWS Simple DB  

## Pricing:

| Small | 500 Users | $0.05/hr |
| Large | 5,000 Users | $0.15/hr |  

## Simple AD Setup

```
Type: Simple AD  
Directory DNS: corp.domain.com  
NetBIOS name: corp  
Administrator password: <yourpasswordhere>  
Confirm password: <yourpasswordhere>  
Description: Whatever you want here
Directory size: Small

VPC Details:
VPC: Choose your management/tools VPC
Subnets:
```

## Management Server

For now, you can use these [instructions](https://auth0.com/blog/2014/10/22/simple-guide-to-setup-aws-directory-service/) to set up a nano windows server and install Active Directory tools, and join the computer to the domain. Reboot, and login as your domain Administrator. You can now manage via Active Directory tools on windows.

You can also manage via ldap cli via a system that has network access to the AD servers. Since the servers themselves are managed by AWS, you can not directly log in to them, but can manage via ldap remotely. (more to come on this later)

## Connect OpenVPN to Simple AD

Authentication Type: LDAP  
Get primary and secondary servers from AWS Directory Service console  
Bind DN: CN=Administrator,CN=Users,DC=corp,DC=domain,DC=com  
Password: <Administrator Password you set up when creating the domain>  
Base DN for User Entries: CN=Users,DC=corp,DC=domain,DC=com  

![OpenVPN Settings](/img/openvpn_simple_ad.png)

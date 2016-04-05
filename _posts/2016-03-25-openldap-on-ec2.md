---
layout: post
title:  "OpenLDAP on Amazon Linux EC2"
date:   2016-03-25
created:   2016-03-25
author:   Matt Karmazyn
categories: vpn linux ldap
---
I will show you how to set up an OpenLDAP server on Amazon Linux in EC2.

<!--break-->

First launch an instance through console, api, terraform, whatever your desired approach is. I was able to get away with a t2.nano instance as my user base is < 50. I think you should be fine with a nano until you reach a few hundred users at which point you may want to upgrade to a larger instance type.

This guide is a slight modification of [this guide](http://docs.adaptivecomputing.com/viewpoint/hpc/Content/topics/1-setup/installSetup/settingUpOpenLDAPOnCentos6.htm), which is written for CentOS.

## Installation
I am going to sudo up to root to make things a bit easier. I'm not concerned here as we are setting up a new instance, but always use sudo <command> when doing maintenance work on an existing instance.

    $ sudo su -

Then we want to run updates:

    $ yum update -y
    $ yum upgrade -y

Now let's install OpenVPN

    $ yum install -y openldap openldap-clients openldap-servers

Generate a password hash to be used as the admin password. This password hash will be used when you create the root user for your LDAP installation.

    $ slappasswd
    New password : password
    Re-enter new password : password
    {SSHA}0tvXPe42ehk1Ox23hQH96hgwj8TzLoHn

Add the root user and the root user's password hash to the OpenLDAP configuration in the olcDatabase={2}bdb.ldif file. The root user will have permissions to add other users, groups, organizational units, etc. Do the following:

    $ cd /etc/openldap/slapd.d/cn\=config
    $ vi olcDatabase\=\{2\}bdb.ldif

    # if the olcRootPW attribute does not exist, create it.
    olcRootPW: {SSHA}0tvXPe42ehk1Ox23hQH96hgwj8TzLoHn

While editing this file, change the distinguished name (DN) of the olcSuffix to something appropriate. The suffix typically corresponds to your DNS domain name, and it will be appended to the DN of every other LDAP entry in your LDAP tree.  
For example, let's say your company is called Acme Corporation, and that your domain name is "acme.com." You might make the following changes to the olcDatabase={2}bdb.ldif file:

    olcSuffix: dc=acme,dc=com
    ...
    olcRootDN: cn=Manager,dc=acme,dc=com
    ...
    olcRootPW: {SSHA}0tvXPe42ehk1Ox23hQH96hgwj8TzLoHn
    ...

Modify the DN of the root user in the olcDatabase={1}monitor.ldif file to match the olcRootDN line in the olcDatabase={2}bdb.ldif file. Do the following:  
Run this command to edit the olcDatabase={1}monitor.ldif file:

    $ vi olcDatabase\=\{1\}monitor.ldif

Modify the olcAccess line so that the dn.base matches the olcRootDN from the olcDatabase={2}bdb.ldif file. (In this example, dn.base should be "cn=Manager,dc=acme,dc=com".)

    ...
    olcAccess: {0}to * by dn.base="gidNumber=0+uidNumber=0,cn=peercred,cn=external,cn=auth" read by dn.base="cn=Manager,dc=acme,dc=com" read by * none
    ...

Now the root user for your LDAP is cn=Manager,dc=acme,dc=com. The root user's password is the password that you entered using slappasswd (see step 2), which, in this example, is: password

Hide the password hashes from users who should not have permission to view them.

Run this command to edit the oclDatabase\=\{2\}bdb.ldif file:

    $ vi olcDatabase\=\{2\}bdb.ldif

Add the following two lines to the end of the file to restrict users from viewing other users' password hashes.

    ...
    olcAccess: {0}to attrs=userPassword by self write by dn.base="cn=Manager,dc=acme,dc=com" write by anonymous auth by * none
    olcAccess: {1}to * by dn.base="cn=Manager,dc=acme,dc=com" write by self write by * read
    ...

| These lines allow a user to read and write his or her own password. It also allows a manager to read and write anyone's password. Anyone, including anonymous users, is allowed to view non-password attributes of other users.|

Make sure that OpenLDAP is configured to start when the machine starts up, and start the OpenLDAP service.

    $ chkconfig slapd on
    $ service slapd start

Now, you must manually create the "dc=acme,dc=com" LDAP entry in your LDAP tree.  
An LDAP directory is analogous to a tree. Nodes in this tree are called LDAP "entries" and may represent users, groups, organizational units, domain controllers, or other objects. The attributes in each entry are determined by the LDAP schema. In this tutorial we will build entries based on the InetOrgPerson schema (which ships with OpenLDAP by default).  
In order to build our LDAP tree we must first create the root entry. Root entries are usually a special type of entry called a domain controller (DC). Because we are assuming that the organization is called Acme Corporation, and that the domain is "acme.com," we will create a domain controller LDAP entry called dc=acme,dc=com. Again, you will need to replace "acme" with your organization's domain name. Also note that dc=acme,dc=com is what is called an LDAP distinguished name (DN). An LDAP distinguished name uniquely identifies an LDAP entry.  
Do the following:

Create a file called acme.ldif. (You can delete this file once its content has been added to LDAP, so in this example, we will create it in the /tmp folder.)

    $ cd /tmp
    $ vi acme.ldif

Add the following lines in acme.ldif:

    dn: dc=acme,dc=com
    objectClass: dcObject
    objectClass: organization
    dc: acme
    o : acme


Now add the contents of this file to LDAP. Run this command:

    $ ldapadd -f acme.ldif -D cn=Manager,dc=acme,dc=com -w password

Verify that your entry was added correctly.

    $ ldapsearch -x -LLL -b dc=acme,dc=com
    dn: dc=acme,dc=com
    objectClass: dcObject
    objectClass: organization
    dc: acme
    o: acme

## IP Tables changes
By default, the CentOS 6 firewall will block external requests to OpenLDAP. In order to allow MWS to access LDAP, you will have to configure your firewall to allow connections on port 389. (Port 389 is the default LDAP port.)  
Configuring your firewall is beyond the scope of this tutorial; however, it may be helpful to know that the default firewall on CentOS is a service called iptables. (For more information, see the documentation on iptables.) In the most basic case, you may be able to add a rule to your firewall that accepts connections to port 389 by doing the following

    $ vi /etc/sysconfig/iptables

    # ... lines with ACCEPT should be above
    -A INPUT -p tcp --dport 389 -j ACCEPT
    # .. lines with REJECT should be below

Now flush iptables

    $ iptables --flush

## Adding an organizational unit (OU)
These instructions will describe how to populate the LDAP tree with organizational units (OUs), groups, and users, all of which are different types of LDAP entries. The examples that follow also presume an InetOrgPerson schema, because the InetOrgPerson schema is delivered with OpenLDAP by default.

To add an organizational unit (OU) entry to the LDAP tree.  
In this example, we are going to add an OU called "Users."

Create a temporary file called users.ldif. (You can delete this file once its content has been added to LDAP, so in this example, we will create it in the /tmp folder.)

    $ cd /tmp
    $ vi users.ldif

Add these lines to users.ldif:

    dn: ou=Users,dc=acme,dc=com
    objectClass: organizationalUnit
    ou: Users

Add the contents of users.ldif file to LDAP.

    $ ldapadd -f users.ldif -D cn=Manager,dc=acme,dc=com -w password

## Adding a user
In this example, we will add a user named "Bob Jones" to LDAP inside the "Users" OU.

Create a temporary file called bob.ldif. (You can delete this file once its content has been added to LDAP, so in this example, we will create it in the /tmp folder.)

    $ cd /tmp
    $ vi bob.ldif

Add these lines to bob.ldif:

    dn: cn=Bob Jones,ou=Users,dc=acme,dc=com
    cn: Bob Jones
    sn: Jones
    objectClass: inetOrgPerson
    userPassword: bobspassword
    uid: bjones

Add the contents of bob.ldif file to LDAP.

    $ ldapadd -f bob.ldif -D cn=Manager,dc=acme,dc=com -w password

## Adding a group
In this example, we will add a group called "Engineering" to LDAP inside the "Users" OU.

Create a temporary file called engineering.ldif. (You can delete this file once its content has been added to LDAP, so in this example, we will create it in the /tmp folder.)

    $ cd /tmp
    $ vi engineering.ldif

Add these lines to engineering.ldif:

    dn: cn=Engineering,ou=Users,dc=acme,dc=com
    cn: Engineering
    objectClass: groupOfNames
    member: cn=Bob Jones,ou=Users,dc=acme,dc=com

Add the contents of engineering.ldif file to LDAP.

    $ ldapadd -f engineering.ldif -D cn=Manager,dc=acme,dc=com -w password


## Adding a user to a group
In this example, we will add an LDAP member named "Al Smith" to the "Engineering" LDAP group. This example assumes that user, Al Smith, has already been added to LDAP.

Before you add a user to an LDAP group, the user must first be added to LDAP. For more information, see Adding a user.

Create a temporary file called addUserToGroup.ldif. (You can delete this file once its content has been added to LDAP, so in this example, we will create it in the /tmp folder.)

    $ cd /tmp
    $ vi addUserToGroup.ldif

Add these lines to addUserToGroup.ldif:

    dn: cn=Engineering,ou=Users,dc=acme,dc=com
    changetype: modify
    add: member
    member: cn=Al Smith,ou=Users,dc=acme,dc=com

Now add the contents of addUserToGroup.ldif file to LDAP.

    $ ldapadd -f addUserToGroup.ldif -D cn=Manager,dc=acme,dc=com -w password

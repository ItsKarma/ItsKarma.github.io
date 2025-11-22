---
layout: base.html
title:  "OpenVPN on Amazon Linux EC2"
date:   2016-03-20
---
I will show you how to set up an OpenVPN server on Amazon Linux in EC2.


WARNING: This guide is incomplete. It will take you through installation and most of the configuration but some pieces may be missing.

First launch an instance through console, api, terraform, whatever your desired approach is.

## Installation
I am going to sudo up to root to make things a bit easier. I'm not concerned here as we are setting up a new instance, but always use sudo <command> when doing maintenance work on an existing instance.

```
sudo su -
```

Then we want to run updates:

```
yum update -y
yum upgrade -y
```

Now let's install OpenVPN

```
yum install -y openvpn
```

Install easy-rsa from EPEL

```
yum install easy-rsa -y --enablerepo=epel
```

Copy the sample server config file

```
cp /usr/share/doc/openvpn-*/sample/sample-config-files/server.conf /etc/openvpn/
```

## Generate Keys and Certificates
We installed easy-rsa earlier which offers many scripts as utilities. These scripts are located in /usr/share/easy-rsa/2.0 after installation. We are going to copy these into our /etc/openvpn/rsa directory.

Lets create the rsa directory in case it does not exist yet.

```
mkdir /etc/openvpn/rsa
```

We are using /bin/cp to copy the files because most modern systems have an alias of cp to cp -i which will prompt you to overwrite files, and we don't want that.

```
/bin/cp –rf /usr/share/easy-rsa/2.0/* /etc/openvpn/rsa
```

Next, we will use the parameters in /etc/openvpn/rsa/vars to indicate the values for our keys and certificates. Change the values according to your needs (fields are self-explanatory)

```
vim /etc/openvpn/rsa/vars
```

```
export KEY_COUNTRY="US"
export KEY_PROVINCE="CA"
export KEY_CITY="mycity"
export KEY_ORG="myorg"
export KEY_EMAIL="myemail@mydomain.com"
export KEY_OU="systems"
```

```
cd /etc/openvpn/rsa
source ./vars
```

```
./clean-all
```

The build-ca script will create a Certificate Authority (certificate + key) in /etc/openvpn/rsa/keys. We filled out and exported these values in the vars file. Press Enter to accept the default values:

```
./build-ca
```

```
Country Name (2 letter code) [US]:
State or Province Name (full name) [CA]:
Locality Name (eg, city) [mycity]:
Organization Name (eg, company) [myorg]:
Organizational Unit Name (eg, section) [systems]:
Common Name (eg, your name or your server's hostname) [myorg CA]:
Name [EasyRSA]:
Email Address [myemail@domain.com]:
```

```
[rsa]# ls keys/
ca.crt  ca.key  index.txt  serial
```

Next, we will create the key and the certificate for the server itself. As before, accept the default values and then press y to confirm the signing of the certificate:

```
./build-key-server server
```

```
[root@ip-10-50-3-194 rsa]# ./build-key-server server
Generating a 2048 bit RSA private key
.........................+++
writing new private key to 'server.key'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [US]:
State or Province Name (full name) [CA]:
Locality Name (eg, city) [mycity]:
Organization Name (eg, company) [myorg]:
Organizational Unit Name (eg, section) [systems]:
Common Name (eg, your name or your server's hostname) [server]:
Name [EasyRSA]:
Email Address [myemail@domain.com]:
```

```
Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
Using configuration from /etc/openvpn/rsa/openssl-1.0.0.cnf
Check that the request matches the signature
Signature ok
The Subject's Distinguished Name is as follows
countryName           :PRINTABLE:'US'
stateOrProvinceName   :PRINTABLE:'CA'
localityName          :PRINTABLE:'mycity'
organizationName      :PRINTABLE:'myorg'
organizationalUnitName:PRINTABLE:'systems'
commonName            :PRINTABLE:'server'
name                  :PRINTABLE:'EasyRSA'
emailAddress          :IA5STRING:'myemail@domain.com'
Certificate is to be certified until Mar 20 16:44:51 2026 GMT (3650 days)
Sign the certificate? [y/n]:y
```

```
1 out of 1 certificate requests certified, commit? [y/n]y
Write out database with 1 new entries
Data Base Updated
```

Next, generate the Diffie-Hellman file used for information exchange to complement RSA (this may take some time). This will create a file named dh2048.pem inside /etc/openvpn/rsa/keys:

```
./build-dh
```

Finally, create separate certificate files for each client that will use your VPN server (change client to a name of your choosing):

```
./build-key client
```

## Configuration
We are going to begin editing the server.conf file. I will be using vi, but you can use your preferred text editor

```
vi /etc/openvpn/server.conf
```

```
dh /etc/openvpn/rsa/keys/dh2048.pem
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"
user nobody
group nobody
```

copy the keys to the /etc/openvpn directory

```
cp ca.crt server.crt server.key /etc/openvpn/
```

start the service

```
/etc/init.d/openvpn start
```

WARNING: This is where the guide dies. You may still need to make some ip tables changes. I may document this at a later time.

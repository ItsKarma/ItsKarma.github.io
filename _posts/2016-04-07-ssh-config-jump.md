---
layout: post
title:  "SSH proxy config"
date:   2016-04-07
created:   2016-04-07
author:   Matt Karmazyn
categories: ssh tunnel proxy
---
Set up SSH proxy config file.

<!--break-->

I always like to keep a bastion host or jumpbox in a dmz so I can tunnel through it to a private network. In AWS this can be a t2.nano instance and can be shared with other admins (each having their own user account).

## Setting up the config

The file we are looking to create/modify here is ~/.ssh/config

```
Host jump
  HostName jumpbox.domain.com
  Port 22
  User your-username-on-jumpbox
  IdentityFile ~/.ssh/path/to/your/key/to/access/jumpbox.pem
  ForwardAgent yes
Host 10.*
  ProxyCommand ssh -q jump nc %h 22
  User your-username-on-remote-host
  StrictHostKeyChecking no
  UserKnownHostsFile=/dev/null
```

## Using the tunnel

Now you can just ssh to a 10.* address and it will first connect to the jumpbox, passing along your ssh-agent so you can continue to the next hop of 10.* without any other hoops. You can of course expand on this or modify this depending on the hostnames of your private instances.

```
ssh 10.1.23.45
```

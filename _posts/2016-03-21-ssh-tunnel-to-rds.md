---
layout: post
title:  "SSH tunnel to private RDS instance"
date:   2016-03-21
created:   2016-03-21
author:   Matt Karmazyn
categories: ssh linux rds
---
SSH tunneling from your local computer to an RDS instance in a private subnet.

<!--break-->

First you need an instance that you can log into that has access to RDS. I will be calling that bastion. Make sure you add rules on the RDS security group allowing access from the bastion host.

I will be demonstrating with postgres, but you can substitute the ports and commands for mysql.


## Setting up the tunnel
```
ssh -N -L 3333:your.rds.endpoint.rds.amazonaws.com:5432 ssh-user@bastion
```

| -N | only set up the tunnel |
| -L | set up the forwarding |
| 3333 | the first number is the port on your local machine |
| 5432 | the port on the rds instance |
| your.rds.endpoint.amazonaws.com | the name of the rds endpoint |
| ssh-user@bastion | how you log into your bastion host |

## Using the tunnel
```
# postgresql
psql -h localhost -p 3333 -d mydbname -U postgres
```

| -h localhost | we can specify localhost since we now have the tunnel set up |
| -p 3333 | port 3333 is our local port we designated earlier in the tunnel |
| -d mydbname | the name of the database you want to connect to |
| -U postgres | the user name you want to connect as |

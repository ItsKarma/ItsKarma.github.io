---
layout: page
title: My Stack
comments: true
permalink: /mystack/
---

* content
{:toc}

# My Stack
This is an overview of my technology stack. The tools I use, and why I use them. I try to keep a post about each of these topics that cover them in more detail.

### It all starts with the OS
Linux: I prefer the RHEL family, and me being a free man, I like CentOS. Most of the work I do lately is on AWS, so I use Amazon Linux because it is optimized for the AWS/EC2 ecosystem.


### Infrastructure, who needs it?
Datacenters are great, but they are a lot of work. Lots of people, lots of space, lots of hardware, power, ups, generators. Multiply all that by 2 because you need a disaster recovery site, unless you are okay with downtime. Scratch all that and go to the cloud. I personally use Amazon Web Services for my cloud computing. They are doing things that your datacenter doesn't, and probably for less.

### Packer
Use [Packer](https://www.packer.io/) to build identical images for multiple platforms. In my case, from the same set of scripts I can build an Amazon Machine Image used for production, and a Docker Container or a Vagrant box for development. Using packer, I can hand my developers a production instance on their local workstations. No more dependency issues, no more "It works on my laptop, I don't know why it's not working on the QA server."  
I also use Packer with AWS to pre-bake (99% configure) AMI's. Everything I do is in an autoscaling group. And when your site gets [slashdotted](https://en.wikipedia.org/wiki/Slashdot_effect), you're going to want to scale fast! Pre-baking the image allows for faster booting.

### AWS Configuration
I didn't exactly know what to call this, but it is an important one.  
[Terraform](https://www.terraform.io/) is a great tool to manage the definition of your AWS (and other providers) configuration. That's pretty generic, what I actually use Terraform to do is manage my AWS VPC, Subnets, Security Groups, Route Tables, and Route53. As I use Terraform more I keep adding pieces to that, but I think those are reliable pieces of the infrastructure that don't change often enough, and are important to define in Terraform. There is a lot to talk about here, so check the Terraform post for more details.

### Dev/Test
I tend to use [Vagrant](https://www.vagrantup.com/) for single server testing. If you need to run a full production stack on your laptop, I'd use [Docker](https://www.docker.com/) for that.

### Configuration Management
[Chef](https://www.chef.io/) is my current tool of choice for configuration management.  
[Ansible](https://www.ansible.com/) is a very close second. I love the simplicity of Ansible, and the extendability.

I tend to prefer open source tools in all areas. Chef's client and server are both open source which makes it my top choice right now. Ansible's "client" (not sure exactly what to call it since it only uses ssh, and has no agent) is open source, but their server solution [Tower](https://www.ansible.com/tower) is not. I have heard rumors of an open source Tower since Red Hat acquired Ansible. When that happens, Ansible may move up to my #1 spot.

### Continuous Integration and Delivery
Jenkins for automated builds, push button deployments and post deployment testing. I also use Jenkins for providing an interface to people who normally would not have access to perform a task. Analytics team needs an EMR cluster for 2 hours? No problem, here is the button you push to launch that, and now they don't need AWS credentials (and more importantly, they don't need to bug me!)

### Logging
[ELK Stack](https://www.elastic.co/webinars/introduction-elk-stack) (Elasticsearch Logstash Kibana) Using [logstash-forwarder](https://github.com/elastic/logstash-forwarder) to ship logs to a central Logstash cluster for processing into [Amazon’s Elasticsearch Service](https://aws.amazon.com/elasticsearch-service/). The approach using logstash-forwarder takes the load off the app server and frees up some memory and cpu cycles on the instance for more important tasks.

### Backup
    "The minute you have a back-up plan, you've admitted you're not going to succeed."
    - Elizabeth Holmes

THIS DOES NOT APPLY TO DATA!
I prefer this quote instead

    "Everything fails, all the time."
    - Werner Vogels

Now let's look at what is backed up, and where.

Source Code - GitHub  
Chef Cookbooks (or other config management) - GitHub  
AWS Configuration - Terraform -> GitHub  
App Server Config - Packer -> GitHub  
DB Server Config - Packer -> GitHub  
Jenkins (deployment) Scripts - GitHub  
Starting to see a pattern?  

This, is "Infrastructure as code."

The only problem left to solve is, what about the data? If you are using Amazon RDS or DynamoDB, you don't need to worry about it, as you can take regular backups of RDS, and DynamoDB is stored in S3. If you run your database on EC2 such as MongoDB or CouchBase, you should be taking regular snapshots of your instances and having a few on hand for quick recovery.

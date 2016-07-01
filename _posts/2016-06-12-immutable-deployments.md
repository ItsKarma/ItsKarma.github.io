---
layout: post
title:  "Immutable Deployments"
date:   2016-06-12
created:   2016-06-12
author:   Matt Karmazyn
categories: deployment production immutable infrastructure
---
Immutable infrastructure lessons learned.

<!--break-->

I share some lessons learned from managing an immutable infrastructure using AWS. These ideas generally translate to any cloud provider.

## The 3 methods

There are 3 general methods of image management.

1. Launch instances using the base image and let your configuration management tool do everything at launch time.
* This method is easy because it does not require any tools to manage the image, only your configuration management tool.
2. 100% bake your image.
* This method is great as you have very fast launch times, and you almost don't require a configuration management tool if you just bake everything into your image. Your configuration management occurs at the time of the image creation, so you don't manage anything after the instance is launched because it's already there.
3. A mix of both, or what I like to call 95% baking the image.
* I prefer this method as it gets you a fast boot time, which if you are utilizing auto-scaling, you're going to want. This method also grants you some level of configurability using your configuration management tool. For example, you can bake everything into your image pre-configured, except the memory allocation settings for your application. When the instance launches, it will have the memory available to the instance type that was used to create the image (maybe 512mb), then it will update that to use the available memory to the size of the instance you used to launch (maybe 4gb).

## Packer

Packer is an amazing tool when it comes to image management. It is the staple of your immutable infrastructure Use it together with your configuration management tool to 95% build/configure your instance.

## Credentials

You still need something to manage credentials. You don't want to bake your Credentials into your AMI. The paranoid may say, now amazon has a backdoor into your AMI and can actually just take your credentials off your server. We know Amazon uses shared resources, I'm a bit more concerned that someone gains unauthorized access to that AMI (internal or external) and can launch an instance and gain access to the credentials.

TLDR; don't bake creds into your image, insert them at runtime, and not in your userdata script where anyone can see.

## Latest

Each time you bake your image, you want to make sure you are using the latest software versions possible. At the very least, take the security updates from your package manager, but if your use case allows, just update everything.

## Consistency

Try to keep your infrastructure as consistent as possible. This means going back and updating old software/servers to meet your new standards. It's likely a vulnerability risk, and the more time that passes without touching a system, the more likely it will break when you finally do touch it. When that happens it will be more difficult to fix as it is not up to your current standards.

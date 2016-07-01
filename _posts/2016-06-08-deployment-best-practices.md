---
layout: post
title:  "Deployment Best Practices"
date:   2016-06-04
created:   2016-06-04
author:   Matt Karmazyn
categories: deployment production security
---
Best practices around deployment

<!--break-->

## Credentials

Credentials are kept in the environment.

## Reduce surface area of attack

The less software you have installed, the less potential vulnerabilities and exploits you are exposed to. Reduce the surface area of attack by removing old software.

## Clean

Clean the directory before deploying. Back it up if you must, but always deploy to a clean directory. There is nothing worse than trying to diagnose an issue when there are files left over from previous deployments cluttering up the directory.

## Consistency

Try to keep your infrastructure as consistent as possible. This means going back and updating old software/servers to meet your new standards. It's likely a vulnerability risk, and the more time that passes without touching a system, the more likely it will break when you finally do touch it. When that happens it will be more difficult to fix as it is not up to your current standards.

---
layout: base.html
title:  "What's Inside the Docker Sausage"
date:   2016-06-30
---
Cgroups, Namespaces, and beyond.


We'll talk about the core technology that makes Docker successful.

## The Core

1. Cgroups - limits what resources you can use.

2. Namespaces - limit what you can view.

3. copy-on-write - optimizes image disk space usage and performance of container start times.

## Cgroups

Cgroups - control groups - allow you to manage cpu/memory/block and network io/etc... on a per process basis.

Each subsystem (cpu/memory/...) has a hierarchy.

## Namespaces

pid - lets a given process see only other processes within that local pid namespace. pid 1 of the process inside the container, is a different process with a different id outside the container (on the host)

net - network namespace allows each namespace to get their own private network stack. network interfaces: routing tables, iptables rules, sockets.

mnt - lets each container to mount something, but not have that something visible in the other containers. ie. each user can have it's own /tmp. This is more secure.

uts - lets each each container have it's own hostname.

ipc - allows a process to have it's own ipc message queues, ipc shared memory. If an application was using ipc memory, you could have applications clashing for memory. ipc namespace allows the separation of ipc.

user - allows to map uid's from host to inside container. user 1234 on host can map to user 1 in container. Inside the container you are root and can do anything, outside the container you have no permissions. This provides a great security feature. There used to be tons of security issues with user namespaces, recent updates to user namespaces have allowed for better security.

## copy-on-write

Sharing is a good way to optimize resources. People do this instinctively in daily life. For example, twins Jane and Joseph taking an Algebra class at different times from different teachers can share the same exercise book by passing it between each other. Now, suppose Jane gets an assignment to complete the homework on page 11 in the book. At that point, Jane copies page 11, completes the homework, and hands in her copy. The original exercise book is unchanged and only Jane has a copy of the changed page 11.

Copy-on-write is a similar strategy of sharing and copying. In this strategy, system processes that need the same data share the same instance of that data rather than having their own copy. At some point, if one process needs to modify or write to the data, only then does the operating system make a copy of the data for that process to use. Only the process that needs to write has access to the data copy. All the other processes continue to use the original data.

Docker uses a copy-on-write technology with both images and containers. This CoW strategy optimizes both image disk space usage and the performance of container start times.

Source: https://docs.docker.com/engine/userguide/storagedriver/imagesandcontainers/

## SELinux and AppArmor

For even further separation of containers, use SELinux and AppArmor. More info to come on this.

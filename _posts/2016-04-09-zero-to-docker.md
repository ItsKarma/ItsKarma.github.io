---
layout: post
title:  "Zero to Docker"
date:   2016-04-10
created:   2016-04-09
author:   Matt Karmazyn
categories: docker osx
---
Getting started with Docker on OSX.

<!--break-->

Docker is easy on Linux, but not so easy on OSX. Follow this guide to get set up fast.

# Installation

First we'll install virtualbox. Docker machine will use this in the background to create a linux box to run the docker engine.

    brew install virtualbox

Then we'll install docker and the other tools.

    brew install docker
    brew install docker-machine
    brew install docker-compose

# Prep

Next we need to create a machine.  
We will just create the default machine, but you can create many machines for different types of work. Keep in mind that you can run different types of containers inside the same machine, so having a machine per project is not always necessary.

    docker-machine create --driver virtualbox default

# Stop/Start and other machine usage

Lets stop the machine.

    docker-machine stop default

Lets start the machine.

    docker-machine start default

Started machines may have new IP addresses. Lets source the environment just in case.

    eval $(docker-machine env default)

List machines (separate from containers).

    docker-machine ls

Remove a machine.

    docker-machine rm default

# Now using docker (the fun stuff)

Just get a blank CentOS docker container to mess around in. When you disconnect from this tty/container, it will stop the container because you did not provide the -d flag.

    docker run -it centos

If you pass -d it will run in detached mode and you have to execute bash into the running container as a separate command.

    docker run -itd -name cent centos
    docker exec -it cent /bin/bash

Now if you log out of that container, you can see it is still running.

    docker ps

Lets stop the container.

    docker stop cent

If you run `docker ps` again, you'll see that container is not running.  
We know the name of our `cent` container, but what about any other containers we may have had running before. Lets pass the -q flag to see them all.

    docker ps -q

Now let's remove them all because we want to keep our environment clean.

   docker rm $(docker ps -aq)

If you run docker ps -q again, you'll see we have no more containers.

---
layout: base.html
title:  "Yo Dawg, I heard you like Templates"
date:   2016-04-27
---
Creating Consul Templates with Chef's Template resource.


![Yo Dawg Templates](/img/yo_dawg_templates.jpg)

### Consul

I won't go into what [Consul](https://consul.io) is in the scope of this post, but it is expected you know the basics.

### consul-template

[consul-template](https://github.com/hashicorp/consul-template) can be used to render a template using values stored in Consul. This is often used when creating configuration files which need to be updated dynamically, such as a software load balancer that needs to dynamically load the servers it is balancing.

#### The Flow

* New server launches, registers with Consul.
* A push is made from Consul to consul-template to render the template with the new value(s).
* If the template was updated, consul-template will restart/reload the desired service.

#### Example

In this example we will have an auto-scaling web server group behind an HAProxy instance.

How do we update HAProxy when a new web server is launched

* New web server is launched.
* A startup script executes Chef with an environment/role.
* Chef lays down the consul-template .ctpl file.
* The instance registers with the Consul cluster.
* Consul pushes the new web server's data to consul-template on the HAProxy instance.
* consul-template renders a new config with the new web server.
* Since a change was made to the template, consul-template reloads the HAProxy config file.
* Traffic is now being sent to the new web server.

### Chef

We need something to place the consul-template configuration file on the system, as well as the ctpl consul-template templates. This is where Chef comes in and lays down the ctpl file so consul-template can generate the end .conf file for HAProxy, or whatever file you are managing with consul-template.

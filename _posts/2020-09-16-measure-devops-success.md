---
layout: post
title:  "Measure DevOps Success"
date:   2020-09-16
created:   2020-09-16
author:   Matt Karmazyn
categories: devops
---
How to measure the success of DevOps in your organization.

<!--break-->

There are four key metrics you want to measure when trying to determine how successful DevOps is in your organization.

1. Deployment Frequency
2. Lead Time
3. Mean Time to Resolve (MTTR)
4. Change Failure Rate


## Deployment Frequency

Deployments per day
Deployments per day per engineer
Small Batch Sizes
Deploy as-needed

How to Track?  
- Track directly from your deployment tool - [DeployBoard](https://www.deployboard.io)


## Lead Time

Definition: I have seen this tracked two different ways.
1. Some teams will define lead time as the amount of time it takes to move a feature from “In Progress” to Production. The timer starts when Developer moves ticket to “In Progress” and ends when the feature has been released to Production.
2. Accelerate and the State of DevOps report, measure this as time from code committed to deployed to production.

I believe it is important to track both of these separately. We want to know how much work our developers are capable of in order to draw an accurate roadmap. We also want to know the length of our deployment pipeline, and be able to trend this over time.

How to Track?  
- If you are including the development time, you can track within your Project Management Software.
- If you are only counting time from commit to production, you can track this within your deployment tool - [DeployBoard](https://www.deployboard.io)


## Mean Time to Resolve (MTTR)

Definition: The average elapsed time from when an incident first occurs until the incident is resolved.

Don't cheat yourself here. The clock starts at the first occurrence of the incident, not when the customer reports an issue. The clock ends when the issue is completely resolved. Blameless post mortems are important here. These numbers should not be used in any negative way, or else you risk your engineers reporting inaccurate numbers.

How to Track?  
Track this automatically with monitoring and notification tools, or you can track this manually if incidents do not occur frequently.


## Change Failure Rate

Definition: - This metric combines two smaller metrics that I like to measure separately. Change Failure Rate and Rollback Rate.

Change Failure Rate:  
This metric helps to reveal flaws in your deployment pipeline. For the purpose of "Change Failure Rate" we are only measuring failures at deployment time.
Failed Deployments / Total Deployments

Rollback Rate:  
This metric helps to reveal inconsistencies with your production and testing environments. We are only measuring a successful deployment that requires rollback.
Rolled Back Deployments / Total Deployments

How to Track?  
Track directly from your deployment tool - [DeployBoard](https://www.deployboard.io)

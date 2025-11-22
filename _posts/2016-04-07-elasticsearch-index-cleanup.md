---
layout: base.html
title:  "Elasticsearch Index Cleanup"
date:   2016-04-07
---
How to delete old indices to free up space, and also automatically delete old indices as you approach a minimum threshold of available space.


## Setting up the tunnel
for now, I will be providing several links that may be helpful, and I will reference the links with [number]

You can delete indexes using the curl -XDELETE command[1]

Currently AWS Elasticsearch indexes do not expire. You can monitor your free space (or any other metric) via the ElasticSearch CloudWatch metrics and when a threshold has been hit, you can trigger an SNS notification, which is consumed by a Lambda function, which takes the appropriate action (such as deleting an index), an example of which is below[2]

See the following for a full list of the metrics that ElasticSearch has available[3]

Another method, is to actually set a TTL on the document (not the index). With TTL enabled, you can set a period for how long that document will be available before it is automatically deleted. See the following link that shows how you can enable and set TTL for documents[4]

The solution above is for documents and not for indices. If you wish for a whole index to be deleted after a specific period, then another solution is to create monthly indexes (i.e. myindex_201510) and then setup a cron to delete the index based on the name of it. The following link discusses this[5]

One way to manage retention in Elasticsearch is by setting TTLs on each document. Elasticsearch will then periodically delete expired documents in bulk. This makes it easy to do custom retention per account. However, it turns out to be a rather expensive (repetitive) operation.

A much lighter weight operation is dropping entire indices. This is why Logstash defaults to daily indices. When an index falls outside your retention period, you can simply drop the index from a cron job.

Resources:

1. [https://www.elastic.co/guide/en/elasticsearch/reference/1.4/indices-delete-index.html](https://www.elastic.co/guide/en/elasticsearch/reference/1.4/indices-delete-index.html)
2. [https://aws.amazon.com/blogs/compute/scaling-amazon-ecs-services-automatically-using-amazon-cloudwatch-and-aws-lambda/](https://aws.amazon.com/blogs/compute/scaling-amazon-ecs-services-automatically-using-amazon-cloudwatch-and-aws-lambda/)
3. [http://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-managedomains.html#es-managedomains-cloudwatchmetrics-cluster-metrics](http://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-managedomains.html#es-managedomains-cloudwatchmetrics-cluster-metrics)
4. [https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-ttl-field.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-ttl-field.html)
5. [https://www.elastic.co/blog/using-elasticsearch-and-logstash-to-serve-billions-of-searchable-events-for-customers](https://www.elastic.co/blog/using-elasticsearch-and-logstash-to-serve-billions-of-searchable-events-for-customers)

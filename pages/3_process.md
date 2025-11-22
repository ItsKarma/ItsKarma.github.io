---
layout: base.html
title: Process
permalink: /process/
---

# Process

There are some notes I have around various processes. I've never met an organization that was exactly the same, but many are similar. You need to define the priorities of the organization and build the process around those priorities. I will share a method that I have personally like, but of course this can be adapted to fit most situations.

## CI/CD

There are a lot of ways to accomplish CI/CD, and you need to decide what is right for your organization. Most notably when do you deploy? There isn't really a right answer to this question, but there are many possibilities.

Do you deploy to production on:

- Merge to main?
- Release created?
- On a branch? - Then merge to main after tests pass (GitHub Flow)

### Pre-Commit Hooks

There is a lot of time wasted on the pull request process asking users to format their code properly. You can make sure all contributors have the same IDE settings, but there will inevitably be diffs. We can run some checks at the Pull Request (see below), but some of these things we can do locally before the code even makes it to source control.

isort — sorts all your imports!
seed-isort-config — populates the known_third_party of isort setting
black — The Uncompromising Code Formatter
flake8 — a wrapper around PyFlakes, pycodestyle and Ned Batchelder’s McCabe script

### Pull Request Checks

As mentioned above, one of the things we do at the time of Pull Request is automatically run a linter to verify the code satisfies at least that requirement.

## Pipeline

A typical pipeline that is triggered by the Pull Reuqest Open might look like this.

- Lint
- Unit Tests
- Code Coverage
- SonarScan (SonarQube)
  - Code Coverage
  - Maintainability
  - Security Scan
- Build Artifact
- Deploy to Test Environment
- Regression tests against Test Environment
  - If tests pass: Deploy to production environment

## Balance

You need to balance the quality of your software with your ability to move fast. Sometimes making sure your product is absolutely perfect before releasing to production means you release slower and less frequently. We need to balance our quality with our willingness to ship fast.

### Automated Tests

In order to have a truly continuous delivery cycle, you must have confidence in your unit tests and integration and smoke tests.

### Data

You must have a way to replicate production or production-like data to your testing environments. Often I see code that breaks in production because the data is different. Maintaining a schema and generating seed data from that model will ensure your data is at least structured the same as it is in production. If possible you should also generate the same amount of data that is in production. All database queries perform fast when there is a small sample set, you need to make sure the quantity of data matches that of production as well.

Ideally you would have some process to replicate data from production to a testing environment. If you do this, make sure to scrub any data that is not allowed in a non-production environment, and depending on your situation, this may not be possible due to regulatory reasons. If that is the case, maintaining the above is highly recommended.

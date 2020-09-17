---
layout: post
title:  "Determine Subshell Level"
date:   2020-09-16
created:   2020-09-08
author:   Matt Karmazyn
categories: bash linux
---
How to determine the level of subshell you are in.

<!--break-->

Lately I have been using [aws-vault](https://github.com/99designs/aws-vault) to manage my session across multiple AWS accounts. This tool puts you in a subshell, but after some time I forget if this particular terminal session is a subshell or not. The `$SHLVL` variable tracks your shell nesting level.

```
$ echo $SHLVL
1
$ bash
$ echo $SHLVL
2
$ exit
$ echo $SHLVL
1
```

I now include this in my `$PS1` prompt for ease of use.

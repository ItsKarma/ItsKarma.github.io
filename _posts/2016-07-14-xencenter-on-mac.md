---
layout: post
title:  "XenCenter on Mac"
date:   2016-07-15
created:   2016-07-14
author:   Matt Karmazyn
categories: xen xencenter mac osx
---
Running XenCenter on Mac.

<!--break-->

How to install and run XenCenter like management software called: OpenXenManager on Mac.

## Intro

We will install dependencies, clone the application from GitHub, build, configure, and run the application.

## Requirements

```
brew install python gtk pygtk
brew install homebrew/x11/tiger-vnc
pip install configobj
```

Clone the latest from GitHub

```
git clone https://github.com/OpenXenManager/openxenmanager.git
cd openxenmanager
```

## Installation

Build OpenXenManager

```
python setup.py build
```

Install OpenXenManager

```
python setup.py install
```

Run the script once to launch the app and generate the config file, then close it right away.

```
./build/scripts-2.7/openxenmanager
```

Open the oxc.conf in your favorite editor (vim in this example)

```
vim ~/.config/openxenmanager/oxc.conf
```

Edit the [options] line to this:

```
vnc_viewer = /usr/local/bin/vncviewer
```

## Connect

(coming soon)

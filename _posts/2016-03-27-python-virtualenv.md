---
layout: post
title:  "Python Virtual Environments"
date:   2016-03-27
created:   2016-03-27
author:   Matt Karmazyn
categories: python
---
Using Python virualenv and virtualenvwrapper.

<!--break-->
We will first start with virtualenv, then talk about the better method (in my opinion) using virtualenvwrapper.

## Installation

    $ pip install virtualenv

## Basic Usage
Create a virtual environment for a project

    $ cd my_project_folder
    $ virtualenv dev

| This will create a new directory called dev in the current directory which contains the python executables. |

Use the -p flag to specify the version of python to use (with the path to the executable).

    $ virtualenv -p /usr/bin/python2.7 dev

To use the virtual environment we need to activate it

    $ source dev/bin/activate

You can now install packages as normal, but these packages will only be available within this virtualenv

    $ pip install boto

When you are done, you can deactivate the environment

    $ deactivate

To delete the virtual environment, simply delete the directory.

    $ rm -rf dev

## Other Usage
Create a file called requirements.txt containing the packages you've installed in the running virtualenv.

    $ pip freeze > requirements.txt

Install packages from an existing requirements.txt file.

    $ pip install requirements.txt

## virtualenvwrapper
[readthedocs](https://virtualenvwrapper.readthedocs.org/en/latest/)  
virtualenvwrapper makes working with virtual environments a bit easier by cutting out some commands, and keeping all of your virtualenvs in one place.

Install the virtualenvwrapper

    $ pip install virtualenvwrapper

Add these lines to your ~/.bash_profile or ~/.bashrc and source it.

    ...
    export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python
    export WORKON_HOME=~/envs
    [ -f /usr/local/bin/virtualenvwrapper.sh ] && source /usr/local/bin/virtualenvwrapper.sh
    ...

    $ source ~/.bash_profile

Make a new virtualenv (it will now be in your $WORKON_HOME)

    mkvirtualenv env1

Deactivating is the same

    (env1)
    $ deactivate

Work on a virtual environment

    $ workon env1

to delete a virtual environment

    $ rmvirtualenv env1

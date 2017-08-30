---
layout: post
title:  "Reset Windows Administrator Password"
date:   2017-08-30
created:   2017-08-30
author:   Matt Karmazyn
categories: windows password account
---
How to reset the Windows Administrator user password.

<!--break-->

1. Download Ubuntu https://www.ubuntu.com/download/desktop
2. Create a bootable usb drive
3. Insert the bootable Ubuntu in to the computer you want to reset Administrator.
4. Boot from the usb device.
5. Run Ubuntu Live (Trial)
6. Open the Ubuntu Software Center
 - Check the box: Community-maintained free and open-source software (universe)
7. Open a terminal
8. Update with this command:
 - `sudo apt-get update`
8. Install Chntpw with this command:
 - `sudo apt-get install chntpw`
9. locate the windows disk by running `lsblk`
 - It should be the device that matches your hard drive size.
 - In this example we'll use `/dev/sda2`
10. Create a directory to mount the disk in /media (or anywhere really)
 - `sudo mkdir /media/win`
10. Mount the drive to our new mount point
 - `sudo mount /dev/sda2 /media/win`
11. cd to the directory within our windows drive that contains the SAM file. (this may vary between systems, check yours)
 - `cd /media/win/Windows/System32/config`
12. Unlock and Reset the Administrator password using the chntpw utility.
 - `sudo chntpw -u Administrator SAM`
13. Follow the on-screen prompts as they may be updated from the time of writing this guide.
 - To unlock the account select: 2
 - Then reset (blank) the password select: 1
 - Press q to quit
 - When prompted press y to save the changes.
14. All done! Now you can restart the computer and log into the local Administrator account without a password.

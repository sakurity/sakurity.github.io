---
layout: post
title:  "RECONNECT - critical bug in websites with Facebook Login"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

![It has a logo. Deal with it.](/img/reconnect.png)

<a href="/reconnect">RECONNECT is a ready to use tool</a> to hijack accounts on websites with Facebook Login, for example Booking.com, Bit.ly, About.me, Stumbleupon, Angel.co, Mashable.com, Vimeo and many others. Feel free to copy and modify its source code. Facebook refused to fix this issue one year ago, unfortunately it's time to take it to the next level and give blackhats this simple tool. 

It simply relogins you into attacker's facebook account and connects attacker's facebook to your account. 

Step 1. We log user out of Facebook by loading `https://www.facebook.com/n/?mid=9dd1fd7G5af48de9ca58G0G86G119bb48c`.

Step 2. We need to log user into our account. Previously simple Referer-free request did the job, but it's been a while and Facebook made a (lame) attempt to fix it. They started checking `Origin` header is *.facebook.com for sign in attempts. 

We need to create a Canvas application with following settings.

![canvas settings](/img/307.png)

When the victim loads `https://apps.facebook.com/482922061740192` Facebook JS sends POST request to Secure Canvas URL, which must be https:// and not on `facebook.com`. So we are going to use special 307 redirect to redirect the victim to `https://www.facebook.com/login.php?email=attacker@email.com&pass=password`. Unlike 302, it preserves HTTP method and leads to POST request to login.php with our credentials and `Origin: https://apps.facebook.com`. So now the victim is logged in our facebook account. 

Step 3. We need to trigger Facebook Login process on the client website. Simple `<img src="https://victim.com/auth/facebook">` will work. In other words we turn this:

![before](/img/beforebooking.png)

into this

![before](/img/afterbooking.png)

Now our Facebook account is connected to the victim account on that website and we can log in that account directly to change email/password, cancel bookings, read private messages and so on.

This bug abuses triple-CSRFs at once: CSRF on logout, CSRF on login and CSRF on account connection. #1 and #2 can be fixed by Facebook, #3 must be fixed by website owners. But in theory all of these features must be protected from CSRF.

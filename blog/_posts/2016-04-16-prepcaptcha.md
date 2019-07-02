---
layout: post
title:  "PrepCAPTCHA, for bots and pentesters"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

<a href="https://homakov.blogspot.com/2014/12/the-no-captcha-problem.html">The iframe bug in No CAPTCHA</a> was fixed long time ago, and now reCAPTCHA 2.0 is pretty secure and widespread. Bypassing it also got a lot harder, now it requires many solutions in a row, making bruteforce infeasible.

But following neat trick will always be working even though it was <a href="https://homakov.blogspot.com/2013/05/the-recaptcha-problem.html">shown 3 years ago</a>.

Before visiting reCAPTCHA-protected victim page, we get victim's SITEKEY (client side API key for reCAPTCHA) and get challenges on our own. With bunch of prepared "solutions" (g-recaptcha-response values) that are good for ~130 seconds, it's much easier to:

* run a bot/script/parser/poster, and not mess with a headless browser like PhantomJS

* test a race condition for reCAPTCHA-protected endpoint

* buy high-demand tickets (like Burning Man or Machu Picchu) the second after they become available

<a href="https://github.com/sakurity/prepcaptcha">PrepCAPTCHA</a> is centralized Sinatra-based in-memory queue of valid reCAPTCHA solutions. Solving and using are now two separate processes:

1) Solvers need to run JS snippet in console of the victim's website (don't forget to set correct SITEKEY). Solutions are added to PrepCAPTCHA queue.

2) When your script stumbles upon a reCAPTCHA, it makes a GET request to PrepCAPTCHA.host/?sitekey=CURRENT_SITEKEY to get a valid g-recaptcha-response.

P.S. for large volumes consider making an extension or hacking existing one to abuse real users' cookies and get g-recaptcha-response-s on demand w/o any "solving" (1 click experience). 
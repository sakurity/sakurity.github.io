---
layout: post
title:  "How to Fix Authentication: Email as a Password Manager"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
public: false
---
<a href="https://medium.com/@lucas_gonze/history-of-email-only-auth-6b33b0065f74">UPDATE: Email-only auth from 2012. Some great links on the same idea.</a>

It's absolutely no news that passwords are broken because human beings physically cannot create and remember hundreds of unique passwords. 

All passwords managers have a market penetration rate of less than 1%, require you to install shady software on every device, and also cost $ sometimes. 

We want to propose dead simple and secure approach to authentication. <strong>Your email account is a password manager out-of-box</strong>. The idea is to remove passwords from classic authentication scheme and stick to email only: every time user wants to log in / sign up your app sends a link with one time password to their email:

| Someone is trying to log into your account from United States (123.123.123.123) using Chrome OS X. Click here to log in https://example.com/login?email=user@gmail.com&one_time_password=d6b7fd9c643s4d

1. No external apps / proprietary products.

2. No syncronization problems. It's always easier to log in your email account than install yet another app on your device.

3. Much simpler to implement for developers. 1 field for email, 1 for one_time_passwords. No salts, reset_tokens, anti-bruteforce stamps and counters.

4. No difference between signing up and signing in.

5. Better than Facebook Connect. <a href="https://sakurity.com/reconnect">Which is kinda very vulnerable.</a>

6. Just 1 click. 

7. Free.

8. No bruteforce by design.

9. You can keep link valid forever or few hours - browsers don't store redirecting URLs in history.

10. And no passwords. If your database is leaked no one blames you for poorly encrypted passwords.

Yes it's that simple. All you need is to have a unique password for your email account.

You can start using this scheme for any website right now! Everytime you sign up type a random sequence like "jiojqwojtwoqejqowe231423sadogfijirjwer" (no need to remember). Next time you want to log in use "Forgot my password" feature and set another random password to sign in. It's a little bit inconvenient but way more secure than what we have now.

Please share this article and your thoughts. "Create and remember unique password for every website" is the worst thing that happened with the Internet. If we can fix it so easily, let's try.

Q&A (to be continued from comments)

<strong>What if I lose access to my email or someone compromises it?</strong>

Classic password scheme is not any better and completely relies on your email account.
---
layout: post
title:  "Hacking Starbucks for unlimited coffee"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

This is a story about how I found a way to generate unlimited amount of money on Starbucks gift cards to get life-time supply of coffee or steal a couple of $millions.

So I got an idea to buy 3 Starbucks cards $5 each.

![](https://sakurity.com/img/sbcards.jpg)

starbucks.com has personal accounts where you can add gift cards, check balances and even transfer money between your gift cards.

There's an interesting class of vulnerabilities called <a href="https://en.wikipedia.org/wiki/Race_condition">"race condition"</a>. It's very common bug for websites with balances, vouchers or other limited resources (mostly money). 

So the transfer of money from card1 to card2 is stateful: first request POST /step1?amount=1&from=wallet1&to=wallet2 saves these values in the session and the second  POST/step2?confirm actually transfers the money and clears the session.

This makes the exploitation harder because the session gets destroyed right after first confirmation request and second one fails. But this "protection" is still easy to bypass: just use same account from two different browsers (with different session cookies).

Pseudo code for the exploit:
{%highlight ruby%}

# prepare transfer details in both sessions
curl starbucks/step1 -H «Cookie: session=session1» --data «amount=1&from=wallet1&to=wallet2»
curl starbucks/step1 -H «Cookie: session=session2» --data «amount=1&from=wallet1&to=wallet2»
# send $1 simultaneously from wallet1 to wallet2 using both sessions
curl starbucks/step2?confirm -H «Cookie: session=session1» & curl starbucks/step2?confirm -H «Cookie: session=session2» &
{%endhighlight%}

After 5 failed attempts I was about to give up. Race condition is a kind of a vulnerability when you never know if the app is vulnerable, you just need to try some more. Many developers use poor protections like limiting number of requests per IP/account/action, making a random delay or using DB transactions in a wrong way. The only right way to do it is a pessimistic lock (FOR UPDATE clause).

But yeah, the 6th request created two $5 transfers from wallet1 with 5 dollars balance. Now we have 2 cards with 15 and 5 (20 in total). Now we need a proof of concept, otherwise Starbucks guys can claim there's no bug or it might be some cache issue. 

Let's visit the nearest Starbucks at Market st.

- Can I have anything for $16?
- O_o
- What's most expensive thing here?
- That sandwich, I guess.

![](https://sakurity.com/img/sbstuff.jpg)

![](https://sakurity.com/img/sbcheck.jpg)

$15 in, $16.70 out. The concept is proven and now let's deposit $10 from our credit card to make sure the US justice system will not put us in jail over $1.70. 

The hardest part - responsible disclosure. Support guy honestly answered there's absolutely no way to get in touch with technical department and he's sorry I feel this way. Emailing InformationSecurityServices@starbucks.com on March 23 was futile (and it only was answered on Apr 29). After trying really hard to find anyone who cares, I managed to get this bug fixed in like 10 days.

The unpleasant part is a guy from Starbucks calling me with nothing like "thanks" but mentioning "fraud" and "malicious actions" instead. Sweet!

So what could I do to not feel like an idiot looking for troubles? I could create a simple bunch of fake gift cards bought around the world, silently generate credits on them and sell Starbucks credits online for Bitcoin with, say, 50% discount. It would easily make me a couple of millions of dollars unless Starbucks actually tracks gift card balances. I don't know for sure, it's just a wild guess that this bug could be pretty profitable.

---
layout: post
title:  "Progressive Hash - Solution to Simple Passwords"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
public: false
---

At its core, a password is a sequence of symbols that represent something meaningful. When you're creating a password you use something "on top of your head" e.g. "giraffe" then add some modifications that policies require "GiRaff33". Because many people think of same things, there's a high chance of collision: most people use a password somebody else used before. 

That's why to prevent cracking we use thousands of "stretching" rounds. Currently any password gets same amount of rounds, no matter "Password1" or "qY1OHdycEyxUQgoITC3iKg".

What I'm offering is a Progressive Hash (technically, regressing, but that's not catchy). Like with progressive tax, we need to hash passwords based on their complexity. 

Let's imagine an ephemeral list of top N passwords a sophisticated attacker would use to crack your encrypted drive / PGP key / Bitcoin wallet / password manager backup file etc.

Then we make a deterministic cross-platform function getRounds(password) that figures out approximate position of your password in that list and returns how many rounds it needs to be impossible to crack. The lower the position, the more rounds of stretching we need. 


MaxRounds = 100 000 000 (shouldn't take too long, 100 seconds max)

MinRounds = 100 000 (even for most complex passwords, takes less than a second)

Rounds = MaxRounds - Position * 10

return BaseRounds + ExtraRounds

zxcvbn by Dropbox is a good start (see demo below) however we can certainly make something more realistic.

## Bad UX, users don't like to wait

Depends on application, but you would only need it few times a day. 







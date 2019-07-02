---
layout: post
title:  'Why you need to hash reset_token like password'
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
public: false
---
<a href="https://slackhq.com/post/114696167740/march-2015-security-incident-and-launch-of-2fa">Slack was hacked</a>. Reading the thread on HN I decided to discuss why hashing <strong>only passwords</strong> is impractical if attackers get read access to your `users` table or entire database.

Because it's not the only way to hijack your account. <strong>reset_token, api_key</strong> and other kinds of tokens are usually stored in plain text and <strong>can be used as authentication credentials</strong> to set a new password or do something bad with account (transfer Bitcoins etc). 

Attackers can reset victim's password, fetch the reset_token value from database they have read access to and visit `example.com/users/password/edit?reset_password_token=VALUE_FROM_DB` to set a new password.

Forget about `User.find_by_token(token)`

Use following approach for all sign-in attempts, API requests, even for session cookies (if you store session_id in the database)

`type` = password, reset_token, api_key, access_token, session_id etc

`user_id` = 123, homakov or homakov@gmail.com

`value` = plain text value

1. find user by provided `user_id`
2. for `type=password` hash provided `value` with all the salt/pepper dance (read how to do it properly somewhere else). You need it to slow down dictionary/bruteforce attacks. For other random tokens `md5(token)` will be fine. <strong>Just don't store it in plain text</strong>
3. now compare it with `type`_hash column. As a bonus no need for constant time comparison - timing attack is mitigated by default.

Now even if your database is compromised you don't need to rotate api_keys and other tokens.

<strong>Quick update</strong> - actually I was very wrong. There is no way to tell if someone hashes tokens with blackbox because they could hash it before searching and there's also no need for user_id parameter.

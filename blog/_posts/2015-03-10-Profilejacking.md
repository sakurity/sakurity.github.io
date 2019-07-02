---
layout: post
title:  "ProfileJacking - legal tricks to detect user profile"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

ProfileJacking is a simple technology based on Clickjacking, or being more accurate, on Likejacking. The only difference is likejacking's goal is to increase number of likes, profilejacking's purpose is to reveal profile URLs of current visitors to send them personalized offers/messages.

The technique is neither innovative nor complex, I just had some code snippets and <a href="https://gist.github.com/homakov/feefc774fc40de98b452">I want to open-source them</a>. 

Many companies have widgets and those widgets are not supposed to have X-Frame-Options header. For Linkedin it uses "Follow this company" widget (it takes random companies with <10 followers, plenty of them). For Facebook it uses "comments widget" and tricks user into liking a comment (unlike regular Like button it won't be detected by anticlickjacking bots  nor visible in user activity feed). Google Plus and Disqus profiles also can be detected. For Tumblr you can use <a href="https://secure.assets.tumblr.com/assets/html/iframe/o.html?_v=3fe16cd6da2d3574b12c24a573ef1e33#src=http%3A%2F%2Fblog.mongodb.org%2F&lang=en_US&name=mongodb&avatar=http%3A%2F%2F33.media.tumblr.com%2Favatar_7d391eb913cd_64.png&title=The+MongoDB+Blog&url=http%3A%2F%2Fblog.mongodb.org%2F&page_slide=slide">"follow this blog" widget</a>.

Twitter's widgets always open a new window so there's nothing we can do. 

As soon as the victim clicks on the transparent widget, background process on the server side scrapes the last profile that followed our dummy user or liked our dummy comment, and passes the profile URL and first/last name to the client. The only disadvantadge is if you want to profilejack thousands of users, you need to create dozens of accounts and rotate them to not be banned. 

<script src="https://gist.github.com/homakov/feefc774fc40de98b452.js"></script>
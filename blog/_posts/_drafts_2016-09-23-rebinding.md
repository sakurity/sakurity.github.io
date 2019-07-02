---
layout: post
title:  "DNS Rebinding is a Hell of a Vulnerability"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---


Abstract

This is an incomplete post just for Euruko (<a href="/bind.key">slides</a>), it will be updated in a few days with my research on nature of DNS rebinding and long term protections we should implement.

## Update config.ru to protect your Rails/Rack application ASAP

{%highlight ruby%}
class DNSBinding
  VALID_HOSTS = %w{localhost:9292 myshop.dev:3000 myshopprod.com}
  def initialize(app)
    @app = app
  end
  def call(env)
    host = env['HTTP_HOST']
    if host && !VALID_HOSTS.include? host
      [403,{},["Invalid Host, DNS Rebinding detected"]]
    else
      @app.call(env)
    end
  end
end
use DNSBinding
run Rails.application
{%endhighlight%}




[Quick explanation on Wikipedia](https://en.wikipedia.org/wiki/DNS_rebinding)

[Webconsole RCE demo](https://benmmurphy.github.io/blog/2016/07/11/rails-webconsole-dns-rebinding/)

[On hacking local non-web apps](ttp://bouk.co/blog/hacking-developers/)

[How to get hacked for leaving REPL-in-the-browser in production](https://labs.detectify.com/2015/10/02/how-patreon-got-hacked-publicly-exposed-werkzeug-debugger/)



## Rebinding schemes

### Server to server

### Rebind to local address

### Rebind server to server to circumvent IP protection

tbc


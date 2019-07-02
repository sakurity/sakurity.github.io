---
layout: post
title:  "Your API Authentication is insecure, and we'll tell you why"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

3 days ago I reported <strong>Spree Commerce</strong> <a href="https://spreecommerce.com/blog/security-updates-2015-3-3">critical JSONP+CSRF vulnerability on all API endpoints</a>. Instagram API was <a href="https://insertco.in/2014/02/10/how-i-hacked-instagram/">vulnerable to CSRF</a>. Disqus, Stripe and Shopify APIs were <a href="https://homakov.blogspot.com/2013/02/are-you-sure-you-use-jsonp-properly.html">leaking private data via JSONP</a>. All that happened because they were not using <strong>Hybrid API Authentication</strong> properly. 

This post is a must read for every API developer. I will keep it short and concise though. Seriously, give your friends the link, because I'm going to explain essential basics of API Authentication and current state-of-the-art.

So, you have Application Program Interface that authenticates by `api_key`:

{%highlight ruby%}
def load_user
  @current_api_user = Spree.user_class.find_by(spree_api_key: api_key.to_s)
end
{%endhighlight%}

Then someone asks you to implement CORS because they want to use your API with JS:

{%highlight ruby%}
config.middleware.insert_before 0, "Rack::Cors" do
  allow do
    origins '*'
    resource '*', :headers => :any, :methods => [:get, :post, :options]
  end
end
{%endhighlight%}

And you obviously have `skip_before_action :verify_authenticity_token` in your ApiController. Why would you need CSRF verification for API requests coming from, say, your Android app?

Yet another customer asked for JSONP support because CORS is not supported in old browsers. Sure thing!

{%highlight ruby%}
after_filter  :set_jsonp_format
def set_jsonp_format
 if params[:callback] && request.get?
   self.response_body = "#{params[:callback]}(#{response.body})"
   headers["Content-Type"] = 'application/javascript'
 end
end
{%endhighlight%}

Everything is fine so far. But eventually your developers decide to follow the trend Backend-As-API and use your own api.example.com on the client side. There are two options: 

## Append api_token manually
For example Soundcloud sends `Authorization:OAuth 1-16343-15233329-796b6b695d2c7c1` header with every API request, Foursquare adds `oauth_token=YXIAC4Y254HGZBNPQW6S0UFBGGSU57RBP`.

<strong>Disadvantadge #1:</strong> XSS. OAuth tokens are accessible with Javascript and the attacker can leak victim's credentials. There's `HttpOnly` flag for cookies to prevent that. Nothing like that can be created for OAuth tokens.

<strong>Disadvantadge #2:</strong> For every request there will be an `OPTIONS` request, doubling the latency. By the way I wrote about <a href="https://homakov.blogspot.com/2014/01/how-to-use-cors-without-preflights.html">CORS without preflights</a> trick.

Despite some high profile use this approach I do not recommend it. 

## Authenticate the user by cookies

The fix is short and you are all set: `@current_api_user = (try_spree_current_user || Spree.user_class.find_by(spree_api_key: api_key.to_s))`. `try_spree_current_user` parses _spree_session cookie, extracts user_id and returns `User.find(session[:user_id])`. So what can be wrong with this line of code? 

Cookies is also a header like "Authorization", but very tricky to understand even for mature developers. I call it <strong>"sticky credentials"</strong>, because they are attached <strong>automatically</strong>, even to requests from 3rd party domains (evil.com).

The fact that absolute majority of web developers don't understand this simple concept made Cross Site Request Forgery the most wide spread security issue, and I'm not exaggerating. That's why every cookie-based authentication must be <strong>"double-authenticated"</strong> with extra csrf_token nonce. This nonce helps you to make sure the request comes from your domain.

1. Since you skipped CSRF protection for API requests, all your API endpoints are now vulnerable to request forgery. <a href='https://securecanvas.com/csrf.html#{"url":"https://majestic-stall-2602.spree.mx/api/users/1","autosubmit":false,"target":"_top","data":"utf8=%E2%9C%93&_method=put&user%5Bemail%5D=spree%40example.com1&user%5Bspree_role_ids%5D%5B%5D=&user%5Bpassword%5D=123123123&user%5Bpassword_confirmation%5D=123123123&button=&sbmbtn=&","method":"POST"}'>Example changing admin's password on Spree.</a>

2. JSONP leaks any GET response via cross-site with `<script src="https://api.example.com/orders.json?callback=leakMe"></script>`

3. CORS is even worse, because every kind of request is leaking.

## Doing it right: Hybrid API Authentication

{%highlight ruby%}
@current_api_user = unless api_key.to_s.empty?
  Spree.user_class.find_by(spree_api_key: api_key.to_s)
  # Good to go!
else
  # Everyone stand back, we are using cookies!
  # 1) verify CSRF token for all non-GET requests
  # 2) drop JSONP support
  # 3) drop CORS support
  try_spree_current_user
end
{%endhighlight%}

This Hybrid approach allows you to use your api.example.com with both frontend (JS/HTML app) and 3rd party application, keeps your credentials secure from XSS (HttpOnly) and doesn't generate pointless OPTIONS requests. This is state-of-the-art and if your approach is different, it's wrong.
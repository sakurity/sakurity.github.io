require './app.rb'

class DNSBinding
  VALID_HOSTS = %w{sakurity.com www.sakurity.com lh:4567}
  def initialize(app)
    @app = app
  end
  def call(env)
    host = env['HTTP_HOST']
    path = env['REQUEST_PATH']
    if VALID_HOSTS.include? host


      if env['REQUEST_PATH'] == "/deflatebomb"
        payload=File.open('pl').read
        [200,{"Content-Encoding"=>"deflate"},[payload]]
      elsif env['REQUEST_PATH'] == "/deflatebomb2"
        payload=File.open('pl2').read
        [200,{"Content-Encoding"=>"deflate","Content-Type"=>"text/html"},[payload]]
      elsif host == 'www.sakurity.com'
        [301, {'Location'=>"https://sakurity.com#{env['REQUEST_PATH']}", "cache-control" => 'max-age=3155760000'}, ['sakurity.com']]
      else
        @app.call(env)
      end
    else
      [403,{},["Invalid Host"]]
    end

  end
end
#use DNSBinding

run Sinatra::Application

zmq = require 'zmq'

main = () ->
	sock = zmq.socket 'sub'
	sock.identity = 'sub' + process.pid
	sock.bindSync 'tcp://127.0.0.1:9999'
	sock.on 'message', (args) ->
		console.dir args.toString()
	sock.subscribe 'AAPL'

	p = zmq.socket 'pub'
	sock.identity = 'pub' + process.pid
	p.connect 'tcp://127.0.0.1:9999'
	setTimeout () ->
		p.send 'AAPL 1234'
	, 100
main()
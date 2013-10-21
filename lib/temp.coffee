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

main2 = () =>
	sock = zmq.socket 'sub'
	sock.identity = 'sub' + process.pid
	sock.bindSync 'epgm://239.192.1.1:5555'
	sock.on 'message', (args) ->
		console.dir args.toString()
	sock.subscribe 'AAPL'

	p = zmq.socket 'pub'
	sock.identity = 'pub' + process.pid
	p.connect 'epgm://239.192.1.1:5555'
	setTimeout () ->
		p.send 'AAPL 1234'
	, 100

main2()
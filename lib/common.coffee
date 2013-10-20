crypto = require 'crypto'
os = require 'os'
zmq = require 'zmq'

exports.get_random = () ->
	crypto.randomBytes(20).toString('hex')

exports.list_local_ips = () ->
	ips = []
	for iface_name, addrs of os.networkInterfaces()
		continue if /VMware/.test iface_name
		ips.push a.address for a in addrs when not a.internal and a.family == 'IPv4'
	return ips

exports.get_local_endpoint = (sock) ->
	addr = sock.getsockopt zmq.ZMQ_LAST_ENDPOINT
	return addr if addr.indexOf('tcp://') != 0

	# resolve to a locally reachable IP if tcp://
	ip = this.list_local_ips()[0]
	return addr.replace /0\.0\.0\.0/, "#{ip}"

exports.get_port = (addr) ->
	m = addr.match /tcp:\/\/[\d.]+:(\d+)\/?/
	if m then Number(m[1]) else -1

exports.bindAndGetAddr = (sock_type, addr) ->
	sock = zmq.socket sock_type
	sock.bindSync addr
	addr = sock.getsockopt zmq.ZMQ_LAST_ENDPOINT
	port = exports.get_port addr
	return [sock, addr, port]


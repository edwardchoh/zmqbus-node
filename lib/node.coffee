zmq = require 'zmq'
async = require 'async'
EventEmitter = require('events').EventEmitter

election = require './election'
#discovery = require './discovery'
common = require './common'
log = require './log'

class Node extends EventEmitter
	constructor: (@service_name, @id) ->
		@id = common.get_random().substring(0, 6) if not @id

		# creates a forwarder device and advertises self
		@fwd = new Forwarder()

		[@control, @control_addr, @port] = common.bindAndGetAddr 'rep', 'tcp://*:*'
		@control.on 'message', this.on_control_message

		@peers = {}

		options =
			fwd_sub: @fwd.sub_port
			fwd_pub: @fwd.pub_port
			id: @id

		@browser = new discovery.Discovery @service_name
		@browser.advertise @port, options

		@browser.on 'serviceUp', this.on_serviceUp
		@browser.on 'serviceDown', this.on_serviceDown
		@browser.on 'serviceChanged', this.on_serviceChanged
		@browser.on 'error', (err) ->
			throw err

		# select my own forwarder initially
		this.add_own_forwarder()
		@selected_fwd_id = @id

	on_control_message: (args...) =>
		return @control.send [] if not args or args.length == 0
		switch args[0]
			when 'whoisforwarder'
				@control.send @selected_fwd_id

	add_own_forwarder: () ->
		psock = zmq.socket 'pub'
		ssock = zmq.socket 'sub'

		psock.connect "tcp://127.0.0.1:#{@fwd.sub_port}"
		ssock.connect "tcp://127.0.0.1:#{@fwd.pub_port}"
		@peers[@id] = {psock: psock, ssock: ssock, csock: null, id: @id}
		log.info @id, 'add local forwarder as peer'

	add_peer: (server) ->
		# must have txtRecord in advertisement
		try
			if not server.hasOwnProperty 'rawTxtRecord'
				log.info 'txtRecord missing from peer', server
				return

			if not server.hasOwnProperty 'addresses'
				log.info 'addresses missing from peer', server
				return

			server.txtRecord = server.rawTxtRecord.toString() if not 'txtRecord' of server

			{id: id, fwd_sub: fwd_sub, fwd_pub: fwd_pub} = server.txtRecord

			# reject if it's node's own advert or if fields aren't defined
			if not id or id == @id
				#log.info 'skipping own advertisement', @id, server.txtRecord
				return

			if id of @peers
				log.info 'peer id already found, ignoring', server.txtRecord
				return

			for addr in server.addresses
				psock = zmq.socket 'pub'
				ssock = zmq.socket 'sub'
				csock = zmq.socket 'req'

				psock.connect "tcp://#{addr}:#{fwd_sub}"
				ssock.connect "tcp://#{addr}:#{fwd_pub}"
				csock.connect "tcp://#{addr}:#{server.port}"
				@peers[id] = {psock: psock, ssock: ssock, csock: csock, id: id}
				log.info @id, 'add peer', id
		catch err
			log.info @id, 'error parsing server advert', err, server

	on_serviceUp: (server) =>
		this.add_peer server

	on_serviceDown: (server) =>
		#console.log 'down'
		#console.dir server

	on_serviceChanged: (server) =>
		#this.add_peer server

class Forwarder
	constructor: () ->
		@sub = zmq.socket 'sub'
		@pub = zmq.socket 'pub'
		@sub.bindSync "tcp://*:*"
		@pub.bindSync "tcp://*:*"

		@sub_addr = common.get_local_endpoint @sub
		@pub_addr = common.get_local_endpoint @pub

		@sub.subscribe ''
		@sub.on 'message', (msg...) =>
			@pub.send msg

class ElectedNode extends EventEmitter
	constructor: (@service_name = 'default', @options = {}) ->
		# creates a forwarder device and advertises the connection metadata
		@fwd = new Forwarder()
		@metadata = {sub_addr: @fwd.sub_addr, pub_addr: @fwd.pub_addr}

		@ready = false

		@elector = new election.Elector @metadata
		@elector.on 'ready', (addr) =>
			@elector.start()
		@elector.on 'error', (err) ->
			console.dir err
		@elector.on 'elected', (elect) =>
			#console.dir elect
			if elect.sub_addr != @metadata.sub_addr or elect.pub_addr != @metadata.pub_addr or not @ready
				# new forwarder was elected
				@metadata = elect
				#console.log 'connect new backend'
				this.connect_backend()

				if not @ready
					@ready = true
					this.emit 'ready'

	connect_backend: () ->
		# connect to new forwarder
		@pub_sock.close() if @pub_sock
		@sub_sock.close() if @sub_sock

		@pub_sock = zmq.socket 'pub'
		@pub_sock.connect @metadata.sub_addr

		@sub_sock = zmq.socket 'sub'
		@sub_sock.connect @metadata.pub_addr

		@sub_sock.subscribe ''

		@sub_sock.on 'message', (msg...) =>
			this.emit 'message', msg

	subscribe: (chan...) ->
		@sub_sock.subscribe chan

	unsubscribe: (chan...) ->
		@sub_sock.subscribe chan

	publish: (msg...) ->
		#console.log "publish #{msg}"
		@pub_sock.send msg

exports.Node = Node
exports.ElectedNode = ElectedNode

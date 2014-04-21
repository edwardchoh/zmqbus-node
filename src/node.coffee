zmq = require 'zmq'
async = require 'async'
EventEmitter = require('events').EventEmitter

election = require './election'
common = require './common'

class Forwarder
	constructor: () ->
		@sub = zmq.socket 'sub'
		@pub = zmq.socket 'pub'
		@sub.bindSync "tcp://0.0.0.0:*"
		@pub.bindSync "tcp://0.0.0.0:*"

		@sub_addr = common.get_local_endpoint @sub
		@pub_addr = common.get_local_endpoint @pub

		@sub.subscribe ''
		@sub.on 'message', (msg...) =>
			@pub.send msg

class ElectedNode extends EventEmitter
	constructor: (@options = {}) ->
		# creates a forwarder device and advertises the connection metadata
		@fwd = new Forwarder()
		@metadata = {sub_addr: @fwd.sub_addr, pub_addr: @fwd.pub_addr}

		@ready = false
		@subscriptions = []

		@elector = new election.Elector @options, @metadata
		@elector.on 'ready', (elector, addr) =>
			elector.start()
		@elector.on 'error', (err) =>
			this.emit 'error', err
		@elector.on 'elected', (elect) =>
			if elect.sub_addr != @metadata.sub_addr or elect.pub_addr != @metadata.pub_addr or not @ready
				# new forwarder was elected
				@metadata = elect
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

		@sub_sock.subscribe s for s in @subscriptions
		@sub_sock.on 'message', (msg...) =>
			this.emit 'message', msg

	subscribe: (chan...) ->
		for c in chan
			@sub_sock.subscribe c
			@subscriptions.push c if @subscriptions.indexOf(c) < 0
		return

	unsubscribe: (chan...) ->

		for c in chan
			@sub_sock.unsubscribe c
			idx = @subscriptions.indexOf c
			@subscriptions.splice idx, 1 if idx >= 0
		return

	publish: (msg...) ->
		@pub_sock.send msg

class PgmNode extends EventEmitter
	constructor: (@options = {}) ->
		@sub_sock = zmq.socket 'sub'
		@pub_sock = zmq.socket 'pub'

		if @options.type == 'epgm' then type = 'epgm' else type = 'pgm'
		url = "#{type}://#{@options.pgm_addr}:#{@options.pgm_port}"

		@sub_sock.connect url
		@pub_sock.bindSync url

		@sub_sock.subscribe ''

	subscribe: (chan...) ->
		@sub_sock.subscribe chan

	unsubscribe: (chan...) ->
		@sub_sock.unsubscribe chan

	publish: (msg...) ->
		@pub_sock.send msg

exports.ElectedNode = ElectedNode
exports.PgmNode = PgmNode
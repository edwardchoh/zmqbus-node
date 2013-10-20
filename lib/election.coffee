dgram = require 'dgram'
crypto = require 'crypto'
#common = require './common'
EventEmitter = require('events').EventEmitter

typeIsArray = Array.isArray || (value) -> return {}.toString.call(value) is '[object Array]'

class Elector extends EventEmitter
	constructor: (@metadata = {}, @mcast_addr = '255.255.255.255', @mcast_port = 45555) ->
		@id = crypto.randomBytes(6).toString('hex')
		@metadata.id = @id

		@elect_last = {id: ''}
		@election_in_progress = false
		@elect_state = 0
		@elect_timeout = 1000

		@last_hb_time = 0
		@hb_period = 1000
		@hb_timeout = 3000

		@sock = dgram.createSocket 'udp4'

		@sock.on 'error', (err) ->
			this.emit 'error', err
		@sock.on 'message', (msg, rinfo) =>
			try
				#this.emit 'message', JSON.parse(msg.toString()), rinfo
				this.process_msg JSON.parse(msg.toString()), rinfo
			catch e
				# ignore malformed JSON
				return

		@sock.bind @mcast_port, '0.0.0.0', () =>
			@sock.setBroadcast true
			@sock.addMembership @mcast_addr if @mcast_addr != '255.255.255.255'
			this.emit 'ready', (@sock.address())

	broadcast: (advert) ->
		msg = new Buffer JSON.stringify(advert)
		@sock.send msg, 0, msg.length, @mcast_port, @mcast_addr

	process_msg: (msg, rinfo) ->
		return if not typeIsArray msg or msg.length < 2
		switch msg[0]
			when 'hb'
				if @elect_last.id == msg[1]
					@last_hb_time = new Date().getTime()
				return
			when 'elect'
				return this.on_elect_msg msg.slice(1)
			else
				return
		this.emit 'message', msg, rinfo

	on_elect_msg: (msg) ->
		if msg[0] == 'start'
			# broadcast self as candidate
			@election_in_progress = true
			this.broadcast ['elect', 'candidate', @metadata, @elect_last]
		else if msg[0] == 'candidate' and @elector
			if msg[1].id < @elect_candidate.id
				@elect_candidate = msg[1]
			if not @elect_last.id
				@elect_last = msg[2]
			if msg[1].id == @elect_last.id
				@elect_last_seen = true
		else if msg[0] == 'winner'
			@elect_last = msg[1]
			@election_in_progress = false
			if @elect_last.id == @id
				clearInterval @hb_handle
				# this node got elected
				@hb_handle = setInterval () =>
					this.broadcast ['hb', @id]
				, @hb_period
			this.emit 'elected', @elect_last
		else if msg[0] == 'same'
			@election_in_progress = false

	start: () ->
		checkHeartbeat = () =>
			delta = new Date().getTime() - @last_hb_time
			if delta >= @hb_timeout
				# haven't heard from the elected, force an election
				#console.log "hb timeout #{delta}, forcing election"
				this.start_election()
		checkHeartbeat()
		setInterval checkHeartbeat, @hb_period

	start_election: () ->
		return if @election_in_progress

		this.broadcast ['elect', 'start']
		@elector = true
		@elect_candidate = @metadata
		@elect_last_seen = false
		setTimeout () =>
			if @elect_last.id != @elect_candidate.id and not @elect_last_seen
				this.broadcast ['elect', 'winner', @elect_candidate]
				@elect_last = @elect_candidate
			else
				this.broadcast ['elect', 'winner', @elect_last]
			@elector = false
		, @elect_timeout

exports.Elector = Elector

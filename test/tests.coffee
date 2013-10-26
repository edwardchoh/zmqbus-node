node = require '../lib/node'
election = require '../lib/election'
async = require 'async'
assert = require 'assert'
index = require '../lib/index'
util = require 'util'

main_test = (cb) ->
	console.log "main test"
	options =
		type: 'tcp'
		election_timeout: 500
	n1 = index.createNode(options)
	n1.on 'ready', () ->
		n1.subscribe 'chan1'
		setInterval () ->
			n1.publish "chan1", "msg#{process.pid}"
			n1.publish "chan2 you won't see this"
		, 1000
	n1.on 'message', (msg...) ->
		console.dir (m.toString() for m in msg)

	setTimeout () ->
		cb(null)
	, 5000

node_test = (cb) ->
	console.log "node test"
	n1 = new node.ElectedNode index.getOptions()
	n1.on 'ready', () ->
		#n1.subscribe 'chan1'
		setInterval () ->
			n1.publish 'chan1', "msg#{process.pid}"
		, 1000
	n1.on 'message', (msg...) ->
		console.dir (m.toString() for m in msg)

	setTimeout () ->
		cb(null)
	, 5000

election_test = (cb) ->
	console.log "election test"
	elector = new election.Elector index.getOptions(), {pid: process.pid}
	elector.on 'ready', (addr) ->
		console.log "starting id: #{elector.id}"
		elector.start()
	elector.on 'error', (err) ->
		console.dir err
	elector.on 'message', (msg, rinfo) ->
		console.dir msg
		#console.dir rinfo
	elector.on 'elected', (elect) ->
		console.log 'elected'
		console.dir elect

	setTimeout () ->
		cb(null)
	, 5000

election_priority_test = (cb) ->
	console.log "election priority test"
	e1 = new election.Elector index.getOptions(), {pid: process.pid}
	o2 = util._extend index.getOptions()
	o2.election_priority = 1
	e2 = new election.Elector o2, {pid: process.pid + 1}
	e3 = new election.Elector index.getOptions(), {pid: process.pid}
	for elector in [e1, e2, e3]
		elector.on 'ready', (elector, addr) ->
			console.log "starting id: #{elector.id}"
			elector.start()
		elector.on 'error', (err) ->
			console.dir err
		elector.on 'message', (msg, rinfo) ->
			console.dir msg
			#console.dir rinfo
		elector.on 'elected', (elect) ->
			console.log 'elected'
			console.dir elect

	setTimeout () ->
		console.log "stopping #{e1.id}"
		e1.stop()
		setTimeout () ->
			console.log "stopping #{e2.id}"
			e2.stop()
			setTimeout () ->
				cb(null)
			, 5000
		, 5000
	, 5000

async.series [
	election_priority_test
	main_test
	node_test
	election_test
], (res) ->
	assert(res == null)
	process.exit()
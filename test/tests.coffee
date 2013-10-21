node = require '../lib/node'
election = require '../lib/election'
async = require 'async'
assert = require 'assert'
index = require '../lib/index'

main_test = (cb) ->
	console.log "main test"
	options =
		type: 'tcp'
	n1 = index.createNode(options)
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

async.series [
	main_test
	node_test
	election_test
], (res) ->
	assert(res == null)
	process.exit()
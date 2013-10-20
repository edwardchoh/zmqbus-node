node = require './node'

exports.start = (service) ->
	n1 = new node.Node service
	n1.on 'message', () ->
		console.dir n1.id, arguments

exports.start 'test'
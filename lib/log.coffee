winston = require 'winston'

###
Example:
	log.log 'info', 'Hello'
	log.info 'Hello', { json: 'ok' }
	log.warn 'test message %s', 'embedded string'
###

logger = new winston.Logger
	transports: [
		new winston.transports.Console
			json: false
			timestamp: true
		new winston.transports.File
			filename: __dirname + '/debug.log'
			json: false
	]
	exceptionHandlers: [
		new winston.transports.Console
			json: false
			timestamp: true
		new winston.transports.File
			filename: __dirname + '/exceptions.log'
			json: false
	],
	exitOnError: false

module.exports = logger
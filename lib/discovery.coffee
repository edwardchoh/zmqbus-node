mdns = require 'mdns'
log = require './log'
EventEmitter = require('events').EventEmitter

class Discovery extends EventEmitter
	constructor: (@service) ->
		@service_type = mdns.tcp(@service)
		@browser = mdns.createBrowser @service_type
		@browser.on 'serviceUp', (service) =>
			this.emit 'serviceUp', service
		@browser.on 'serviceDown', (service) =>
			this.emit 'serviceDown', service
		@browser.on 'serviceChanged', (service) =>
			this.emit 'serviceChanged', service
		@browser.on 'error', (err) ->
			log.error 'mdns browser error', err
		@browser.start()

	advertise: (port, options) ->
		ad = mdns.createAdvertisement @service_type, port, if options then {txtRecord: options} else null
		ad.start()

class FakeDiscovery extends EventEmitter
	constructor: (@service) ->

	advertise: (port, options) ->
		this.emit 'serviceUp', {service: @service, port: port, options: options}

exports.Discovery = Discovery
exports.FakeDiscovery = FakeDiscovery
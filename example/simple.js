var zmqbus = require('../lib/index.js');

msgbus = zmqbus.createNode();
msgbus.on('ready', function() {
	// subscribe to stock channel
	msgbus.subscribe("stock");
	setInterval(fakeQuote, 1000);
});

msgbus.on('message', function(channel, symbol, quote) {
	console.log("received " + channel + ": " + symbol + " " + quote);
});

function fakeQuote() {
	// broadcast some fake stock quotes
	var stocks = ['AAPL', 'GOOG', 'IBM', 'FB'];
	var symbol = stocks[Math.floor(Math.random() * stocks.length)];
	var quote = Math.random() * 100.0 + 25.0;
	msgbus.publish('stock', symbol, quote);
}
var zmqbus = require('../lib/index.js');

/* simple quote sender/reader.
   Run multiple processes to send/receive cluster-wide.
*/

msgbus = zmqbus.createNode();
msgbus.on('ready', function() {
	// subscribe to equity channel
	msgbus.subscribe("equity");
	setInterval(fakeEquityQuote, 1000);

	// uncomment the following to receive temperature readings
	// msgbus.subscribe("temp")
	setInterval(fakeTemperatureQuote, 2000);
});

msgbus.on('message', function(msg) {
	console.log("received " + msg);
});

function fakeEquityQuote() {
	// broadcast some fake stock quotes
	var stocks = ['AAPL', 'GOOG', 'IBM', 'FB'];
	var symbol = stocks[Math.floor(Math.random() * stocks.length)];
	var quote = (Math.random() * 100.0 + 25.0).toFixed(2);
	msgbus.publish('equity', symbol, quote);
}

function fakeTemperatureQuote() {
	// broadcast some fake stock quotes
	var cities = ['New York, NY', 'San Francisco, CA', 'Chicago, IL'];
	var city = cities[Math.floor(Math.random() * cities.length)];
	var quote = (Math.random() * 50.0 + 30.0).toFixed(2);
	msgbus.publish('temp', city, quote);
}
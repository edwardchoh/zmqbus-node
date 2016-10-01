var child_process = require('child_process')
  , fs = require('fs')
  , util = require("util")
  , production = (process.env.NODE_ENV === 'test')
  , reporter
  , mocha
  , env
  ;

env = Object.assign({}, process.env );
env.MOCHA_COLORS = 1;
reporter = process.stdout;

if( production ){
    reporter = fs.createWriteStream('tap.xml',{
        flags:'w'
        ,encoding:'utf8'
    });
}

mocha = child_process.spawn("mocha", [
    "--growl"
    , "--recursive"
    , util.format("--reporter=%s", production ? 'xunit':'spec')
    , 'test/*.spec.js'
],{env:env})

mocha.on('exit', function( code ){
    process.exit( code );
})

mocha.stdout.pipe( reporter );
mocha.stderr.pipe( reporter );

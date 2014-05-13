/*
* index.js :: Top-level include
*
*/

var pipeline = module.exports = require('./pipeline');

pipeline.analyze  = require('./analyze');
pipeline.traverse = require('./traverse');
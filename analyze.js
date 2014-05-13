/*
* analyze.js :: walk the AST
*
*/

var analyze = module.exports = function analyze(ast, callback) {
  var stats = {}; //1
  stats.counter = 0;

  walk(ast, function(node) {
    if (node.name === 'require') {
      console.log("something was required");
      stats.counter++;
    } else {
      // console.log("someting else");
    }
  });
  processResults(stats);
  callback(null, ast);
}

// recursive func for traversing tree
function walk(node, func) {
  func(node);
  for (var key in node) {
    if (node.hasOwnProperty(key)) {
      var child = node[key];
      if (typeof child === 'object' && child !== null) {
        if (Array.isArray(child)) {
          child.forEach(function(node) {
            walk(node, func);
          });
        } else {
          walk(child, func);
        }
      }
    }
  }
}

function processResults(results) {
  console.log(results);
}


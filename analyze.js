/*
* analyze.js :: walk the AST
*
*/

var _ = require('lodash'),
    objs = require('objs'),
    Walker = require('node-source-walk');

//
// ### function analyze (files)
// Takes set of files to analyze through.
//
// REMARK (indexzero): I think we are going to have to do
// multiple "mark and sweeps" on these ASTs as we learn
// anything that could be at the LHS of an assignment.
//
var analyze = module.exports = function analyze(files, mod) {
  //
  // 1. Get all require statements from all known files.
  // 2. Set the Object paths for all unique requires
  //
  var requires = flattenFiles(analyze.directory(files, function (ast) {
    return analyze.onlyRequiredAs(ast, mod);
  }))
  .map(function (decl) {
    decl.path = decl.filename.split('/');
    return decl;
  })


  //
  // 3. Perform "mark and sweeps" until we no longer have
  // any more statements where any of our tokens are on the
  // RHS of any assignment statement
  //
  return analyze.tokens(requires, files);
};

//
// ### function tokens (tokens, files)
// Analyzes a set of "VariableDeclarator" or "AssignmentExpression"
// tokens which have the minimum form of
//
//     {
//       raw: { type: 'VariableDeclarator', id: [Object], init: [Object] },
//       filename: 'builder.js',
//       path: [ 'builder.js' ] }
//     }
//
analyze.tokens = function (tokens, files) {
  var results = {
    calls: {}
  };

  tokens.forEach(function (tok) {
    var ast  = objs.path(files, tok.path),
        walk = new Walker();

    walk.traverse(ast, function (node) {
      var callee = node.callee,
          target;

      //
      // (i) Bread and butter function CallExpression
      //
      if (node.type === 'CallExpression' && callee) {
        if (callee.type === 'MemberExpression'
            && callee.object && callee.object.type === 'Identifier'
            && callee.object.name === tok.name) {
          target = callee.property.name;
          results.calls[target] = results.calls[target] || 0;
          results.calls[target]++;
        }
      }
      //
      // (ii) TODO: Check for places where this token is an argument
      // to another CallExpression (e.g. async.apply(async.waterfall, [fn,fn]))).
      //
      // (iii) TODO: Check for all AssignmentExpressions where this token is
      // the RHS of the assignment so that we may expand our search.
      //
      // (iv) TODO: Check for all NewExpressions where this token (or subtoken)
      // is being instantiated so that we may expand our search.
      //
    });
  });

  return results;
};

//
// ### function directory (files, fn)
// Analyzes the ASTs for the `files` by running the specified
// fn on them for each file.
//
analyze.directory = function (files, fn) {
  return Object.keys(files)
    .reduce(function (all, name) {
      if (files[name].type) {
        //
        // If it has a type property then it is an individual
        // AST for a file. Analyze it as such.
        //
        all[name] = fn(files[name]);
      }
      else {
        all[name] = analyze.directory(files[name], fn);
      }

      return all;
    }, {});
};

//
// ### function requiredAs (ast)
// Get the names and paths of modules required in a given javascript module
// Attribution: https://github.com/robert-chiniquy/required-as
//
analyze.requiredAs = function (ast) {
  return _.flatten(ast.body.filter(function (what) {
    return what.type === 'VariableDeclaration';
  }).map(function(decl) {
    return decl.declarations.filter(function (decl) {
      return decl.id
        && decl.id.name
        && decl.init
        && decl.init.callee
        && decl.init.callee.name === 'require';
    }).map(function(decl) {
      return { name: decl.id.name, source: decl.init.arguments[0].value };
    });
  }));
};

//
// ### function onlyRequiredAs(ast, name)
// Gets the variable declarations only required as `name`
//
analyze.onlyRequiredAs = function (ast, name) {
  return _.flatten(ast.body.filter(function (what) {
    return what.type === 'VariableDeclaration';
  }).map(function(decl) {
    return decl.declarations.filter(function (decl) {
      return decl.id
        && decl.id.name
        && decl.init
        && decl.init.callee
        && decl.init.callee.name === 'require'
        && decl.init.arguments[0].value === name;
    }).map(function(decl) {
      return { name: decl.id.name, source: decl.init.arguments[0].value, raw: decl };
    });
  }));
};

//
// ### function flattenFiles (obj, filename, memo)
// Flattens an object which only has Array keys and is
// assumed to be a set of AST files.
//
function flattenFiles(obj, filename, memo) {
  filename = filename || '';
  memo     = memo     || [];

  if (Array.isArray(obj)) {
    if (obj.length) {
      memo.push.apply(memo, obj.map(function (o) {
        o.filename = filename;
        return o;
      }));
    }

    return memo;
  }

  return Object.keys(obj)
    .reduce(function (all, key) {
      var full = filename ? filename + '/' + key : key,
          sub  = flattenFiles(obj[key], full, []);
      if (sub.length) {
        all.push.apply(all, sub);
      }

      return all;
    }, memo);
}
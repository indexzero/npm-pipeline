/*
 * traverse.js :: recursively traverse the lib folder and return an object
 * containing the AST
 *
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    esprima = require('esprima');

//
// I'm glad most of this code was written before
//
var traverse = module.exports = function traverse(dir, mem, callback) {
 if (!callback && typeof mem === 'function') {
    callback = mem;
    mem = null;
  };

  var base;
  if (mem) {
    base = path.basename(dir);
  }
  else {
    mem = mem || {};
  }

  //
  // ### function recurse (dir, files)
  // Performs most of the recursive traversion
  //
  function recurse(dir, files) {
    async.reduce(
      files, mem,
      function (memo, file, next) {
        var fullpath = path.join(dir, file);
        fs.stat(fullpath, function (err, stat) {
          if (err) {
            return err.code !== 'ENOENT' && err.code !== 'EACCES'
              ? next(err)
              : next();
          }

          if (base) {
            mem[base] = mem[base] || {};
            if (stat.isDirectory()) {
              return traverse(fullpath, mem[base], function (err, subtree) {
                return next(null, mem);
              });
            }
            else if (path.extname(fullpath) === '.js') {
              return traverse.parse(fullpath, function (err, ast) {
                mem[base][file] = ast;
                return next(null, mem);
              });
            }
          }
          else {
            if (stat.isDirectory()) {
              mem[file] = {};
              return traverse(fullpath, mem, function (err, subtree) {
                return next(null, mem);
              });
            }
            else if (path.extname(fullpath) === '.js') {
              return traverse.parse(fullpath, function (err, ast) {
                mem[file] = ast;
                return next(null, mem);
              });
            }
          }

          next(null, mem);
        });
      },
      function (err, result) {
        return err
          ? callback(err)
          : callback(null, result)
      }
    )
  }

  fs.stat(dir, function (err, stat) {
    if (err) {
      return err.code !== 'ENOENT' && err.code !== 'EACCES'
        ? callback(err)
        : callback();
    }

    if (stat.isDirectory()) {
      return fs.readdir(dir, function (err, files) {
        return !err
          ? recurse(dir, files)
          : callback(err);
      });
    }

    traverse.parse(dir, callback);
  })
};

traverse.parse = function (filePath, callback) {
  return fs.readFile(filePath, 'utf8', function (err, contents) {
    if (err) {
      return err.code !== 'ENOENT' && err.code !== 'EACCES'
        ? callback(err)
        : callback();
    }

    var ast;
    try {
      ast = esprima.parse(contents);
    }
    catch (ex) {
      //
      // Suppress errors.
      //
      ast = {};
    }

    callback(null, ast);
  });
};

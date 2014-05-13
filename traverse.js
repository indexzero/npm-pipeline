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

  fs.readdir(dir, function (err, files) {
    if (err) {
      return callback(err);
    }

    files = files.filter(function (file) {
      return /.js$/.test(file);
    });

    async.reduce(
      files,
      mem,
      function (memo, file, next) {
        var fullpath = path.join(dir, file);
        fs.stat(fullpath, function (err, stat) {
          if (err) {
            return err.code !== 'ENOENT'
              ? next(err)
              : next();
          }

          if (base) {
            mem[base] = mem[base] || {};

            if (stat.isDirectory()) {
              return reduceDir(fullpath, mem[base], function (err, subtree) {
                return next(null, mem);
              });
            }
            else {
              return traverse.parse(fullpath, function (err, ast) {
                mem[base][file] = ast;
                return next(null, mem);
              });
            }
          }
          else {
            if (stat.isDirectory()) {
              mem[file] = {};
              return reduceDir(fullpath, mem[file], function (err, subtree) {
                return next(null, mem);
              });
            }
            else {
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
  });

};

traverse.parse = function (filePath, callback) {
  return fs.readFile(filePath, 'utf8', function (err, contents) {
    if (err) {
      return callback(err);
    }
    var ast = esprima.parse(contents);
    callback(null, JSON.stringify(ast));
  });
};

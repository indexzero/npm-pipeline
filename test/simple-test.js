var test = require('tap').test,
    fs = require('fs'),
    path = require('path'),
    pipeline = require('../pipeline'),
    analyze = require('../analyze');

test('When static-analyzing module-smith for `async`', function (t) {
  t.plan(5);
  pipeline('module-smith', function (err, files) {
    if (err) return t.fail(err.message);
    t.ok(files, 'Resolved an AST files object for module-smith');

    fs.writeFile(path.join(__dirname, 'module-smith.json'), JSON.stringify(files, null, 2), function (err) {
      if (err) return t.fail(err.message);
      t.ok(true, 'Successfully written file of module-smith');
    });

    var results;
    try {
      results = analyze(files, 'async');
      t.equal(results.calls.waterfall, 4);
      t.equal(results.calls.parallel, 2);
      t.equal(results.calls.apply, 2);
    }
    catch (ex) {
      return t.fail(ex.message)
    }
  });
});

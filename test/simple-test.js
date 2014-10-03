var test = require('tap').test,
    fs = require('fs'),
    path = require('path'),
    pipeline = require('../lib/pipeline');

test('When preparing for static analysis for module-smith', function (t) {
  t.plan(3);
  pipeline('module-smith', function (err, files) {
    if (err) return t.fail(err.message);
    t.ok(files, 'Resolved an AST files object for module-smith');

    fs.writeFile(path.join(__dirname, 'module-smith.json'), JSON.stringify(files, null, 2), function (err) {
      if (err) return t.fail(err.message);
      t.ok(true, 'Successfully written file of module-smith');
    });

    try {
      t.type(files.lib['builder.js'], 'object', 'should parse builder.js using esprima');
    }
    catch (ex) {
      return t.fail(ex.message)
    }
  });
});

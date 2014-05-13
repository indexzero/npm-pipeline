var test = require('tap').test,
    fs = require('fs'),
    path = require('path'),
    pipeline = require('../pipeline');

test('Do we work', function (t) {
  t.plan(2);
  pipeline('winston', function (err, ast) {
    if (err) return t.fail(err.message);
    t.ok(ast, 'Resolved an AST object for winston');
    fs.writeFile(path.join(__dirname, 'winston.json'), JSON.stringify(ast, null, 2), function (err) {
      if (err) return t.fail(err.message);
      t.ok(true, 'Successfully written file of winston');
    });
  });
});

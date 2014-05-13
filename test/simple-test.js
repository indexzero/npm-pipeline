var test = require('tap').test,
    pipeline = require('../pipeline');

test('Do we work', function (t) {
  t.plan(1);
  pipeline('winston', function (err) {
    if (err) return t.fail(err.message);
    t.ok(!err, 'no error');
  });
});

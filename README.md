# npm-pipeline

An analysis pipeline for npm packages. Get your `npm` packages hot of the registry downloaded, unpacked, and (if desired) read and parsed with `esprima`

### Usage

``` js

var pipeline = require('npm-pipeline');

pipeline('package-name', function (err, files) {
  //
  // The "files" array here will be a hierarchical object
  // containing all files read off of disk. If the file is
  // a Javascript file then it will be preparsed by `esprima`.
  //
});
```

### Tests

Tests are written in `tap`:

```
npm test
```

### License: Apache 2
### Author: [Charlie Robbins](https://github.com/indexzero)


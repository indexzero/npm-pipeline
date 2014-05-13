/*
 * pipeline.js :: Fetch a package and untar it into a directory
 *
 */

var path = require('path'),
    fs = require('fs'),
    crypto = require('crypto'),
    url = require('url'),
    zlib = require('zlib'),
    tar = require('tar-fs'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    http = require('http-https'),
    parse = require('parse-json-response');

//
// TODO: Maybe give this a package.json rather than just a name so we can do
// the more complex fetching
//
var Pipeline = module.exports = function (options, callback) {
  if (!(this instanceof Pipeline)) { return new Pipeline(options, callback) }
  options = options || {};

  this.name = typeof options === 'string'
    ? options
    : options.name;

  this._callback = callback && typeof callback == 'function'
    ? callback
    : undefined;

  if (!this.name || !this._callback) {
    throw new Error('Must provide a name and a callback');
  }

  this.returned = false;

  this.rootDir = path.join(__dirname, 'tmp');
  this.moduleDir = path.join(this.rootDir, this.name);
  this.registry = options.registry || 'https://registry.nodejitsu.com';

  this.fetch();
};

//
// Fetch the JSON from the registry and
//
Pipeline.prototype.fetch = function () {
  var opts = url.parse(this.registry + '/' + this.name),
      req;

  opts.method = 'GET';
  opts.agent = false;
  opts.headers = {
    'content-type': 'application/json',
    'connection': 'close'
  };

  req = http.request(opts);
  req.on('error', this._callback);
  req.on('response', parse(this._onFetch.bind(this)));
  req.end();
};

Pipeline.prototype._onFetch = function (err, data, res) {
  if (err) { return this._onError(err) }

  var latest = data['dist-tags'] && data['dist-tags'].latest,
      tarUrl = latest && data.versions[latest].dist.tarball;

  if(!latest) { return this._onError(new Error('No latest tag wtf?')) }

  //
  // Maybe we care about this later
  //
  this.doc = data;
  mkdirp(this.moduleDir, function (err) {
    if (err) {
      return this._onError(err);
    }
    this.fetchAtt(latest, tarUrl);
  }.bind(this));

};

Pipeline.prototype.fetchAtt = function (latest, tarUrl) {
  var opts = url.parse(tarUrl),
      req;

  opts.method = 'GET';
  opts.agent = false;
  opts.headers = {
    'connection': 'close'
  };

  req = http.request(opts);
  req.on('error', this._onError.bind(this));
  req.on('response', this._onAttRes.bind(this, latest));
  req.end();

};
//
// Take the tarball, validate it, and save it to the filesystem
//
Pipeline.prototype._onAttRes = function (latest, res) {
  if (res.statusCode != 200) {
    return this._onError(new Error('Bad status code when fetching attachment ' + res.statusCode));
  }

  var vDoc = this.doc.versions[latest],
      sum = vDoc.dist.shasum,
      fileName = this.doc.name + '-' + latest + '.tgz',
      file = path.join(this.moduleDir, fileName),
      fileStream = fs.createWriteStream(file),
      sha = crypto.createHash('sha1'),
      shaOk = false,
      errState = null;

  sha.on('data', function (data) {
    data = data.toString('hex');
    if (data === sum) {
      shaOk = true;
    }
  });

  fileStream.on('error', function (err) {
    errState = err;
    this._onError(err);
  }.bind(this));

  res.pipe(sha);
  res.pipe(fileStream);

  fileStream.on('close', function () {
    if (errState || !shaOk) {
      return this._onError(errState || new Error('Bad tarball'));
    }

    this.extract(file, fileName);
  }.bind(this));

};

Pipeline.prototype.extract = function (file, filename) {
  var dir = path.join(this.moduleDir,  filename.replace(/.tgz$/, ''));

  fs.createReadStream(file)
    .on('error', this._onError.bind(this))
    .pipe(zlib.Gunzip())
    .on('error', this._onError.bind(this))
    .pipe(tar.extract(dir))
    .on('error', this._onError.bind(this))
    .on('finish', this.readDir.bind(this, path.join(dir, 'package')));

};

//
// TODO: This is where we start traversal like things on the AST
//
Pipeline.prototype.readDir = function (dir) {
  fs.readdir(dir, function (err, files) {
    if (err) {
      return this._onError(err);
    }

    this._callback(null, files);
  }.bind(this));
};

//
// Just return the error to the callback for the time being
//
Pipeline.prototype._onError = function (err) {
  if (!this.returned) {
    this.returned = true;
    return this._callback(err);
  }
}

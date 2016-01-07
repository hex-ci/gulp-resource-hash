'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var gutil = require('gulp-util');
var through = require('through2');
var url = require('url');
var hashCache = {};

function sha1(filePath) {
	if (!hashCache[filePath]) {
		hashCache[filePath] = crypto.createHash('md5')
			.update(fs.readFileSync(filePath))
			.digest('hex').slice(-7);
	}

	return hashCache[filePath];
}

function buildMD5File(src) {
	var md5 = sha1(src),
		destFullPath = path.join(path.dirname(src), path.basename(src).replace(/\.[^\.]+$/, function(ext){
			return '_' + md5 + ext;
		}));

	if(!fs.existsSync(destFullPath)){
		fs.writeFileSync(destFullPath, fs.readFileSync(src));
	}

	return path.basename(destFullPath);
}

module.exports = function (options) {
	options = options || {};
	var contents, mainPath, extname, reg, regCss, asset, md5BuildAsset, urlParamName;

	asset = options.asset || process.cwd();

	urlParamName = options.urlParamName ? options.urlParamName : 'v';

	md5BuildAsset = options.md5BuildAsset;

	reg = new RegExp('["\'\\(]\\s*([\\w\\_\/\\.\\-]*\\.(' + (options.exts ? options.exts.join('|') : 'jpg|jpeg|png|gif|cur|js|css') + '))([^\\)"\']*)\\s*[\\)"\']', 'gim');
	regCss = /url\(['"]?(.+?)['"]?\)/ig;

	return through.obj(function (file, enc, callback) {
		if (file.isNull()) {
			this.push(file);
			return callback();
		}

		if (file.isStream()) {
			this.emit('error', new gutil.PluginError('gulp-resource-hash', 'Streams are not supported!'));
			return callback();
		}

		mainPath = path.dirname(file.path);
		extname = path.extname(file.path);

		contents = file.contents.toString();

		if (extname == '.css') {
			contents = contents.replace(regCss, function (content, filePath) {
				var result;

				var newFilePath = filePath.replace(/\?[\s\S]*$/, "").trim();
				newFilePath = newFilePath.replace(/['"]*/g, "");
				newFilePath = newFilePath.replace(/#[\s\S]*$/, '');

	            if (newFilePath.indexOf("base64,") > -1 || newFilePath.indexOf("about:blank") > -1 || newFilePath.indexOf("http://") > -1 || newFilePath === '/') {
	                return content;
	            }

				//use md5
				var fullPath;
				if (/^\//.test(newFilePath)) {
					fullPath = path.resolve('../', asset, newFilePath.slice(1));
				}
				else {
	                fullPath = path.resolve('../', mainPath, newFilePath);
				}

				if (fs.existsSync(fullPath)) {
					//gutil.log('replacing image ' + newFilePath + ' version in css file: ' + file.path);

					if (md5BuildAsset) {
						fullPath = path.join(md5BuildAsset, path.relative(asset, fullPath));

						return content.replace(path.basename(newFilePath), buildMD5File(fullPath));
					}
					else {
						var hashURL = url.parse(filePath, true);
						var hash = '';
						hashURL.search = '';
						hashURL.query[urlParamName] = sha1(fullPath);

						if (hashURL.hash) {
							hash = hashURL.hash;
							hashURL.hash = '';
						}

						if (options.transformPath) {
                            result = options.transformPath(hashURL.pathname, hashURL, fullPath, filePath);
							if (typeof result === 'string') {
								hashURL.pathname = result;
							}
							else if (typeof result === 'object') {
								hashURL = result;
							}
                        }

						return content.replace(filePath, url.format(hashURL) + (options.isAdditionExt ? path.extname(newFilePath) : '') + hash);
					}
				}
				else {
					return content;
				}
			});
		}
		else {
			contents = contents.replace(reg, function (content, filePath, ext, other) {
				var fullPath;
				var result;

				if (/^\//.test(filePath)) {
					fullPath = path.resolve(asset, filePath.slice(1));
				} else {
					fullPath = path.resolve(mainPath, filePath);
				}

				if (fs.existsSync(fullPath)) {
					if (md5BuildAsset) {

						fullPath = path.join(md5BuildAsset, path.relative(asset, fullPath));

						return content.replace(path.basename(filePath), buildMD5File(fullPath));
					} else {
						var hashURL = url.parse(filePath + other, true);

						hashURL.search = '';
						hashURL.query[urlParamName] = sha1(fullPath);

						if (options.transformPath) {
                            result = options.transformPath(hashURL.pathname, hashURL, fullPath, filePath);
							if (typeof result === 'string') {
								hashURL.pathname = result;
							}
							else if (typeof result === 'object') {
								hashURL = result;
							}
                        }

						return content.replace(other, '').replace(filePath, url.format(hashURL) + (options.isAdditionExt ? '.' + ext : ''));
					}
				} else {
					return content;
				}
			});
		}

		file.contents = new Buffer(contents);

		this.push(file);

		return callback();
	});
};
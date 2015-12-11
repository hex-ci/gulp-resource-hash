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
			this.emit('error', new gutil.PluginError('gulp-static-hash', 'Streams are not supported!'));
			return callback();
		}

		mainPath = path.dirname(file.path);
		extname = path.extname(file.path);

		contents = file.contents.toString();

		if (extname == '.css') {
			contents = contents.replace(regCss, function (content, filePath) {
				filePath = filePath.replace(/\?[\s\S]*$/, "").trim();
	            filePath = filePath.replace(/['"]*/g, "");

	            if (filePath.indexOf("base64,") > -1 || filePath.indexOf("about:blank") > -1 || filePath.indexOf("http://") > -1 || filePath === '/') {
	                return content;
	            }

				//use md5
	            var safeUrl = filePath.replace(/#[\s\S]*$/, '');
				var fullPath;
				if (/^\//.test(filePath)) {
					fullPath = path.resolve(asset, filePath.slice(1));
				}
				else {
	                fullPath = path.resolve(path.dirname(file.path), safeUrl);
				}

				if (fs.existsSync(fullPath)) {
					gutil.log('replacing image ' + filePath + ' version in css file: ' + file.path);

					if (md5BuildAsset) {

						fullPath = path.join(md5BuildAsset, path.relative(asset, fullPath));

						return content.replace(path.basename(filePath), buildMD5File(fullPath));
					}
					else {
						var hashURL = url.parse(filePath, true);
						hashURL.search = '';
						hashURL.query[urlParamName] = sha1(fullPath);

						return content.replace(filePath, url.format(hashURL) + (options.isAdditionExt ? path.extname(filePath) : ''));
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

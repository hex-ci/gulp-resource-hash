gulp-resource-hash
==================

> A gulp plugin for cache files by adding a hash version append their name(like a.js?v=hash).

## Install

```
npm install --save-dev gulp-resource-hash
```


## Examples

### Default

```js
var gulp = require('gulp');
var staticHash = require('gulp-resource-hash');

gulp.task('resource-hash-html', function () {
	gulp.src('static/**/*.html')
		.pipe(staticHash({asset: 'static'}))
		.pipe(gulp.dest('dest'));
});
```

#### Input:

```html
<link rel="stylesheet" href="main.min.css">
<script src="main.min.js"></script>
<img src="main.png" />
```

#### Output:

```html
<link rel="stylesheet" href="main.min.css?v=8501b2b">
<script src="main.min.js?v=8501b2b"></script>
<img src="main.png?v=8501b2b" />
```

### Options

##### asset: 'static'

The path to assets in your project

##### exts: ['js', 'css', 'png']

The extension list need add hash version

##### md5BuildAsset: 'static'
The path to assets in your project used by create md5 file

##### urlParamName: 'v'

自定义 URL 参数

##### isAdditionExt: false

是否在 URL 末尾附加原文件的扩展名

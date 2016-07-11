/**
 * By Jordan
 */
var gulp = require('gulp');
var angularTemplateCache = require('gulp-angular-templatecache');
var autoprefixer = require('gulp-autoprefixer');
var CacheBust = require('gulp-cachebust');
var concat = require('gulp-concat');
var del = require('del');
var filenames = require("gulp-filenames");
var htmlmin = require('gulp-htmlmin');
var imagemin = require('gulp-imagemin');
var minifyCss = require('gulp-clean-css');
var notify = require('gulp-notify');
var rename = require('gulp-rename');
var replace = require('gulp-replace-task');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');

var cachebust = new CacheBust();

/**
 * Mainly used to generate the <script></script> and <link> (aka, CSS) tags in our main HTML file. Used in conjunction
 * with `templates` variable.
 *
 * @see this.templates
 *
 * @param {string} tagPattern       A string with "{replace}" in it
 * @param {string} replacementText  The text to replace "{replace}" with
 */
var generateAssetTag = function(tagPattern, replacementText){
    return tagPattern.replace('{replace}', replacementText);
};

/**
 * Returns map function that will prepend each file with the specified
 * path, unless a path starts with './', then it'll be stripped and
 * ignored
 */
var prepend = function(path) {
    return function(file) {
        var startsWithExclusion = file.indexOf('./') === 0;
        return startsWithExclusion ? file.slice(2) : path + file;
    };
};

// Directory where all the underscore-prepended SCSS files are
var SCSS_INCLUDES_DIR = 'src/frontend/scss';
// Directory to dump all our outputted/processed files to
var OUTPUT_DIR = 'static/';
var ASSETS = {
    css:   {
        src: {
            /**
             * CSS sources from our application. Should just be the SCSS output directory
             */
            app: [
                '**/*.scss'
            ].map(prepend(SCSS_INCLUDES_DIR + '/')),
            /**
             * CSS sources from 3rd party vendors/libraries
             */
            vendor: [
                // If the vendor has SCSS source files, then they'll be included our own SCSS file, `main.scss`.
                // Why? Because SCSS will only compile styles and classes that are used, so this method will
                // reduce file size.
                //
                // However, if there aren't any SCSS files, then dump the relative path to the CSS files here
            ].map(prepend('node_modules/'))
        },
        // Where our CSS goes (after minification and concatenation)
        dest: {
            prefix: 'assets/styles',
            // These filenames will get overwritten with cache-busters (ie, there will be a unique hash string injected
            // into the filename so that whenever the file contents change, the filename will also change)
            appFileName: 'app.css',
            vendorFileName: 'vendor.css'
        },
        tagPattern: '<link rel="stylesheet" href="{replace}">'
    },
    js:   {
        src: {
            /**
             * Javascript sources for our app. Should just be the AngularJS code
             */
            app: [
                '**/*.js'
            ].map(prepend('src/frontend/js/')),
            /**
             * AngularJS templates. These will be preloaded using AngularJS $templateCache. Despite being HTML, these
             * are treated like JS files, as they eventually end up in a JS file (the $templateCache module)
             */
            appTemplates: [
                '**/*.html'
            ].map(prepend('src/frontend/js/components/')),
            /**
             * 3rd party vendor javascript libraries
             */
            vendor: [
                'angular/angular.js',
                'angular-resource/angular-resource.js',
                'angular-route/angular-route.js',
                'angular-sanitize/angular-sanitize.js'
            ].map(prepend('node_modules/'))
        },
        // Where our javascript goes (after minification and concatenation)
        dest: {
            prefix: 'assets/scripts',
            // These filenames will get overwritten with cache-busters (ie, there will be a unique hash string injected
            // into the filename so that whenever the file contents change, the filename will also change)
            appFileName: 'app.js',
            appTemplatesFileName: 'app.templates.js',
            vendorFileName: 'vendor.js'
        },
        tagPattern: '<script src="{replace}"></script>'
    },
    html: {
        src: {
            /**
             * Main index.html file
             */
            main: 'src/frontend/*.html'
        },
        dest: {
            prefix: OUTPUT_DIR
        }
    },
    images: {
        src: 'images/**/*',
        dest: 'assets/images'
    }
};
var CONFIG = {
    sass: {
        includePaths: SCSS_INCLUDES_DIR,
        outputStyle: 'expanded'
    },
    angularTemplateCache: {
        root: 'components/',
        module: 'kinks',
        standalone: false
    },
    autoprefixer: {
        browsers: ['> 5%']
    },
    cleanCss: {
        keepSpecialComments: 0 // Remove all comments from CSS
    }
};

/**
 * Deletes all the files at our destinations (only for JS and CSS, not images)
 */
gulp.task('clean-destination', function () {
    return del([
        OUTPUT_DIR + '/**/*'
    ])
});

/**
 * Concatenates, cache-busts, and then outputs our assets to our destination folder. Once all 4 "prepare-assets"
 * subtasks have completed, there should be 4 files representing our own CSS and JS, and any 3rd party CSS
 * and javascript
 *
 * Note that we do not concat our CSS files. They're expected to be SCSS, which should already output only one file
 *
 * @see ASSETS.css.dest.prefix
 * @see ASSETS.js.dest.prefix
 */
gulp.task("prepare-assets:css:vendor", ['clean-destination'], function(){
    return gulp.src(ASSETS.css.src.vendor)
        .pipe(minifyCss({keepBreaks:true}))
        .pipe(concat(ASSETS.css.dest.vendorFileName))
        .pipe(cachebust.resources())
        .pipe(filenames("cssVendor"))
        .pipe(gulp.dest(OUTPUT_DIR + ASSETS.css.dest.prefix))
});
gulp.task("prepare-assets:css:app", ['clean-destination'], function(){
    return gulp.src(ASSETS.css.src.app)
        .pipe(sourcemaps.init())
        .pipe(sass(CONFIG.sass))
        .pipe(autoprefixer(CONFIG.autoprefixer))
        .pipe(minifyCss(CONFIG.cleanCss))
        .pipe(cachebust.resources())
        .pipe(sourcemaps.write())
        .pipe(filenames("cssApp"))
        .pipe(gulp.dest(OUTPUT_DIR + ASSETS.css.dest.prefix));
});
gulp.task("prepare-assets:js:vendor", ['clean-destination'], function(){
    return gulp.src(ASSETS.js.src.vendor)
        .pipe(uglify())
        .pipe(concat(ASSETS.js.dest.vendorFileName))
        .pipe(cachebust.resources())
        .pipe(filenames("jsVendor"))
        .pipe(gulp.dest(OUTPUT_DIR + ASSETS.js.dest.prefix))
});
gulp.task("prepare-assets:js:app", ['clean-destination'], function(){
    gulp.src(ASSETS.js.src.app)
        .pipe(uglify())
        .pipe(concat(ASSETS.js.dest.appFileName))
        .pipe(cachebust.resources())
        .pipe(filenames("jsApp"))
        .pipe(gulp.dest(OUTPUT_DIR + ASSETS.js.dest.prefix))
});
gulp.task("prepare-assets:js:appTemplates", ['clean-destination'], function(){
    gulp.src(ASSETS.js.src.appTemplates)
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(angularTemplateCache(ASSETS.js.dest.appTemplatesFileName, CONFIG.angularTemplateCache))
        .pipe(uglify())
        .pipe(cachebust.resources())
        .pipe(filenames("jsAppTemplates"))
        .pipe(gulp.dest(OUTPUT_DIR + ASSETS.js.dest.prefix))
});

// Here we move our images
gulp.task('prepare-assets:images', ['clean-destination'], function() {
    return gulp.src(ASSETS.images.src)
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [
                {removeViewBox: false},
                {cleanupIDs: false}
            ],
            use: []
        }))
        .pipe(gulp.dest(OUTPUT_DIR + ASSETS.images.dest))
});

gulp.task("prepare-assets", [
    'prepare-assets:css:vendor',
    'prepare-assets:js:vendor',
    'prepare-assets:css:app',
    'prepare-assets:js:app',
    'prepare-assets:js:appTemplates',
    'prepare-assets:images'
], function(){
    ASSETS.css.dest.vendorFileName = filenames.get('cssVendor');
    ASSETS.css.dest.appFileName = filenames.get('cssApp');
    ASSETS.js.dest.vendorFileName = filenames.get('jsVendor');
    ASSETS.js.dest.appFileName = filenames.get('jsApp');
    ASSETS.js.dest.appTemplatesFileName = filenames.get('jsAppTemplates');

    // Retrieve the cache-busted filenames (eg, "app.5780b122.js"), and write them out to our HTML index file
    return gulp.src([ASSETS.html.src.main])
        .pipe(notify({ title: "Asset Preparation", message: 'Generating index.html file' }))
        .pipe(replace({
            patterns: [
                {
                    match: 'cssVendor',
                    replacement: ASSETS.css.dest.vendorFileName.length ? (generateAssetTag(ASSETS.css.tagPattern, ASSETS.css.dest.prefix + '/' + ASSETS.css.dest.vendorFileName)) : ""
                },
                {
                    match: 'cssApp',
                    replacement: ASSETS.css.dest.appFileName.length ? (generateAssetTag(ASSETS.css.tagPattern, ASSETS.css.dest.prefix + '/' + ASSETS.css.dest.appFileName)) : ""
                },
                {
                    match: 'jsVendor',
                    replacement: ASSETS.js.dest.vendorFileName.length ? (generateAssetTag(ASSETS.js.tagPattern, ASSETS.js.dest.prefix + '/' + ASSETS.js.dest.vendorFileName)) : ""
                },
                {
                    match: 'jsApp',
                    replacement: ASSETS.js.dest.appFileName.length ? generateAssetTag(ASSETS.js.tagPattern, ASSETS.js.dest.prefix + '/' + ASSETS.js.dest.appFileName) : ""
                },
                {
                    match: 'jsAppTemplates',
                    replacement: ASSETS.js.dest.appTemplatesFileName.length ? generateAssetTag(ASSETS.js.tagPattern, ASSETS.js.dest.prefix + '/' + ASSETS.js.dest.appTemplatesFileName) : ""
                }
            ]
        }))
        .pipe(gulp.dest(ASSETS.html.dest.prefix));
});

/**
 * Main build task
 */
gulp.task('build', [
    'prepare-assets'
]);

gulp.task('default', [
    'prepare-assets'
]);

/**
 * Watch (use `gulp watch`). Detects changes in files and rebuilds app automatically
 */
gulp.task('watch', function(){
	gulp.watch(ASSETS.css.src.app, ['prepare-assets']);
	gulp.watch(ASSETS.css.src.vendor, ['prepare-assets']);
	gulp.watch(ASSETS.js.src.app, ['prepare-assets']);
	gulp.watch(ASSETS.js.src.vendor, ['prepare-assets']);
});

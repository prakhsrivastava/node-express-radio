var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs'),
    Throttle = require('throttle'),
    mm = require('music-metadata');

var indexRouter = require('./routes/index');
var streamRouter = require('./routes/stream');
const { exit } = require('process');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.locals.writables = new Map();
app.use((req, res, next) => {
    req.on('close', () => {
        app.locals.writables.delete(req.query.tankId);
    });
    next();
});

app.use('/', indexRouter);
app.use('/stream', streamRouter);

var music = fs.readdirSync(process.cwd() + '/music', { withFileTypes: true })
    .filter(item => item.isFile && path.extname(item.name) === '.mp3');
if (music.length == 0) {
    throw Error('Please add music to the music directory to start the streaming');
} 
var current = 0;
startStream();

async function startStream() {
    if (music[current] == undefined) {
        current = 0;
    }
    const playMusic = process.cwd() + '/music/' +  music[current].name;
    const readable = fs.createReadStream(playMusic);
    const metadata = await mm.parseFile(playMusic);
    const bitRate = metadata.format.bitrate;
    const throttle = new Throttle(bitRate / 8);
    throttle.on('data', (chunk) => {
        app.locals.writables.forEach((writable, id) => {
            writable.write(chunk);
        });
    });
    throttle.on('close', () => {
        current++;
        startStream();
    });

    readable.pipe(throttle);
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

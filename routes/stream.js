var express = require('express');
var router = express.Router();
const { PassThrough } = require('stream');

router.get('/', function (req, res, next) {
    const id = Math.random().toString(36).slice(2);
    const responseTank = PassThrough();
    req.app.locals.writables.set(id, responseTank);
    req.query.tankId = id;
    responseTank.pipe(res).type('audio/mpeg');
});

module.exports = router;

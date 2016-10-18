'use strict';

var CimBot = require('../cimbot');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var cimbot = new CimBot({
    token: token,
    dbPath: dbPath,
    name: name
});

cimbot.run();
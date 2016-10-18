'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var bot = require('slackbots');

var CimBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'cimbot';
    this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'cimbot.db');

    this.user = null;
    this.db = null;
};

util.inherits(CimBot, bot);

CimBot.prototype.run = function () {
    CimBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

CimBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

CimBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

CimBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

CimBot.prototype._firstRunCheck = function () {
    var self = this;
    console.log('first run check');
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        console.log(record)
        if (!record) {
        	console.log('welcome message');
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

CimBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Chuck Norris` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

CimBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromCimBot(message) &&
        this._isMentioningCimbot(message)
    ) {
        this._replyWithRandomJoke(message);
    }
};

CimBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

CimBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

CimBot.prototype._isFromCimBot = function (message) {
    return message.user === this.user.id;
};

CimBot.prototype._isMentioningCimbot = function (message) {
    return message.text.toLowerCase().indexOf('cimbot') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

CimBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, record.joke, {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};

CimBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = CimBot;


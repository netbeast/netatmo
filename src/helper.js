var util = require('util');
var EventEmitter = require("events").EventEmitter;
var request = require('request');
var moment = require('moment');
var netbeast = require('netbeast')

const BASE_URL = 'https://api.netatmo.net';

var username;
var password;
var client_id;
var client_secret;
var scope;
var access_token;

/**
 * @constructor
 * @param args
 */
var netatmo = function (args) {
  EventEmitter.call(this);
  this.authenticate(args);
};

util.inherits(netatmo, EventEmitter);

/**
 * handleRequestError
 * @param err
 * @param response
 * @param body
 * @param message
 * @param critical
 * @returns {Error}
 */
netatmo.prototype.handleRequestError = function (err, response, body, message, critical) {
  netbeast.error(message)
  var errorMessage = "";
  if (body) {
    errorMessage = JSON.parse(body);
    errorMessage = errorMessage && (errorMessage.error.message || errorMessage.error);
  } else if (typeof response !== 'undefined') {
    errorMessage = "Status code" + response.statusCode;
  }
  else {
    errorMessage = "No response";
  }
  var error = new Error(message + ": " + errorMessage);
  if (critical) {
    this.emit("error", error);
  } else {
    this.emit("warning", error);
  }
  return error;
};

/**
 * http://dev.netatmo.com/doc/authentication
 * @param args
 * @param callback
 * @returns {netatmo}
 */
netatmo.prototype.authenticate = function (args, callback) {
  if (!args) {
    this.emit("error", new Error("Authenticate 'args' not set."));
    return this;
  }

  if (!args.client_id) {
    this.emit("error", new Error("Authenticate 'client_id' not set."));
    return this;
  }

  if (!args.client_secret) {
    this.emit("error", new Error("Authenticate 'client_secret' not set."));
    return this;
  }

  if (!args.username) {
    this.emit("error", new Error("Authenticate 'username' not set."));
    return this;
  }

  if (!args.password) {
    this.emit("error", new Error("Authenticate 'password' not set."));
    return this;
  }

  username = args.username;
  password = args.password;
  client_id = args.client_id;
  client_secret = args.client_secret;
  scope = args.scope || 'read_station read_thermostat write_thermostat access_camera read_camera';

  var form = {
    client_id: client_id,
    client_secret: client_secret,
    username: username,
    password: password,
    scope: scope,
    grant_type: 'password',
  };

  var url = util.format('%s/oauth2/token', BASE_URL);

  request({
    url: url,
    method: "POST",
    form: form,
  }, function (err, response, body) {
    if (err || response.statusCode != 200) {
      return this.handleRequestError(err, response, body, "Authenticate error", true);
    }

    body = JSON.parse(body);

    access_token = body.access_token;

    if (body.expires_in) {
      setTimeout(this.authenticate_refresh.bind(this), body.expires_in * 1000, body.refresh_token);
    }

    this.emit('authenticated');

    if (callback) {
      return callback();
    }

    return this;
  }.bind(this));

  return this;
};

/**
 * http://dev.netatmo.com/doc/authentication
 * @param refresh_token
 * @returns {netatmo}
 */
netatmo.prototype.authenticate_refresh = function (refresh_token) {

  var form = {
    grant_type: 'refresh_token',
    refresh_token: refresh_token,
    client_id: client_id,
    client_secret: client_secret,
  };

  var url = util.format('%s/oauth2/token', BASE_URL);

  request({
    url: url,
    method: "POST",
    form: form,
  }, function (err, response, body) {
    if (err || response.statusCode != 200) {
      return this.handleRequestError(err, response, body, "Authenticate refresh error");
    }

    body = JSON.parse(body);

    access_token = body.access_token;

    if (body.expires_in) {
      setTimeout(this.authenticate_refresh.bind(this), body.expires_in * 1000, body.refresh_token);
    }

    return this;
  }.bind(this));

  return this;
};


/**
 * https://dev.netatmo.com/doc/methods/getuser
 * @param callback
 * @returns {*}
 * @deprecated
 */
netatmo.prototype.getUser = function (callback) {
  // Wait until authenticated.
  if (!access_token) {
    return this.on('authenticated', function () {
      this.getUser(callback);
    });
  }

  var url = util.format('%s/api/getuser', BASE_URL);

  var form = {
    access_token: access_token,
  };

  request({
    url: url,
    method: "POST",
    form: form,
  }, function (err, response, body) {
    if (err || response.statusCode != 200) {
      return this.handleRequestError(err, response, body, "getUser error");
    }

    body = JSON.parse(body);

    this.emit('get-user', err, body.body);

    if (callback) {
      return callback(err, body.body);
    }

    return this;

  }.bind(this));

  return this;
};


/**
 * https://dev.netatmo.com/doc/methods/devicelist
 * @param options
 * @param callback
 * @returns {*}
 * @deprecated
 */
netatmo.prototype.getDevicelist = function (options, callback) {
  // Wait until authenticated.
  if (!access_token) {
    return this.on('authenticated', function () {
      this.getDevicelist(options, callback);
    });
  }

  if (options != null && callback == null) {
    callback = options;
    options = null;
  }

  var url = util.format('%s/api/devicelist', BASE_URL);

  var form = {
    access_token: access_token,
  };

  if (options && options.app_type) {
    form.app_type = options.app_type;
  }

  request({
    url: url,
    method: "POST",
    form: form,
  }, function (err, response, body) {
    if (err || response.statusCode != 200) {
      return this.handleRequestError(err, response, body, "getDevicelist error");
    }

    body = JSON.parse(body);

    var devices = body.body.devices;
    var modules = body.body.modules;

    this.emit('get-devicelist', err, devices, modules);

    if (callback) {
      return callback(err, devices, modules);
    }

    return this;

  }.bind(this));

  return this;
};

/**
 * https://dev.netatmo.com/doc/methods/gethomedata
 * @param options
 * @param callback
 * @returns {*}
 */
netatmo.prototype.getHomeData = function (options, callback) {
  // Wait until authenticated.
  if (!access_token) {
    return this.on('authenticated', function () {
      this.getHomeData(options, callback);
    });
  }

  var url = util.format('%s/api/gethomedata', BASE_URL);

  var form = {
    access_token: access_token
  };

  if (options != null && callback == null) {
    callback = options;
    options = null;
  }

  if (options) {

    if (options.home_id) {
      form.home_id = options.home_id;
    }

    if (options.size) {
      form.size = options.size;
    }

  }

  request({
    url: url,
    method: "POST",
    form: form,
  }, function (err, response, body) {
    if (err || response.statusCode != 200) {
      return this.handleRequestError(err, response, body, "getHomeData error");
    }

    body = JSON.parse(body);

    this.emit('get-homedata', err, body.body);

    if (callback) {
      return callback(err, body.body);
    }

    return this;

  }.bind(this));

  return this;
};

/**
 * https://dev.netatmo.com/doc/methods/getcamerapicture
 * @param options
 * @param callback
 * @returns {*}
 */
netatmo.prototype.getCameraPicture = function (options, callback) {
  // Wait until authenticated.
  if (!access_token) {
    return this.on('authenticated', function () {
      this.getCameraPicture(options, callback);
    });
  }

  if (!options) {
    this.emit("error", new Error("getCameraPicture 'options' not set."));
    return this;
  }

  if (!options.image_id) {
    this.emit("error", new Error("getCameraPicture 'image_id' not set."));
    return this;
  }

  if (!options.key) {
    this.emit("error", new Error("getCameraPicture 'key' not set."));
    return this;
  }

  var url = util.format('%s/api/getcamerapicture', BASE_URL);

  var qs = {
    access_token: access_token,
    image_id: options.image_id,
    key: options.key,
  };

  request({
    url: url,
    method: "GET",
    qs: qs,
    encoding: null,
    contentType: 'image/jpg'
  }, function (err, response, body) {
    if (err || response.statusCode != 200) {
      return this.handleRequestError(err, response, body, "getCameraPicture error");
    }

    this.emit('get-camerapicture', err, body);

    if (callback) {
      return callback(err, body);
    }

    return this;

  }.bind(this));

  return this;
};

module.exports = netatmo;

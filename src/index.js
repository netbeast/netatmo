/*
  We uses this File to launch the pluging, so you don´t need
  to change nothing.
*/

var express = require('express')
var logger = require('morgan')
var bodyParser = require('body-parser')
var fs = require('fs-extra')
var netbeast = require('netbeast')

var app = module.exports = express()

// uncomment after placing your favicon in /public
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

var pjson = require('../package.json')
var dirsettings

if (pjson.netbeast && pjson.netbeast.settings) {
  dirsettings = (pjson.netbeast.settings === true) ? '/settings' : pjson.netbeast.settings

  app.get(dirsettings, function (req, res) {
    res.sendFile(__dirname + dirsettings + '/index.html')
  })
}

var timer

app.get('/', function (req, res) {
  var fill = true
  fs.readJson('./src/settings/config.json', function (err, packageObj) {
    if (err) console.trace(err)
    for (var i in packageObj) {
      if (!packageObj[i] && fill) fill = false
    }
    if (!fill) {
      res.sendFile(__dirname + dirsettings + '/index.html')
      // res.redirect('/i/netatmo/settings')
      if (timer) clearTimeout(timer)
      timer = setTimeout(function () {
        netbeast().info('Fill all fields and press start to run Netatmo plugin', 'Configuration needed!')
      }, 1000)
    } else {
      res.status(404).end()
      app.use(require('./routes'))
    }
  })
})

app.post('/config', function (req, res) {
  if (!(req.body.client_id.trim() && req.body.client_secret.trim() && req.body.username.trim() && req.body.password.trim())) {
    netbeast().error('Complete all fields!')
    res.sendFile(__dirname + dirsettings + '/index.html')
  } else {
    fs.writeJson('./src/settings/config.json', req.body, function (err) {
      if (err) console.trace(new Error(err))
      else app.use(require('./routes'))
    })
  }
})



// // error handlers
// //===============
// app.use(function(req, res, next){
// 	res.status(404);
//   // respond with json
//   if (req.accepts('json')) {
//   	res.send({ error: 'Not found' });
//   	return;
//   }
//   // default to plain-text. send()
//   res.type('txt').send('Not found');
// });

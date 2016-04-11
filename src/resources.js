var request = require('request')
var netbeast = require('netbeast')
var Netatmo = require('./src/helper')
var fs = require('fs-extra')

var auth

fs.readJson('../settings/config.json', function (err, packageObj) {
  if (err) console.trace(err)
  for (var i in packageObj) {
    if (packageObj[i] === "XXXXXXXXXXXXXXXXX") throw (new Error('Settings required, go to the plugin settings and enter the data required'))
  }
  auth.client_id = packageObj.client_id
  auth.client_secret = packageObj.client_secret
  auth.username = packageObj.username
  auth.password = packageObj.password
})

var api = new Netatmo(auth)

const API = 'http://' + process.env.NETBEAST + '/api/resources'

var devices = []

module.exports = function (callback) {
  var objects = []

  // Request to the database
  request.get(API + '?app=netatmo-plugin',
  function (err, resp, body) {
    if (err) return callback(err)
    if (!body) return callback()

    body = JSON.parse(body)

    // Store the found devices in 'objects' array
    if (body.length > 0) {
      body.forEach(function (device) {
        if (objects.indexOf(device.hook) < 0) objects.push(device.hook)
      })
    }
  })

  // Implement the device discovery method
  api.getHomeData(function (err, data) {
    if (err) console.trace(err)

    data.homes[0].cameras.forEach(function (camera) {
      devices.push(camera)
      var indx = objects.indexOf('/welcome/' + camera.id)
      if (indx >= 0) {
        objects.splice(indx, 1)
      } else {
        netbeast('').create({app: 'netatmo-plugin', hook: '/welcome/' + camera.id})
        .cathch(function (err) {
          return callback(err)
        })
      }
    })
  })

  if (objects.length > 0) {
    objects.forEach(function (hooks) {
      request.del(API + '?hook=' + hooks,
      function (err, resp, body) {
        if (err) callback(err)
      })
    })
  }

  return callback(null, devices, api)
}

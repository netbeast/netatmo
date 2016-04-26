var request = require('request')
var netbeast = require('netbeast')
var Netatmo = require('./helper')
var fs = require('fs-extra')

const API = 'http://' + process.env.NETBEAST + '/api/resources'

var devices = []
var api

module.exports = function (callback) {
  fs.readJson('./src/settings/config.json', function (err, packageObj) {
    if (err) console.trace(err)
    for (var i in packageObj) {
      if (!packageObj[i]) return (new Error('Settings required, go to the plugin settings and enter the data required'))
    }
    api = new Netatmo(packageObj)

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
          netbeast('camera').create({app: 'netatmo', hook: '/welcome/' + camera.id})
          .catch(function (err) {
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
  })

  return callback(null, devices, api)
}

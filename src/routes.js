
var express = require('express')
var router = express.Router()
// Require the discovery function
var loadResources = require('./resources')
var netbeast = require('netbeast')

loadResources(function (err, devices, api) {
  if (err) {
    console.trace(new Error(err))
    netbeast().error(err, 'Something wrong!')
  }

  router.get('/welcome/:id', function (req, res, next) {
    api.getHomeData(function (err, data) {
      if (err) console.trace(err)
      devices = data.home[0].cameras
    })

    var device = devices.filter(function (elem) {
      if (elem.id === req.params.id) return true
    })

    if (device.lenght < 1) return res.status(404).send('Device not found')

    if (!Object.keys(req.query).length) {
      return res.json(device)
    }
    var response = {}
    Object.keys(req.query).forEach(function (key) {
      switch (key) {
        case 'track':
          if (!req.query[key]) response[key] = 'Wrong format, track: [live] or [video_id]'
          else {
            if (req.query[key] === 'live') {
              if (device.is_local) response.track = device.vpn_url + '/live/index_local.m3u8'
              else response.track = device.vpn_url + '/live/index.m3u8'
            } else {
              if (device.is_local) response.track = device.vpn_url + '/vod/' + req.query.track + '/index_local.m3u8'
              else response.track = device.vpn_url + '/vod/' + req.query.track + '/index.m3u8'
            }
          }
          break
        case 'picture':
          if (!('key' in req.query)) response[key] = 'Missing property key ({ picture: "", key: ""})'
          else if (!req.query[key]) response[key] = 'Wrong format, picture: [picture_id]'
          else {
            api.getCameraPicture({image_id: req.query.picture, key: req.query.key}, function (err, data) {
              if (err) console.trace(err)
              response.picture = data
            })
          }
          break
        case 'users':
          api.getUser(function (err, users) {
            if (err) console.trace(err)
            response.users = users
          })
          break
        case 'persons':
        case 'events':
          api.getHomeData(function (err, data) {
            if (err) console.trace(err)
            response[key] = data.homes[0][key]
          })
          break
      }
    })
    if (Object.keys(response).length) return res.json(response)
    return res.status(400).send('Values not available on Netatmo Welcome')
  })

  router.get('/discover', function (req, res, next) {
    loadResources(function (err, devices, api) {
      if (err) {
        console.trace(new Error(err))
        netbeast().error(err, 'Something wrong!')
      }
    })
  })

  router.post('*', function (req, res, next) {
    if (err) return res.status(500).send(err)
    return res.status(501).send('Post Not Implemented')
  })
})

// Used to serve the routes
module.exports = router

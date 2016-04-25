var fs = require('fs-extra')

fs.readJson('./settings/config.json', function (err, packageObj) {
  if (err) console.trace(err)
  var fill = false
  for (var i in packageObj) {
    console.log(i)
    if (packageObj[i] === 'XXXXXXXXXXXXXXXXX' && !fill) fill = true
  }
  console.log(fill)
})

// {
//   "client_id": "57038b11e6da23558b8b4673",
//   "client_secret": "Kx1FDEsAgcoxe0dqJzvTJ7yXggbeoTktzO5tAf",
//   "username": "pablopizarroaguilar@gmail.com",
//   "password": "us49AX8X"
// }

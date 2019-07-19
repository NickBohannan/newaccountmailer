require('dotenv').config()
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')

const routes = require('./routes/index')

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'))
app.use('/', routes)

const port = process.env.PORT || 8080

app.set('port', port)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.listen(port, () => {
    console.log('Server listening on port ' + port)
})
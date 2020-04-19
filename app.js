const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const { exec } = require('child_process')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

app.set('view engine', 'ejs')

app.get('/commands', async (req, res) => {
    res.render(__dirname + '/index.ejs')
})

const VALID_COMMANDS = {
    ls: true,
    cat: true,
    wc: true
}

const removeCommandChains = (command) => {
    command = command.split(';')
    command = command[0]
    command = command.split('&&')
    command = command[0]
    command = command.split('||')
    command = command[0]
    return command
}

const isValidCommand = (command) => {
    return Object.keys(VALID_COMMANDS).some(valid_c => {
        const reg = new RegExp(`^${valid_c}`)
        return command.match(reg)
    })
}

const fixSpaces = (str) => {
    return str.split(String.fromCharCode(160)).join(' ')
}

const sanitizeInput = (req, res, next) => {
    // middleware to santize command input and only allow specific commands
    let { command } = req.body
    console.log(command)
    command = removeCommandChains(fixSpaces(command))
    if (isValidCommand(command)) {
        req.command = command
        return next()
    }
    res.json(JSON.stringify(
        { stderr: 'Invalid Command' }
    ))
}

// create POST route to send commands from client
app.post('/exec', sanitizeInput, (req, res) => {
    exec(req.command.split(' ').join(' '), { timeout: 1000 }, (err, stdout, stderr) => {
        if (err) {
            return res.json(JSON.stringify(
                { stderr: err.message }
            ))
        }
        res.json(JSON.stringify({
            stdout,
            stderr
        }))
    })
})

app.get('/', (_, res) => res.redirect('/commands'))

app.get('*', (_, res) => {
    res.status(404).send('404')
})

app.listen(process.env.PORT || 3000)

const express = require('express')
const app = express()
const port = 3000

const fs = require('fs')

const readline = require('readline')
const { google } = require('googleapis')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl']

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json'

const start_function = (callback) => {
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err)
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), callback)
    })
}

const authorize = (credentials, callback) => {
    const { client_secret, client_id, redirect_uris } = credentials.installed
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback)
        oAuth2Client.setCredentials(JSON.parse(token))
        callback(oAuth2Client)
    })
}

const getNewToken = (oAuth2Client, callback) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    })
    console.log('Authorize this app by visiting this url:', authUrl)
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close()
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err)
            oAuth2Client.setCredentials(token)
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err)
                console.log('Token stored to', TOKEN_PATH)
            })
            callback(oAuth2Client)
        })
    })
}

const getBroadcast = (auth) => {
    const service = google.youtube('v3')

    const request = {
        auth: auth,
        part: 'id, snippet, contentDetails, status',
        id: 'SHwKywDc978',
        // PageToken: 'nextPageToken',
    }

    service.liveBroadcasts.list(request, (err, response) => {
        if (err) return console.log('The API returned an error: ' + err)
        const broadcast = response.data.items[0]
        console.log(`${broadcast.snippet.channelId} is livestreaming about ${broadcast.snippet.title}`)

        const chatRequest = {
            auth: auth,
            part: 'id, snippet, authorDetails',
            liveChatId: broadcast.snippet.liveChatId,
            PageToken: 'nextPageToken',
        }

        service.liveChatMessages.list(chatRequest, (err, response) => {
            if (err) return console.log('The API returned an error: ' + err)
            const messages = response.data.items
            messages.forEach((message) => {
                const sentAt = new Date(message.snippet.publishedAt)
                const diff = new Date() - sentAt
                var diffMins = Math.round(((diff % 86400000) % 3600000) / 60000)
                // console.log(
                //     `${message.authorDetails.displayName} said "${message.snippet.displayMessage}" ${diffMins} minutes ago`
                // )
                if (message.snippet.displayMessage.startsWith('/') && diffMins < 1) {
                    commands(message.snippet.displayMessage, broadcast.snippet.liveChatId)
                }
            })
        })
    })
}

const commands = (command, chatId) => {
    const commands = ['/help', '/stats', '/dc']
    const _channel = getChannel('UCbZRGXMhWPva6OZydKs70ng')
    switch (command) {
        case '/help':
            sendMessage(`Available commands: ${commands}`, chatId)
            break
        case '/stats':
            setTimeout(function(){ sendMessage(`
            Name: ${channel.snippet.title} • \n
            Subscribers: ${channel.statistics.subscriberCount} • \n
            Viewcount: ${channel.statistics.viewCount} • \n
            Videos: ${channel.statistics.videoCount} \n
            `, chatId) }, 3000);
            break
        case '/dc':
            setTimeout(function(){ sendMessage(`💬 ᴅɪꜱᴄᴏʀᴅ ꜱᴇʀᴠᴇʀ: https://shorturl.at/lmyLN`, chatId) }, 3000);
            break
        default:
            console.log('invalid command')
            break
    }
}

const getComments = (auth) => {
    const service = google.youtube('v3')

    const request = {
        auth: auth,
        part: 'id,replies,snippet',
        videoId: 'DiKTifU1v1I',
    }

    service.commentThreads.list(request, (err, response) => {
        if (err) return console.log('The API returned an error: ' + err)
        const commentThreads = response.data.items
        if (commentThreads.length == 0) {
            console.log('No thread found.')
        } else {
            commentThreads.forEach((element) => {
                console.log(
                    `${element.snippet.topLevelComment.snippet.authorDisplayName} commented: ${element.snippet.topLevelComment.snippet.textDisplay}`
                )
            })
        }
    })
}

const sendMessage = (message, chatId) => {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err)
        const { client_secret, client_id, redirect_uris } = JSON.parse(content).installed
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return getNewToken(oAuth2Client, callback)
            oAuth2Client.setCredentials(JSON.parse(token))

            console.log(chatId)
            
            const service = google.youtube('v3')

            const request = {
                auth: oAuth2Client,
                part: ['snippet'],
                resource: {
                    snippet: {
                        liveChatId: chatId,
                        type: 'textMessageEvent',
                        textMessageDetails: {
                            messageText: message,
                        },
                    },
                }
                
            }

            service.liveChatMessages.insert(request, (err, response) => {
                if (err) return console.log('The API returned an error: ' + err)
                console.log(response.data)
            })
        })
    })
}

const getChannel = (channelId) => {
    return new Promise(function(resolve, reject) {
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err)
            const { client_secret, client_id, redirect_uris } = JSON.parse(content).installed
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
            fs.readFile(TOKEN_PATH, (err, token) => {
                if (err) return getNewToken(oAuth2Client, callback)
                oAuth2Client.setCredentials(JSON.parse(token))            
                const service = google.youtube('v3')
    
                const request = {
                    auth: oAuth2Client,
                    part: 'snippet,contentDetails,statistics',
                    id: channelId,
                }
    
                service.channels.list(request, (err, response) => {
                    if (err) return reject('The API returned an error: ' + err)
                    const channels = response.data.items
                    if (channels.length == 0) {
                        console.log('No channel found.')
                    } else {
                        this.channel = channels[0]
                        // console.log(`This channel's ID is ${channels[0].id}.
                        //     Its title is ${channels[0].snippet.title},
                        //     it has ${channels[0].statistics.viewCount} views and
                        //     it has ${channels[0].statistics.subscriberCount} subscribers.`)
                        resolve(this)
                    }
                })
            })
        }) 
    });
}

// getChannel()

// start_function(getChannel)
// start_function(getBroadcast)
// start_function(getComments)

app.get('/', (req, res) => {
    const _channel = getChannel('UCbZRGXMhWPva6OZydKs70ng')
    setTimeout(function(){ res.send(channel.statistics.subscriberCount) }, 1000);
})
  
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
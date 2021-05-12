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
        id: '21X5lGlDOfg',
        PageToken: 'nextPageToken',
    }

    service.liveBroadcasts.list(request, (err, response) => {
        if (err) return console.log('The API returned an error: ' + err)
        const broadcasts = response.data.items
        console.log(response)
        console.log(broadcasts)
    })
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

const getChannel = (auth) => {
    const service = google.youtube('v3')

    const request = {
        auth: auth,
        part: 'snippet,contentDetails,statistics',
        id: 'UCmDTrq0LNgPodDOFZiSbsww',
    }

    service.channels.list(request, (err, response) => {
        if (err) return console.log('The API returned an error: ' + err)
        const channels = response.data.items
        if (channels.length == 0) {
            console.log('No channel found.')
        } else {
            console.log(`This channel's ID is ${channels[0].id}.
            Its title is ${channels[0].snippet.title},
            it has ${channels[0].statistics.viewCount} views and
            it has ${channels[0].statistics.subscriberCount} subscribers.`)
        }
    })
}

start_function(getChannel)
// start_function(getComments)

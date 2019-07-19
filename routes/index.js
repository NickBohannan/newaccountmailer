const express = require('express')
const nodemailer = require('nodemailer')
const pdfFiller = require('pdffiller')
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const router = express.Router()

router.get("/", (req, res) => {
    res.render("mainpage")
})

router.post("/", async (req, res) => {

    let newAccountData = {}
    let providerEmail = req.body.email
    let providerAccountNumber = req.body.accountNumber

    let sourcePDF = "PAL_OrderForm_1001_Orthoses.pdf"
    let destinationPDF = "PAL_Populated_Orthoses_OrderForm"

    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    const TOKEN_PATH = 'token.json'

    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), getNewAccountInfo);
    });

    let shouldFlatten = false

    let data = {
        "ACCOUNT": newAccountData.accountNumber,
        "NAME": newAccountData.businessName,
        "ADDRESS": newAccountData.address1,
         + ' ' + 
            newAccountData.address2 + ' ' +
            newAccountData.city + ', ' +
            newAccountData.state + ' ' +
            newAccountData.zip,
        "PHONE_FAX": newAccountData.phone
    }

    pdfFiller.fillFormWithFlatten(sourcePDF, destinationPDF, data, shouldFlatten, function(err) {
        if (err) throw err;
        console.log("In callback (we're done).")
    })
    
    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(credentials, callback) {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
        
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return getNewToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));
            callback(oAuth2Client);
        });
    }
    
    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback for the authorized client.
     */
    function getNewToken(oAuth2Client, callback) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
            });
        });
    }
    
    /**
     * Prints the names and majors of students in a sample spreadsheet:
     * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
     * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
     */
    function getNewAccountInfo(auth, req) {
        const sheets = google.sheets({version: 'v4', auth});
        sheets.spreadsheets.values.get({
            spreadsheetId: '1havBCeKtdWvE69wfTp5xw5RhZOOQUmzDHfFupUztK2Y',
            range: 'Sheet1!A2:AJ',
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const rows = res.data.values;
            if (rows.length) {
                for (let i=0; i<rows.length; i++) {
                    if (rows[i][23] == providerEmail) {
                        newAccountData.accountNumber = providerAccountNumber
                        newAccountData.businessName = rows[i][0]
                        newAccountData.address1 = rows[i][1]
                        newAccountData.address2 = rows[i][2]
                        newAccountData.city = rows[i][3]
                        newAccountData.state = rows[i][4]
                        newAccountData.zip = rows[i][5]
                        newAccountData.phone = rows[i][22]
                    }
                }
                console.log(newAccountData)
                console.log(providerEmail)
            } else {
            console.log('No data found.');
            }
        });


    }

    // let accountNumber = req.body.accountNumber
    //     // create reusable transporter object using the default SMTP transport
    // let transporter = nodemailer.createTransport({
    //     host: "smtp.gmail.com",
    //     port: 587,
    //     secure: false, // true for 465, false for other ports
    //     auth: {
    //     user: "palhealthtechnologies@gmail.com",
    //     pass: process.env.PASSWORD
    //     }
    // });

    // // send mail with defined transport object
    // let info = await transporter.sendMail({
    //     from: 'PAL Health Tecnologies', // sender address
    //     to: "n.bohannan@palhealth.com", // list of receivers
    //     subject: "Hello ✔", // Subject line
    //     text: `Sup homie here is the account number: ${accountNumber}`, // plain text body
    //     // html: "<b>Hello world?</b>" // html body
    // });

    // console.log("Message sent: %s", info.messageId);
    // // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
})

module.exports = router


'use strict'

const s3 = require('./s3');
const ses = require('./ses');
const pdf = require('./pdf');
const util = require('./util');
const consts = require('./const');
const tconsts = require('../test/const');
const api = require('./api');
const sentry = require('@sentry/node');
const aws = require('aws-sdk');

require('dotenv').config();
aws.config.loadFromPath('awsconfig.global.json');

// init sentry
sentry.init({ dsn: consts.SENTRY_DNS });

module.exports.isAcceptEmail = false;
module.exports.emailMime = "";
module.exports.emailFrom = "";
module.exports.emailTo = "";
module.exports.emailCc = "";
module.exports.emailBcc = "";
module.exports.emailSubject = "";
module.exports.emailBody = "";
module.exports.templateBody = "";
module.exports.pdfBody = "";
module.exports.pdfFileName = "";

// define our target API as a "service"
module.exports.svc = new aws.Service({
  // the API base URL
  //endpoint: process.env.API_URL || consts.API_URL,
  endpoint: consts.API_URL,

  // don't parse API responses
  // (this is optional if you want to define shapes of all your endpoint responses)
  convertResponseTypes: false,

  // and now, our API endpoints
  apiConfig: {
    metadata: {
        protocol: 'rest-json' // we assume our API is JSON-based
    },
    operations: {

      // precheck
      PreCheck: {
        http: {
          method: 'POST',
          requestUri: consts.API_PRE_CHECK
        },
        input: {
          type: 'structure',
          required: [ 'data' ],
          // use "data" input for the request payload
          payload: 'data',
          members: {
            'data': {
              type: 'structure',
              required: [ 'emailKey', 'apiKey', 'sender' ],
              // the shape of the body object
              members: {
                'emailKey': {},
                'apiKey': {},
                'sender': {},
              }
            }
          }
        }
      },

      // example how to send JSON data in the request body
      ConvertPdf: {
        http: {
          method: 'POST',
          requestUri: consts.API_CONVERT
        },
        input: {
          type: 'structure',
          required: [ 'data' ],
          // use "data" input for the request payload
          payload: 'data',
          members: {
            'data': {
              type: 'structure',
              required: [ 'apiKey', 'payload' ],
              // the shape of the body object
              members: {
                'apiKey': {},
                'payload': {},
                'pdfFileName': {},
              }
            }
          }
        }
      },
      SendPdf: {
        http: {
          method: 'POST',
          requestUri: consts.API_SEND_PDF
        },
        input: {
          type: 'structure',
          required: [ 'data' ],
          // use "data" input for the request payload
          payload: 'data',
          members: {
            'data': {
              type: 'structure',
              required: [ 'pdfFileName', 'from', 'to', 'cc', 'bcc', 'subject', 'body' ],
              // the shape of the body object
              members: {
                'pdfFileName': {},
                'from': {},
                'to': {},
                'cc': {},
                'bcc': {},
                'subject': {},
                'body': {},
              }
            }
          }
        }
      },
    }
  }
});

module.exports.precheck = async (data) => {
  console.log('<<< <<< <<< ', consts.BUILD_TIME, 'Starting to pre-check the email ...', data, '\n');
  var emailKey = data.emailKey;
  var apiKey = data.apiKey;
  var sender = data.sender;

  // Retrieve the config from the bucket
  await s3.getConfig(apiKey, sender, emailKey);

  this.pdfFileName = util.genPdfName(apiKey, emailKey);
  if (this.isAcceptEmail) {
    await s3.getEmail(apiKey, sender, emailKey);
    if (tconsts.directPdf) {
      this.convert_pdf(apiKey, this.emailBody, sender, emailKey, this.pdfFileName);
    } else if (this.emailBody != "") {
      console.log('\tCalling convert-pdf API ... : ', consts.API_URL + consts.API_CONVERT);
      this.svc.convertPdf({
        data: {
          apiKey: apiKey,
          payload: this.emailBody,
          pdfFileName: this.pdfFileName,
        }
      }, async (err, data) => {
        console.log("\tconvert-pdf API returned!");
        if (err) {
          console.error('Done action with the failure (calling convertPdf API) >>> >>> >>>:', err);
          sentry.captureException(new Error('Failed to call convertPdf API. ' + JSON.stringify(err)));
          await sentry.flush();
        }
      });
    }
    await util.delayForCallingApi();
  };
  console.log('Done action of pre-checking the email. The following PDF file will be generated: ', this.pdfFileName, ' >>> >>> >>>');
}

module.exports.convert_pdf = async (apiKey, emailMime, sender, emailKey, pdfFile) => {
  console.log('<<< <<< <<< ', consts.BUILD_TIME, 'Starting to convert the email to PDF ...\n');

  await util.parseEmailBody(emailKey, emailMime);

  await s3.getEmailTemplate(apiKey, sender, emailKey, this.emailBody);
  if (this.templateBody != "") {
    await pdf.parseTemplate(apiKey, sender, emailKey, this.emailFrom, this.emailTo, this.emailSubject, this.emailBody, this.templateBody);
    if (this.pdfBody != "") {
      if (pdfFile === "" || pdfFile === undefined) {
        pdfFile = util.genPdfName(apiKey, emailKey);
      }
      await s3.putPdf(apiKey, sender, emailKey, this.pdfBody, pdfFile);
      
      // var toArray = [this.emailFrom, this.emailTo];
      // var toString = toArray.join(",");
      if (tconsts.directMail) {
        this.send_pdf(pdfFile, this.emailFrom, this.emailTo, this.emailCc, this.emailBcc, this.emailSubject, this.emailBody);
      } else {
        console.log('\tCalling send-email API ... : ', consts.API_URL + consts.API_SEND_PDF);
        this.svc.sendPdf({
          data: {
            pdfFileName: pdfFile,
            from: this.emailFrom,
            to: this.emailTo,
            cc: this.emailCc,
            bcc: this.emailBcc,
            subject: this.emailSubject,
            body: this.emailBody
          }
        }, async (err, data) => {
          console.log("\tsend-pdf API returned!");
          if (err) {
            console.error('Done action with the failure (calling sendPdf API) >>> >>> >>>:', err);
            sentry.captureException(new Error('Failed to call sendPdf API. ' + JSON.stringify(err)));
            await sentry.flush();
          }
        });
        await util.delayForCallingApi();
      }
    }
  }
  console.log('Done action of converting to PDF: apiKey=', apiKey, 'pdfFile=', pdfFile, ' >>> >>> >>>');
}

module.exports.send_pdf = async (pdfFileName, from, toString, ccString, bccString, subject, body) => {
  console.log('<<< <<< <<< ', consts.BUILD_TIME, 'Starting to send the email with PDF: pdfFileName=', pdfFileName, ', from=', from, ', to=', toString, ', cc=', ccString, ', bcc=', bccString, ', subject=', subject, ' ...\n');

  var to = toString.split(",");
  var cc = ccString.split(",");
  var bcc = bccString.split(",");

  await ses.sendEmail(pdfFileName, from, to, cc, bcc, subject, body);
  
  console.log('Done action of sending email with PDF >>> >>> >>>');
}

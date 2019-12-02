const consts = require('./const');
const s3 = require('./s3');
const util = require('./util');
const sentry = require('@sentry/node');
const fs = require('fs');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

// init sentry
sentry.init({ dsn: consts.SENTRY_DNS });

module.exports.pdfBody = "";

// Get apiKey from the email notification
module.exports.sendEmail = async (pdfFileName, from, to, cc, bcc, subject, body) => {
  console.log('\n\tSending email ...');

  await s3.getPdf(pdfFileName);
  var pdfBody = this.pdfBody;
  var dir = "/tmp/";

  const promise = new Promise(function(resolve, reject) {

    fs.writeFile(dir + pdfFileName, pdfBody, async (err) => {
      // throws an error, you could also catch it here
      if (err) {
        console.log('Failed saving PDF to temp directory: path=' + pdfFileName, err);
        sentry.captureException(new Error('Failed saving PDF to temp directory: path=' + pdfFileName + ", " + JSON.stringify(err)));
        await sentry.flush();
        reject(Error(err));
      } else {
        // success case, the file was saved
        console.log('Saved PDF to temp directory: path=', pdfFileName, ', len=', pdfBody.length);
  
        process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
  
        var transport = nodemailer.createTransport(smtpTransport({
          host: consts.SES_SMTP_SRV,
          port: consts.SES_SMTP_PORT,
          secure: consts.SES_SMTP_SSL,
          auth: {
            user: consts.SES_SMTP_USER,
            pass: consts.SES_SMTP_PASS,
          }
        }));
        
        var attachFileName = util.genAttachPdfName(subject);

        var mailOptions = {
          from: consts.SES_FROM, // sender address
          to: to, // list of receivers
          cc: cc,
          bcc: bcc,
          replyTo: from,
          subject: "(PDF) " + subject, // Subject line
          html: "Please see PDF attached for \"" + subject + "\"",
          attachments: [{
            filename: attachFileName,
            path: dir + pdfFileName,
            contentType: 'application/pdf'
          }],
        };
        
        transport.sendMail(mailOptions, async function(error, info) {
          transport.close(); // shut down the connection pool, no more messages
          if (error) {
            console.log('Failed sending email: path=', pdfFileName, error);
            sentry.captureException(new Error('Failed sending email: path=' + pdfFileName + ", " + JSON.stringify(error)));
            await sentry.flush();
            reject(Error(error));
          }
          else{
            console.log('Message sent with ' + attachFileName + ': ' + info.response);
            fs.unlinkSync(dir + pdfFileName);
            resolve();
          }
        });
      }
    });
  });
  return promise;
}
const aws = require('aws-sdk');
const app = require('./logic');
const consts = require('./const');
const util = require('./util');

require('dotenv').config();

aws.config.loadFromPath('awsconfig.global.json');
var ApiBuilder = require('claudia-api-builder'),
  api = new ApiBuilder();

module.exports = api;

api.get('/about', function () {
  return 'This is the end point for explaining the API gateway of PDF converter.';
});

api.post(consts.API_PRE_CHECK, async function (request) {
  var event = request.body;
  await app.precheck(event);
  return 'The email is processed. ' + app.pdfFileName + ' will be generated.';
}, {
  success: { contentType: 'application/json' }, 
  error: {code: 500}
});

api.post(consts.API_CONVERT, async function (request) {
  var apiKey = request.body.apiKey;
  var emailBody = request.body.payload;
  var pdfFileName = request.body.pdfFileName;
  var sender = request.body.sender;
  var emailKey = request.body.emailKey;
  if (pdfFileName === undefined) {
    pdfFileName = util.genPdfName(apiKey, emailKey);
  }
  await app.convert_pdf(apiKey, emailBody, sender, emailKey, pdfFileName);
  return 'The email is processed: apiKey=' + apiKey + ', emailBody=' + emailBody + ', pdf=' + pdfFileName;
}, {
  success: { contentType: 'application/json' }, 
  error: {code: 500}
});

api.post(consts.API_SEND_PDF, async function (request) {
  var pdfFileName = request.body.pdfFileName;
  var from = request.body.from;
  var to = request.body.to;
  var cc = request.body.cc;
  var bcc = request.body.bcc;
  var subject = request.body.subject;
  var body = request.body.body;
  var pdfBody = request.body.pdfBody;
  await app.send_pdf(pdfFileName, from, to, cc, bcc, subject, body, pdfBody);
  return 'The email is sent with PDF: pdf=' + pdfFileName;
}, {
  success: { contentType: 'application/json' }, 
  error: {code: 500}
});
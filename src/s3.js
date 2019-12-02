const consts = require('./const');
const aws = require('aws-sdk');
const s3 = new aws.S3(aws.config.loadFromPath('awsconfig.s3.json'));
const sentry = require('@sentry/node');
const test = require('../test/const');
const util = require('./util');
const app = require('./logic');
const ses = require('./ses');

// init sentry
sentry.init({ dsn: consts.SENTRY_DNS });

var parseConfig = async (apiKey, sender, emailKey, configBody) => {
  console.log('\t\tRaw config: ' + configBody);

  var config = [];
  try {
    config = JSON.parse(configBody);
    console.log('\t\tParsed config: ' + JSON.stringify(config));
  } catch (err) {
    console.log('\nFailed parsing the config file. ' + JSON.stringify(err) + ' >>> >>> >>>');
    sentry.captureException(new Error('Failed to parse the config file. ' + JSON.stringify(err)));
    await sentry.flush();
    app.isAcceptEmail = false;
  }

  // Check the email with rule-set of config
  app.isAcceptEmail = await util.checkEmail(config, sender, sentry);
}

// Get the config from bucket
module.exports.getConfig = async (apiKey, sender, emailKey) => {
  var configFile = apiKey + consts.CONFIG_FILE_SUFFIX;
  console.log('\n\tGetting the config: id=' + configFile + ' from S3 bucket=' + consts.BUCKET_CONFIG);

  var configBody = "";
  var getParams = {
    Bucket: consts.BUCKET_CONFIG,
    Key: configFile
  }

  const request = s3.getObject(getParams);
  request.on("success", async function(response) {
    var data = response.data;
    console.log('\t\tThe response of s3 getObject: len=' + JSON.stringify(data).length);

    // Convert Body from a Buffer to a String
    configBody = data.Body.toString('utf-8'); // Use the encoding necessary
    return parseConfig(apiKey, sender, emailKey, configBody);
  });
  request.on("error", async function(err) {
    // Handle any error and exit
    if (err) {
      console.log('\nFailed retrieving the config file. key=' + configFile + ', err=' + JSON.stringify(err) + ' >>> >>> >>>');
      sentry.captureException(new Error('Failed to retrieve the config file. ' + JSON.stringify(err)));
      await sentry.flush();
    }
  });
  await request.promise();
  return request;
}

// Get email from bucket
// emailKey - ID for Email
// apiKey - 'To'
// sender - 'From'
module.exports.getEmail = async (apiKey, sender, emailKey) => {
  var emailFile = emailKey;
  console.log('\n\tGetting the email: id=' + emailFile + ' from S3 bucket=' + consts.BUCKET_INCOMING);

  var emailBody = "";
  var getParams = {
    Bucket: consts.BUCKET_INCOMING,
    Key: emailFile
  }

  const request = s3.getObject(getParams);
  request.on("success", async function(response) {
    var data = response.data;
    console.log('\t\tThe response of s3 getObject: len=' + JSON.stringify(data).length);

    // Convert Body from a Buffer to a String
    emailBody = data.Body.toString('utf-8'); // Use the encoding necessary
    app.emailBody = emailBody;
  });
  request.on("error", async function(err) {
    // Handle any error and exit
    if (err) {
      console.log('\nFailed retrieving the email. key=' + emailFile + ', err=' + JSON.stringify(err) + ' >>> >>> >>>');
      sentry.captureException(new Error('Failed to retrieve the email. ' + JSON.stringify(err)));
      await sentry.flush();
    }
  });
  await request.promise();
}

// Get email template from bucket
module.exports.getEmailTemplate = async (apiKey, sender, emailKey, emailBody) => {
  var templateFile = apiKey + consts.TEMPLATE_FILE_SUFFIX;
  console.log('\n\tGetting the template file: id=' + templateFile + ' from S3 bucket=' + consts.BUCKET_CONFIG);

  var getParams = {
    Bucket: consts.BUCKET_CONFIG,
    Key: templateFile
  }

  const request = s3.getObject(getParams);
  request.on("success", async function(response) {
    var data = response.data;
    console.log('\t\tThe response of s3 getObject: len=' + JSON.stringify(data).length);

    // Convert Body from a Buffer to a String
    app.templateBody = data.Body.toString('utf-8');
  });
  request.on("error", async function(err) {
    // Handle any error and exit
    if (err) {
      console.log('\nFailed retrieving the template file. key=' + templateFile + ', err=' + JSON.stringify(err) + ' >>> >>> >>>');
      sentry.captureException(new Error('Failed to retrieve the template file. ' + JSON.stringify(err)));
      await sentry.flush();
    }
  });
  await request.promise();
}

// Get pdf from bucket
module.exports.getPdf = async (pdfFileName) => {
  console.log('\n\tGetting the pdf file: id=' + pdfFileName + ' from S3 bucket=' + consts.BUCKET_TEMP);

  var getParams = {
    Bucket: consts.BUCKET_TEMP,
    Key: pdfFileName
  }

  const request = s3.getObject(getParams);
  request.on("success", async function(response) {
    var data = response.data;
    console.log('\t\tThe response of s3 getObject: len=' + JSON.stringify(data).length);

    // Convert Body from a Buffer to a String
    ses.pdfBody = data.Body;
  });
  request.on("error", async function(err) {
    // Handle any error and exit
    if (err) {
      console.log('\nFailed retrieving the template file. key=' + templateFile + ', err=' + JSON.stringify(err) + ' >>> >>> >>>');
      sentry.captureException(new Error('Failed to retrieve the template file. ' + JSON.stringify(err)));
      await sentry.flush();
    }
  });
  await request.promise();
}

// Get email template from bucket
module.exports.putPdf = async (apiKey, sender, emailKey, pdf, pdfFile) => {
  console.log('\n\tUploading the PDF file: id=' + pdfFile + ' to S3 bucket=' + consts.BUCKET_TEMP);


  var putParams = {
    Bucket: consts.BUCKET_TEMP,
    Key: pdfFile,
    Body: pdf,
    ContentType : 'application/pdf'
  }

  const request = s3.putObject(putParams);
  request.on("success", async function(response) {
    var data = response.data;
    console.log('\t\tSuccessfuly uploaded PDF file');
  });
  request.on("error", async function(err) {
    // Handle any error and exit
    if (err) {
      console.log('\nFailed uploading the PDF file. key=' + pdfFile + ', err=' + JSON.stringify(err) + ' >>> >>> >>>');
      sentry.captureException(new Error('Failed to upload the PDF file. ' + JSON.stringify(err)));
      await sentry.flush();
    }
  });
  await request.promise();
}


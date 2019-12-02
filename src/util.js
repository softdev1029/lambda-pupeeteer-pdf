const consts = require('./const');
const app = require('./logic');
const sentry = require('@sentry/node');
const fs = require('fs');
const tconsts = require('../test/const');

// init sentry
sentry.init({ dsn: consts.SENTRY_DNS });

// Get apiKey from the email notification
module.exports.getApiKey = (mailNotification) => {
  console.log('\n\tGetting apiKey ...');

  var apiKey = consts.DEFAULT_API_KEY;

  for (var headerItem of mailNotification["headers"]) {
    if (headerItem.name === consts.API_KEY_HEADER_NAME) {
      apiKey = headerItem["value"];
      break;
    }
  }

  console.log('\t\tapiKey=' + apiKey);
  return apiKey;
}

// Get the sender from the email notification
module.exports.getSender = (mailNotification) => {
  console.log('\n\tGetting the sender ...');

  var sender = "";

  for (var headerItem of mailNotification["headers"]) {
    if (headerItem.name === "From") {
      sender = headerItem["value"];
      console.log('\t\tThe original sender value=' + sender);

      var senderMatches = sender.match(/<.*>$/g);
      if (senderMatches.length > 0) {
        sender = senderMatches[0].substring(1, senderMatches[0].length-1);
        console.log('\t\tThe final sender value=' + sender);
      }
      break;
    }
  }

  return sender;
}

// Check email by rule-set
module.exports.checkEmail = async (config, sender) => {
  console.log('\n\tChecking the email with rule-set of config');

  var isAccept = false;
  for (var rule of config) {
    if (rule == "+*") {
      isAccept = true;
      console.log('\t\tThe rule accepting any email exists. isAccept =', isAccept);
    } else if (rule == "-*") {
      isAccept = false;
      console.log('\t\tThe rule denying any email exists. isAccept =', isAccept);
    } else if (rule[0] == '+') {
      console.log('\t\tThe rule accepting the email=' + rule.substring(1) + ' exists.');
      if (sender == rule.substring(1) && !isAccept) {
        isAccept = true;
        console.log('\t\tThe rule matched the sender so that the email is accepted. isAccept =', isAccept);
      }
    } else if (rule[0] == '-') {
      console.log('\t\tThe rule denying the email=' + rule.substring(1) + ' exists.');
      if (sender == rule.substring(1) && isAccept) {
        isAccept = false;
        console.log('\t\tThe rule matched the sender so that the email is denied. isAccept =', isAccept);
      }
    }
  }
  console.log('\t\tFinally isAccept =', isAccept);
  if (!isAccept) {
    console.log('\nThe email is denied by rule-set: sender=' + sender + ' >>> >>> >>>');
    sentry.captureException(new Error('The email is denied by rule-set, sender=' + sender));
    await sentry.flush();
    return isAccept;
  }
  console.log('\t\tThe email is accepted by rule-set: sender=' + sender);
  return isAccept;
}

function filterEmailAddress(addresses) {
  if (addresses === null || addresses === undefined) {
    return '';
  }

  var filteredToArray = [];
  for (var i = 0; i < addresses.length; i++) {
    var elem = addresses[i];
    if (!elem.address.includes(consts.SES_DOMAIN)) {
      filteredToArray.push(elem.address);
    }
  }
  
  return filteredToArray.join(',');
}

module.exports.parseEmailBody = async (emailKey, emailMime) => {
  const simpleParser = require('mailparser').simpleParser;
  let parsed = await simpleParser(emailMime);
  //console.log(parsed);
  app.emailFrom = parsed.from.text;
  app.emailTo = filterEmailAddress(parsed.to.value);
  if (parsed.cc !== null && parsed.cc !== undefined) {
    app.emailCc = filterEmailAddress(parsed.cc.value);
  }
  if (parsed.bcc !== null && parsed.bcc !== undefined) {
    app.emailBcc = filterEmailAddress(parsed.bcc.value);
  }
  app.emailSubject = parsed.subject;
  app.emailBody = parsed.html;

  console.log('Parsed email: from=', app.emailFrom, ' , to=', app.emailTo, ', cc=', app.emailCc, ' , bcc=', app.emailBcc, ' , subject=', app.emailSubject);

  if (tconsts.saveToTemp) {
    var emailBodyFile = emailKey + ".html";
    fs.writeFile('./temp/' + emailBodyFile, parsed.html, (err) => {
      // throws an error, you could also catch it here
      if (err) {
        console.log('Failed saving Email body to local temp directory: path=./temp/' + emailBodyFile);
      } else {
        // success case, the file was saved
        console.log('Saved Email body to local temp directory: path=./temp/' + emailBodyFile);
      }
    });
  }
}

module.exports.delayForCallingApi = () => {
  return new Promise(resolve => setTimeout(resolve, 10000));
}

module.exports.genPdfName = (apiKey, emailKey) => {
  return apiKey + "_" + Date.now() + "_" + emailKey + ".pdf";
}

module.exports.genAttachPdfName = (subject) => {
  var replaced = subject.replace(/ /g, "_");
  return replaced + "_" + Date.now() + ".pdf";
}
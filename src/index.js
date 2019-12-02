const sentry = require('@sentry/node');
const app = require('./logic');
const consts = require('./const');
const tconsts = require('../test/const');
const util = require('./util');

// init sentry
sentry.init({ dsn: consts.SENTRY_DNS });

module.exports.pdfconvert_precheck = async (event, context) => {
  console.log('<<< <<< <<< ', consts.BUILD_TIME, 'Starting Lambda to pre-check the email ...', event, '\n');
  
  try {
    var snsMessage = event['Records'][0]['Sns']["Message"];
    snsMessage = JSON.parse(snsMessage);
    var mailNotification = snsMessage["mail"];
    var emailKey = mailNotification["messageId"];
    console.log('\n\tMail notification=' + JSON.stringify(mailNotification));
  } catch (err) {
    console.log('\nFailed parsing SNS notification. ', err, ' >>> >>> >>>');
    sentry.captureException(new Error('Failed parsing SNS notification. ' + JSON.stringify(err)));
    await sentry.flush();
    return;
  }

  // Get apiKey
  var apiKey = util.getApiKey(mailNotification);

  // Get the sender
  var sender = util.getSender(mailNotification);
  if (sender === "") {
    console.log('Done action with the failure (getSender) >>> >>> >>>');
    sentry.captureException(new Error('Failed getSender. ' + JSON.stringify(err)));
    await sentry.flush();
    return;
  }

  if (tconsts.directCheck) {
    app.precheck({emailKey: emailKey, apiKey: apiKey, sender: sender});
  } else {
    console.log('\tCalling pre-check API ... : ', consts.API_URL + consts.API_PRE_CHECK);
    app.svc.preCheck({
      data: {
        emailKey: emailKey,
        apiKey: apiKey,
        sender: sender,
      }
    }, async (err, data) => {
        if (err) {
          console.error('Done action with the failure (calling preCheck API) >>> >>> >>>:', err);
          sentry.captureException(new Error('Done action with the failure (calling preCheck API) ' + JSON.stringify(err)));
          await sentry.flush();
          return;
        }
    });
    await util.delayForCallingApi();
  }
  console.log('Done action of Lambda', ' >>> >>> >>>');
}
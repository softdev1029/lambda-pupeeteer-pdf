const pug = require('pug');
const chromium = require('chrome-aws-lambda');
const fs = require('fs');
const app = require('./logic');
const sentry = require('@sentry/node');
const consts = require('./const');
const tconsts = require('../test/const');

sentry.init({ dsn: consts.SENTRY_DNS });

module.exports.parseTemplate = async (apiKey, sender, emailKey, emailFrom, emailTo, emailSubject, emailBody, templateBody) => {
  // 1. Get Template
  console.log('\t\tRaw template: ' + templateBody);

  // 2. Render html from template with the eamil data
  let html = pug.render(templateBody, {from: emailFrom, to: emailTo, subject: emailSubject});
  html = emailBody;
  // console.log('\t\tRendered html: ' + html);

  // 3. Open puppeteer
  let browser = null
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true//chromium.headless
    });

    const page = await browser.newPage()
    await page.setContent(html);

    // 4. Create pdf file with puppeteer
    const pdf = await page.pdf({
      // format: 'A4',
      printBackground: true,
      // margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      scale: 0.8,
    });

    if (tconsts.saveToTemp) {
      fs.writeFile('./temp/' + emailKey + ".pdf", pdf, (err) => {
        // throws an error, you could also catch it here
        if (err) {
          console.log('Failed saving PDF to local temp directory: path=./temp/' + emailKey + ".pdf");
        } else {
          // success case, the file was saved
          console.log('Saved PDF to local temp directory: path=./temp/' + emailKey + ".pdf");
        }
      });
    }
    app.pdfBody = pdf;
  } catch (err) {
    console.log(err);
    console.log('\nFailed generating PDF. apiKey=' + apiKey + ' , sender=' + sender + ' , emailKey=' + emailKey + ', err=' + JSON.stringify(err) + ' >>> >>> >>>');
    sentry.captureException(new Error('Failed to retrieve the config file. ' + JSON.stringify(err)));
    await sentry.flush();
  } finally {
    if (browser !== null) {
      await browser.close()
    }
  }
}
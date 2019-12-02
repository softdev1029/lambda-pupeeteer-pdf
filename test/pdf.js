const pug = require('pug');
const chromium = require('chrome-aws-lambda');
const fs = require('fs');
const consts = require('./const');
const tconsts = require('../test/const');

async function main() {
  // 1. Get Template

  var templatePath = './s3/default.template.pug';
  var templateBody = '';
  fs.readFile(templatePath, (err, templateBody) => {
    // throws an error, you could also catch it here
    if (err) {
      console.log('Failed to read template: path=' + templatePath);
      console.log(err);
    } else {
      // success case, the file was saved
      console.log('Read template: path=' + templatePath);

      console.log('\t\tRaw template: ' + templateBody);

      // 2. Get HTML

      var emailPath = './test/data/real-email-test-original-20191122.txt';
      var emailBody = '';
      fs.readFile(emailPath, async (err, emailBody) => {
        // throws an error, you could also catch it here
        if (err) {
          console.log('Failed to read email html: path=' + emailPath);
          console.log(err);
        } else {
          // success case, the file was saved
          console.log('Read email html: path=' + emailPath);
          // console.log('emailBody=', emailBody);

          const simpleParser = require('mailparser').simpleParser;
          let parsed = await simpleParser(emailBody);
          emailBody = parsed.html;

          // console.log('\t\tRaw html: ', parsed);

          // 2. Render html from template with the eamil data
          let html = pug.render(templateBody, {from: parsed.from.text, to: parsed.to.text, subject: parsed.subject});
          html += emailBody;
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
              format: 'A4',
              printBackground: true,
              margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
            });

            var pdfPath = './temp/test.pdf';
            fs.writeFile(pdfPath, pdf, (err) => {
              // throws an error, you could also catch it here
              if (err) {
                console.log('Failed saving PDF to local temp directory: path=' + pdfPath);
              } else {
                // success case, the file was saved
                console.log('Saved PDF to local temp directory: path=' + pdfPath);
              }
            });
          } catch (err) {
            console.log(err);
            console.log('\nFailed generating PDF. err=' + JSON.stringify(err) + ' >>> >>> >>>');
          } finally {
            if (browser !== null) {
              await browser.close()
            }
          }
        }
      });
    }
  });
}

main();
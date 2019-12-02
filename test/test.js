const handler = require('../src/index');
var fs=require('fs');
var testData = 'test/data/event.json';
// var testData = 'test/data/convert-pdf.json';
// var testData = 'test/data/api-precheck.json';
// var testData = 'test/data/api-convert.json';

var args = process.argv.slice(2);
if (args.length > 0) {
  testData = args[0];
}

var data=fs.readFileSync(testData, 'utf8');
var event=JSON.parse(data);
handler.pdfconvert_precheck(event, null);
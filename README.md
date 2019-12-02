# pdf-tapdone

### S3 buckets
`convert.tapdone.com-configs/` and `convert.tapdone.com-temp/` in region `us-west-2`. for incoming emails it's `convert.tapdone.com-incoming/`. deployment packages will be in `convert.tapdone.com-deploy`

### SES
domain `convert.tapdone.com` in `us-west-2` region, receiver will be `pdf@convert.tapdone.com`\
sending emails via smtp `email-smtp.us-west-2.amazonaws.com`, port `25, 465 or 587`, use Transport Layer Security (TLS) `yes` - [screenshot](https://dl.dropbox.com/s/6gbg6ku1ky6wh32/Screenshot%202019-11-25%2009.43.33.png?dl=0), smtp credentials: account `pdfconvert-ses-smtp-svc`, username `AKIA57WK4KL4ZKTQVL6A`, password `BEZeuaXsjDCGiM90UnmKAGngipID6ZfUZOrjdNIKVbUX` from `noreply@mail.tapdone.com`

### SNS
name `SNS_pdfconvert_lambda-pdfconvert_precheck`, ARN `arn:aws:sns:us-west-2:961424413433:SNS_pdfconvert_lambda-pdfconvert_precheck`, sample configuration for SES - [screenshot](https://dl.dropbox.com/s/04kg6939r96farg/Screenshot%202019-11-17%2014.24.10.png?dl=0), subscription `358121bf-bc95-404f-aa6b-ee92d03a04d8` ([link](https://us-west-2.console.aws.amazon.com/sns/v3/home?region=us-west-2#/subscription/arn:aws:sns:us-west-2:961424413433:SNS_pdfconvert_lambda-pdfconvert_precheck:358121bf-bc95-404f-aa6b-ee92d03a04d8), [screenshot](https://dl.dropbox.com/s/a0myrquwrmkx2rp/Screenshot%202019-11-17%2014.10.58.png?dl=0)), logs use `arn:aws:iam::961424413433:role/pdfconvert-sns-writelogs` role.


### Service account for S3 access
account `pdfconvert-svc`, key id `AKIA57WK4KL46PTZ7RTR` and key secret `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`, region `us-west-2` 

### Console access
console `https://rapidus.signin.aws.amazon.com/console`, account `ext.victor-yampolsky`, auto-gen password ``Mynameis`1@``, github `softdev1029` 

### Deploying
account `pdfconvert-deploy`, key id `AKIA57WK4KL4VZKGC77I` and key secret `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` 
lambda execution role `arn:aws:iam::961424413433:role/pdfconvert-lambda-executor`, region `us-west-2`

### Sentry
account `pdfconvert@opagrp.com`, password `EzeLInEYmNARylINgLatI` 

# ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

## Deploy the AWS lambda function / API gateway

### 1. Environment Variables
Check the environment values in `src/const.js` in the project.
```
BUCKET_CONFIG: "convert.tapdone.com-configs"
BUCKET_TEMP: "convert.tapdone.com-temp"
SENTRY_DNS: "https://20998950600943508cd693e57edbe610@sentry.io/1788523"
```

### 2. AWS Credentials
Check the AWS credential in `awsconfig.global.json`, `awsconfig.s3.json` in the project -- they should match account `pdfconvert-deploy` mentioned above in the section *Deploying*
```
"accessKeyId": "AKIA57WK4KL4VZKGC77I",
"secretAccessKey": "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",
"region": "us-west-2"
```

### 3. Upload Config 
Upload a config file `s3/default.settings.json` in the project to the S3 bucket 'convert.tapdone.com-configs'.
If you have another config files according to apiKey like 'pdf1', please upload `pdf1.settings.json` file.

First configure aws cli with the s3 credentials (should match account `pdfconvert-svc` mentioned above in the section *Service account for S3 access*)
```
$ aws configure --profile profile_pdfconvert-svc
AWS Access Key ID [None]: AKIA57WK4KL46PTZ7RTR
AWS Secret Access Key [None]: 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
Default region name [None]: us-west-2
Default output format [None]: 
```
Also
```
$ aws configure --profile profile_pdfconvert-deploy
AWS Access Key ID [None]: AKIA57WK4KL4VZKGC77I
AWS Secret Access Key [None]: 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
Default region name [None]: us-west-2
Default output format [None]: 
```
On Ubuntu you  need to install it first `sudo apt  install awscli`.

Then upload the setting files
```
$ aws s3 cp ./s3/default.settings.json s3://convert.tapdone.com-configs/ --profile profile_pdfconvert-svc
upload: s3/default.settings.json to s3://convert.tapdone.com-configs/default.settings.json
```
```
$ aws s3 cp ./s3/default.settings.json s3://convert.tapdone.com-configs/apiKey1.settings.json --profile profile_pdfconvert-svc
upload: s3/default.settings.json to s3://convert.tapdone.com-configs/apiKey1.settings.json
```

#### 4. Upload Template
```
$ aws s3 cp ./s3/default.template.pug s3://convert.tapdone.com-configs/default.template.pug --profile profile_pdfconvert-svc ; aws s3 cp ./s3/default.template.pug s3://convert.tapdone.com-configs/apiKey1.template.pug --profile profile_pdfconvert-svc
upload: s3/default.template.pug to s3://convert.tapdone.com-configs/default.template.pug
upload: s3/default.template.pug to s3://convert.tapdone.com-configs/apiKey1.template.pug
```

The template file suffix should be '.template.pug'

### 5. Dependencies
Run 'yarn' for installing the dependencies.
On Ubuntu you  need to install it first `sudo apt install yarn`.
```
$ yarn
yarn install v1.19.1
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...

✨  Done in 2.33s.
```

### 6. Testing Locally
First you need to change the test data of the project folder.
- test/const.js
- test/data/event-sns.json
- test/data/convert-pdf.json
- test/data/api-event.json
- test/data/api-convert-pdf.json

Then run Claudia Local API Endpoint using Express
```
$ node ./node_modules/claudia-local-api/bin/claudia-local-api --api-module ./src/api.js
{"name":"claudia-local-api","hostname":"soft","pid":172220,"level":30,"msg":"Server listening on 3000","time":"2019-11-10T00:04:56.096Z","v":0}
```

Then run `node test/test.js test/data/event-sns.json`

Or we can test it via curl: `curl -H "Content-Type: application/json" -X  POST http://localhost:3000/pdfconvert_precheck -d @test/data/api-event.json` and `curl -H "Content-Type: application/json" -X  POST http://localhost:3000/pdfconvert_convert_pdf -d @test/data/api-convert-pdf.json`, `curl -H "Content-Type: application/json" -X  POST http://localhost:3000/pdfconvert_send_pdf -d @test/data/api-send-pdf.json`

### 7. Deploying Lambda for API Gateway and API Gateway
Make sure you install claudia `npm install claudia -g`

First deploy the API Gateway because we should get the API URL.
```
$ mv claudia.api.json claudia.json
$ claudia destroy --use-s3-bucket convert.tapdone.com-deploy --profile profile_pdfconvert-deploy
```
```
$ rm claudia.json
$ claudia create --name pdfconvert_api --region us-west-2 --api-module src/api --timeout 60 --memory 1024 --role arn:aws:iam::961424413433:role/pdfconvert-lambda-executor --use-s3-bucket convert.tapdone.com-deploy --profile profile_pdfconvert-deploy
...
...
saving configuration
{
  "lambda": {
    "role": "arn:aws:iam::961424413433:role/pdfconvert-lambda-executor",
    "name": "pdfconvert_api",
    "region": "us-west-2",
    "sharedRole": true
  },
  "api": {
    "id": "0raxo3dqv1",
    "module": "src/api",
    "url": "https://0raxo3dqv1.execute-api.us-west-2.amazonaws.com/latest"
  },
  "s3key": "8946676f-0e60-4625-a5b7-9f88b8364426.zip"
}
```
```
$ mv claudia.json claudia.api.json
```

### 7. Deploying Lambda for SES
```
$ mv claudia.lambda.json claudia.json
$ claudia destroy --use-s3-bucket convert.tapdone.com-deploy --profile profile_pdfconvert-deploy
```
```
$ rm claudia.json
$ claudia create --name pdfconvert_lambda --region us-west-2 --handler src/index.pdfconvert_precheck  --timeout 60 --memory 1024 --role arn:aws:iam::961424413433:role/pdfconvert-lambda-executor --use-s3-bucket convert.tapdone.com-deploy --profile profile_pdfconvert-deploy
...
...
saving configuration
{
  "lambda": {
    "role": "arn:aws:iam::961424413433:role/pdfconvert-lambda-executor",
    "name": "pdfconvert_lambda",
    "region": "us-west-2",
    "sharedRole": true
  },
  "s3key": "f6c660a7-5509-4af2-87d3-a72ddf2581f7.zip"
}
```
```
$ mv claudia.json claudia.lambda.json
```

Check API Gateway in AWS Console: `open https://us-west-2.console.aws.amazon.com/apigateway/home?region=us-west-2#/apis/win0giwprj/resources/xvuz0w0cie` and Lambda `open https://us-west-2.console.aws.amazon.com/apigateway/home?region=us-west-2#/apis/win0giwprj/resources/xf74e9nzcb`

Check the package files for Lambda and API Gateway: `https://s3.console.aws.amazon.com/s3/buckets/convert.tapdone.com-deploy/?region=us-west-2&tab=overview`

### 8. Updating both Lambda for API Gateway and Lambda for SES

Change `API_URL` in `src/const.js` with `pdfconvert_api` API_URL
API_URL: "https://0raxo3dqv1.execute-api.us-west-2.amazonaws.com/latest"

Update API Gateway first:
```
$ mv claudia.api.json claudia.json
```
```
$ claudia update --use-s3-bucket convert.tapdone.com-deploy --profile profile_pdfconvert-deploy
packaging files npm install -q --no-audit --production
...
...
updating REST API apigateway.setAcceptHeader
{
  "FunctionName": "pdfconvert_api",
  "FunctionArn": "arn:aws:lambda:us-west-2:961424413433:function:pdfconvert_api:12",
  "Runtime": "nodejs8.10",
  "Role": "arn:aws:iam::961424413433:role/pdfconvert-lambda-executor",
  "Handler": "src/api.proxyRouter",
  "CodeSize": 60551923,
  "Description": "convert.tapdone.com",
  "Timeout": 60,
  "MemorySize": 1024,
  "LastModified": "2019-11-14T19:03:42.686+0000",
  "CodeSha256": "iCvHuLknRN/6n8+1pFDBFZle+6+2l300qPw6o8Dbmoc=",
  "Version": "12",
  "KMSKeyArn": null,
  "TracingConfig": {
    "Mode": "PassThrough"
  },
  "MasterArn": null,
  "RevisionId": "ab97b0b3-2a6c-4346-92d1-3a5e17c2627a",
  "s3key": "0b594224-a2e5-4660-b8cd-eadd8d3952ec.zip",
  "url": "https://0raxo3dqv1.execute-api.us-west-2.amazonaws.com/latest"
}
```
```
$ mv claudia.json claudia.api.json
```

Update Lambda for SES next:
```
$ mv claudia.lambda.json claudia.json
```
```
$ claudia update --use-s3-bucket convert.tapdone.com-deploy --profile profile_pdfconvert-deploy
packaging files npm install -q --no-audit --production
...
...
updating Lambda lambda.setupRequestListeners
{
  "FunctionName": "pdfconvert_lambda",
  "FunctionArn": "arn:aws:lambda:us-west-2:961424413433:function:pdfconvert_lambda:2",
  "Runtime": "nodejs8.10",
  "Role": "arn:aws:iam::961424413433:role/pdfconvert-lambda-executor",
  "Handler": "src/index.pdfconvert_precheck",
  "CodeSize": 60552365,
  "Description": "convert.tapdone.com",
  "Timeout": 60,
  "MemorySize": 1024,
  "LastModified": "2019-11-14T19:09:20.634+0000",
  "CodeSha256": "ZFau5W0DjyzY3OuCTpX+Yl22f9EVuV9aL2qAfomLxxM=",
  "Version": "2",
  "KMSKeyArn": null,
  "TracingConfig": {
    "Mode": "PassThrough"
  },
  "MasterArn": null,
  "RevisionId": "2961f0cf-46b0-4e6f-b4df-4b6f372bb8c8",
  "s3key": "bb4341b0-e774-4437-aef9-65e2db804bef.zip"
}
```
```
$ mv claudia.json claudia.lambda.json
```

### 9. Testing Deployment
Upload test email:

```
$ aws s3 cp ./s3/test-email s3://convert.tapdone.com-temp/ --profile profile_pdfconvert-svc
upload: s3/test-email to s3://convert.tapdone.com-temp/test-email
```

```
$ curl -H "Content-Type: application/json" -X  POST https://0raxo3dqv1.execute-api.us-west-2.amazonaws.com/latest/pdfconvert_precheck -d @test/data/api-event.json
"The email is processed. default_1573758610742.pdf will be generated."
```

We can run convert_pdf API independently.

```
$ curl -H "Content-Type: application/json" -X  POST https://0raxo3dqv1.execute-api.us-west-2.amazonaws.com/latest/pdfconvert_convert_pdf -d @test/data/api-convert-pdf.json
"The email is processed: apiKey=apiKey1, emailBody=This is the test email., pdf=apiKey1_1573758636655.pdf"
```

Check the generated PDF at `https://s3.console.aws.amazon.com/s3/buckets/convert.tapdone.com-temp/?region=us-west-2&tab=overview#`

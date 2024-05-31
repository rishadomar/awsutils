. setenv dev

### Create Queue

npx ts-node main createQueue tchc-pdf-sqs-dev
Successfully created SQS queue named tchc-pdf-sqs-dev
Queue created: https://sqs.eu-west-1.amazonaws.com/909940581757/tchc-pdf-sqs-dev

### Create API Gateway

npx ts-node main createRestApiAndSQSIntegration tchc-apig-dev tchc-pdf-sqs-dev
Copy the id to setenv

### List API Gateways

npx ts-node main listRestApis

### Deploy the API Gateway

npx ts-node main deployApiGateway tchc-apig-dev

### Delete

npx ts-node main deleteApiGateway tchc-apig-dev

### Call the API

Does not work!
npx ts-node main makeApiRequest tchc-apig-dev '{"test": "hello world", "something": "else"}'

Use curl instead
curl "https://${API_GATEWAY_ID}.execute-api.${AWS_DEFAULT_REGION}.amazonaws.com/${STAGE}/entry" -X POST -H "Content-Type: application/json" -d '{"test": "hello world", "something": "else"}'

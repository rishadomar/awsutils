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

### Step 2: Manage your py code. See tchc-pdf-wrk

### Step 3:

npx ts-node main createRoleForLambdaFunction report_handler
Copy the arn into setenv

npx ts-node main attachPoliciesToRole $LAMBDA_FUNCTION_ROLE

npx ts-node main createLambdaFunction report_handler $LAMBDA_FUNCTION_ROLE

npx ts-node main updateLambdaFunction report_handler

npx ts-node main createEventSourceMapping $QUEUE_ARN report_handler

I deployed manually (using the aws console) to the dev stage
curl https://n40h3zmr66.execute-api.eu-west-1.amazonaws.com/entry -X POST -H "x-api-key: hk3P1499Gl8wqAuEgyq69aRZrE1hma9o2RVEQAVv" -d '{"Records": [{"body": "{\"first_name\": \"Rishad\",\"last_name\": \"Test\",\"email\": \"rishad@aux.co.za\",\"country\": \"ZA\",\"company\": \"Aux Design Studio\"}"}]}'

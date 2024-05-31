import process from 'process';
import { createQueue } from './sqsApi';
import {
    createApiGateway,
    createRestApiAndSQSIntegration,
    deleteApiGateway,
    deployApiGateway,
    listRestApis
} from './apigatewayApi';
import { Stage } from './types';

const ActionHelp = 'help';
const ActionCreateQueue = 'createQueue';
const ActionCreateRestApiAndSQSIntegration = 'createRestApiAndSQSIntegration';
const ActionListRestApis = 'listRestApis';
const ActionDeployApiGateway = 'deployApiGateway';
const ActionMakeApiRequest = 'makeApiRequest';
const ActionDeleteApiGateway = 'deleteApiGateway';

/**
 * Display usage message
 */
function displayUsageMessage() {
    console.log('Usage:');
}

//
// Main
//
const stage = process.env.STAGE as Stage;
if (stage !== 'dev' && stage !== 'prod') {
    throw new Error('STAGE must be either "dev" or "prod"');
}

const region = process.env.AWS_DEFAULT_REGION;
if (region === undefined) {
    throw new Error('AWS_DEFAULT_REGION is required');
}

const awsAccountId = process.env.ACCOUNT_ID;
if (awsAccountId === undefined) {
    throw new Error('ACCOUNT_ID is required');
}

let action = ActionHelp;
if (process.argv.length > 2) {
    action = process.argv[2];
}
try {
    switch (action) {
        case ActionCreateQueue: {
            const queueName = process.argv[3];
            if (queueName === undefined || queueName === '') {
                throw new Error('Queue name is required');
            }
            (async () => {
                const result = await createQueue(queueName);
                console.log('Queue created:', result);
            })();
            break;
        }

        case ActionCreateRestApiAndSQSIntegration: {
            const apiName = process.argv[3];
            if (apiName === undefined || apiName === '') {
                throw new Error('API name is required');
            }
            const queueName = process.argv[4];
            if (queueName === undefined || queueName === '') {
                throw new Error('Queue name is required');
            }

            (async () => {
                const result = await createRestApiAndSQSIntegration(apiName, queueName, awsAccountId, region);
                console.log('API Gateway function created with SQS integration:', result);
            })();

            break;
        }

        case ActionListRestApis: {
            (async () => {
                const result = await listRestApis();
                console.log('REST APIs:', result);
            })();
            break;
        }

        case ActionDeployApiGateway: {
            const apiName = process.argv[3];
            if (apiName === undefined || apiName === '') {
                throw new Error('API name is required');
            }

            (async () => {
                await deployApiGateway(apiName, stage);
            })();

            break;
        }

        case ActionMakeApiRequest: {
            const apiName = process.argv[3];
            if (apiName === undefined || apiName === '') {
                throw new Error('API name is required');
            }
            const message = process.argv[4];
            if (message === undefined || message === '') {
                throw new Error('Message is required');
            }

            (async () => {
                const apiResponse = await createApiGateway(apiName);

                const response = await fetch(
                    `https://${apiResponse.id}.execute-api.${region}.amazonaws.com/prod/entry`,
                    {
                        method: 'POST',
                        body: JSON.stringify(message)
                    }
                );
                console.log('API call response:', response);
            })();

            break;
        }

        case ActionDeleteApiGateway: {
            const apiName = process.argv[3];
            if (apiName === undefined || apiName === '') {
                throw new Error('API name is required');
            }

            (async () => {
                const api = await deleteApiGateway(apiName);
                console.log('API Gateway deleted');
            })();

            break;
        }

        case ActionHelp:
        default:
            console.log('Unknown action: ' + action);
            displayUsageMessage();
            break;
    }
} catch (error) {
    console.log('Problem encountered performing action "' + action + '" ' + error);
}

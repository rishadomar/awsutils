import {
    APIGatewayClient,
    CreateRestApiCommand,
    CreateResourceCommand,
    PutMethodCommand,
    PutIntegrationCommand,
    GetRestApisCommand,
    GetResourcesCommand,
    CreateDeploymentCommand,
    PutIntegrationResponseCommand,
    PutMethodResponseCommand,
    DeleteRestApiCommand
} from '@aws-sdk/client-api-gateway';
import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, GetRoleCommand } from '@aws-sdk/client-iam';
import process from 'process';
import { Stage } from './types';

// Initialize clients
const apiGateway = new APIGatewayClient({ region: process.env.AWS_DEFAULT_REGION });
const iam = new IAMClient({ region: process.env.AWS_DEFAULT_REGION });

async function createRole(apiName: string) {
    let role;
    try {
        // Try to get the role
        const getRoleResponse = await iam.send(new GetRoleCommand({ RoleName: `${apiName}Role` }));
        role = getRoleResponse.Role;
    } catch (error) {
        if ((error as Error).name === 'NoSuchEntityException') {
            // If the role does not exist, create it
            const createRoleResponse = await iam.send(
                new CreateRoleCommand({
                    RoleName: `${apiName}Role`,
                    AssumeRolePolicyDocument: JSON.stringify({
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Effect: 'Allow',
                                Principal: { Service: 'apigateway.amazonaws.com' },
                                Action: 'sts:AssumeRole'
                            }
                        ]
                    })
                })
            );

            // Attach policy to role
            await iam.send(
                new AttachRolePolicyCommand({
                    RoleName: `${apiName}Role`,
                    PolicyArn: 'arn:aws:iam::aws:policy/AmazonSQSFullAccess'
                })
            );

            role = createRoleResponse.Role;
        } else {
            // If the error is not 'NoSuchEntityException', rethrow it
            throw error;
        }
    }
    if (!role) {
        throw new Error('Failed to get or create role for API Gateway');
    }
    return role;
}

export async function createApiGateway(apiName: string) {
    let api;

    // Get all REST APIs
    const apisResponse = await apiGateway.send(new GetRestApisCommand({}));

    if (!apisResponse.items) {
        throw new Error('Failed to get APIs');
    }

    // Find the API with the specified name
    const existingApi = apisResponse.items.find((api) => api.name === apiName);

    if (existingApi) {
        // If the API exists, use it
        api = existingApi;
    } else {
        // If the API does not exist, create it
        const createApiResponse = await apiGateway.send(new CreateRestApiCommand({ name: apiName }));
        api = createApiResponse;
    }

    if (!api) {
        throw new Error('Failed to find or create API Gateway');
    }

    return api;
}

export async function deleteApiGateway(apiName: string) {
    // Get all REST APIs
    const apisResponse = await apiGateway.send(new GetRestApisCommand({}));

    if (!apisResponse.items) {
        throw new Error('Failed to get APIs');
    }

    // Find the API with the specified name
    const existingApi = apisResponse.items.find((api) => api.name === apiName);

    if (existingApi) {
        // If the API exists, delete it
        await apiGateway.send(new DeleteRestApiCommand({ restApiId: existingApi.id }));
    } else {
        throw new Error('API does not exist');
    }
}

/**
 * Create a REST API and integrate it with an SQS queue
 * @param apiName Name of the REST API
 * @param queueUrl URL of the SQS queue
 */
export async function createRestApiAndSQSIntegration(
    apiName: string,
    queueName: string,
    awsAccountId: string,
    awsRegion: string
) {
    // Create IAM role for API Gateway
    const role = await createRole(apiName);

    // Create REST API
    const api = await createApiGateway(apiName);

    console.log('Api details: ', api);

    // Get the root resource of the API
    const allResources = await apiGateway.send(new GetResourcesCommand({ restApiId: api.id }));
    const rootResource = allResources.items?.find((resource) => resource.path === '/');

    if (!rootResource) {
        throw new Error('Failed to get root resource of API Gateway');
    }

    // Create a resource under the root resource
    const resource = await apiGateway.send(
        new CreateResourceCommand({ restApiId: api.id, parentId: rootResource.id, pathPart: 'entry' })
    );

    // Create a POST method for the resource
    await apiGateway.send(
        new PutMethodCommand({
            restApiId: api.id,
            resourceId: resource.id,
            httpMethod: 'POST',
            authorizationType: 'NONE'
        })
    );

    // Set the SQS as the integration for the POST method
    await apiGateway.send(
        new PutIntegrationCommand({
            restApiId: api.id,
            resourceId: resource.id,
            httpMethod: 'POST',
            type: 'AWS',
            integrationHttpMethod: 'POST',
            uri: `arn:aws:apigateway:${awsRegion}:sqs:path/${awsAccountId}/${queueName}`,
            //uri: `arn:aws:apigateway:${awsRegion}:sqs:action/SendMessage/${queueName}`,
            credentials: role.Arn,
            requestParameters: {
                'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            requestTemplates: {
                'application/json': 'Action=SendMessage&MessageBody=$input.body'
            }
            // requestTemplates: {
            //     'application/json': `{
            //         "Action": "SendMessage",
            //         "Version": "2012-11-05",
            //         "MessageBody": "$input.body",
            //         "QueueUrl": "https://sqs.${awsRegion}.amazonaws.com/${awsAccountId}/${queueName}"
            //     }`
            // }
        })
    );

    await apiGateway.send(
        new PutIntegrationResponseCommand({
            restApiId: api.id,
            resourceId: resource.id,
            httpMethod: 'POST',
            statusCode: '200',
            responseTemplates: {
                'application/json': ''
            }
        })
    );

    await apiGateway.send(
        new PutMethodResponseCommand({
            restApiId: api.id,
            resourceId: resource.id,
            httpMethod: 'POST',
            statusCode: '200',
            responseModels: {
                'application/json': 'Empty'
            }
        })
    );

    //"MessageBody" : $util.escapeJavaScript($input.json('$')),

    console.log(`Successfully created API Gateway named ${apiName} with SQS integration`);
}

export async function listRestApis() {
    const response = await apiGateway.send(new GetRestApisCommand({}));
    console.log('APIs:', response.items);
}

export async function deployApiGateway(apiName: string, stage: Stage) {
    const api = await createApiGateway(apiName);
    const result = await apiGateway.send(new CreateDeploymentCommand({ restApiId: api.id, stageName: stage }));
    console.log('Deploy API result:', result);
}

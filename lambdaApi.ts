import { CreateRoleCommand, AttachRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import {
    LambdaClient,
    CreateFunctionCommand,
    PackageType,
    UpdateFunctionCodeCommand,
    CreateEventSourceMappingCommand
} from '@aws-sdk/client-lambda';
import process from 'process';

const lambda = new LambdaClient({ region: process.env.AWS_DEFAULT_REGION });
const iam = new IAMClient({ region: process.env.AWS_DEFAULT_REGION });

export async function createRoleForLambdaFunction(functionName: string) {
    const params = {
        RoleName: `${functionName}Role`,
        AssumeRolePolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { Service: 'lambda.amazonaws.com' },
                    Action: 'sts:AssumeRole'
                }
            ]
        })
    };

    const command = new CreateRoleCommand(params);

    try {
        const data = await iam.send(command);
        console.log('Role created:', data, data.Role?.Arn);

        // Attach the policy that allows creating and updating Lambda functions
        const attachPolicyCommand = new AttachRolePolicyCommand({
            RoleName: `${functionName}Role`,
            PolicyArn: 'arn:aws:iam::aws:policy/AWSLambda_FullAccess'
        });
        await iam.send(attachPolicyCommand);
        console.log('Policy attached to role');

        return data.Role?.Arn;
    } catch (err) {
        console.error('Error creating role:', err);
    }
}

// arn:aws:iam::909940581757:role/report_handlerRole
export async function attachPoliciesToRole(roleName: string) {
    const policyArns = [
        'arn:aws:iam::aws:policy/AmazonSQSFullAccess',
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        'arn:aws:iam::aws:policy/AmazonS3FullAccess'
    ];

    for (const policyArn of policyArns) {
        const params = {
            RoleName: roleName,
            PolicyArn: policyArn
        };

        const command = new AttachRolePolicyCommand(params);

        try {
            await iam.send(command);
            console.log(`Policy ${policyArn} attached to role`);
        } catch (err) {
            console.error(`Error attaching policy ${policyArn} to role:`, err);
        }
    }
}

export async function createLambdaFunction(functionName: string, roleArn: string) {
    const params = {
        Code: {
            ImageUri: `${process.env.ACCOUNT_ID}.dkr.ecr.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${process.env.DOCKER_ECR_REPO}:latest`
        },
        FunctionName: functionName,
        Timeout: 17,
        Role: roleArn,
        PackageType: PackageType.Image
    };

    const command = new CreateFunctionCommand(params);

    try {
        const data = await lambda.send(command);
        console.log('Lambda function created:', data.FunctionArn);
    } catch (err) {
        console.error('Error creating Lambda function:', err);
    }
}

export async function createLambdaFunctionFromZip(functionName: string, roleArn: string) {
    const params = {
        Code: {
            ZipFile: undefined //Buffer.from('console.log("Hello, world!")')
        },
        FunctionName: functionName,
        Timeout: 17,
        Role: roleArn
    };

    const command = new CreateFunctionCommand(params);

    try {
        const data = await lambda.send(command);
        console.log('Lambda function created:', data.FunctionArn);
    } catch (err) {
        console.error('Error creating Lambda function:', err);
    }
}

export async function updateLambdaFunction(functionName: string) {
    const params = {
        FunctionName: functionName,
        Timeout: 16,
        ImageUri: `${process.env.ACCOUNT_ID}.dkr.ecr.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${process.env.DOCKER_ECR_REPO}:latest`
    };

    console.log('Params: ', params);

    const command = new UpdateFunctionCodeCommand(params);

    try {
        const data = await lambda.send(command);
        console.log('Lambda function updated:', data.FunctionArn);
    } catch (err) {
        console.error('Error updating Lambda function:', err);
    }
}

export async function createEventSourceMapping(queueArn: string, functionName: string) {
    const params = {
        EventSourceArn: queueArn, // The ARN of the SQS queue
        FunctionName: functionName, // The name of the Lambda function
        Enabled: true, // Set to true to enable the event source upon creation
        BatchSize: 1 // The maximum number of items to retrieve in a single batch
    };

    const command = new CreateEventSourceMappingCommand(params);

    try {
        const data = await lambda.send(command);
        console.log('Event source mapping created:', data.UUID);
    } catch (err) {
        console.error('Error creating event source mapping:', err);
    }
}

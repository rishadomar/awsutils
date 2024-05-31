import { CreateRoleCommand, AttachRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { LambdaClient, CreateFunctionCommand, PackageType, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda';
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

export async function createLambdaFunction(functionName: string, roleArn: string) {
    const params = {
        Code: {
            ImageUri: `${process.env.ACCOUNT_ID}.dkr.ecr.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${process.env.DOCKER_ECR_REPO}:latest`
        },
        FunctionName: functionName,
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

export async function updateLambdaFunction(functionName: string) {
    const params = {
        FunctionName: functionName,
        ImageUri: `${process.env.ACCOUNT_ID}.dkr.ecr.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${process.env.DOCKER_ECR_REPO}:latest`
    };

    const command = new UpdateFunctionCodeCommand(params);

    try {
        const data = await lambda.send(command);
        console.log('Lambda function updated:', data.FunctionArn);
    } catch (err) {
        console.error('Error updating Lambda function:', err);
    }
}

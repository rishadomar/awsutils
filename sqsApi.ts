import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';
import { fromEnv } from '@aws-sdk/credential-provider-env';
import process from 'process';

const sqs = new SQSClient({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: fromEnv()
});

export async function createQueue(queueName: string) {
    const params = {
        QueueName: queueName,
        Attributes: {
            DelaySeconds: '60',
            MessageRetentionPeriod: '86400'
        }
    };

    try {
        const command = new CreateQueueCommand(params);
        const data = await sqs.send(command);
        console.log(`Successfully created SQS queue named ${queueName}`);
        return data.QueueUrl;
    } catch (error) {
        console.error(`Error creating SQS queue named ${queueName}: `, error);
    }
}

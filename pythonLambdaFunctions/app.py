def handler1(event, context):
    # Your code here
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda 1!'
    }


def handler2(event, context):
    # Your code here
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda 2!'
    }

import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context
} from 'aws-lambda'
import {
    Logger
} from '@aws-lambda-powertools/logger'
import {
    DynamoDBClient,
    DeleteItemCommand,
    DeleteItemCommandInput,
    DynamoDBServiceException
} from '@aws-sdk/client-dynamodb'
import { SuccessResponseType } from '../../lib/SuccessResponseType.js'
import { ErrorResponseType } from '../../lib/ErrorResponseType.js'
import {
    ${{ values.collection_name_cap }}ItemKeys,
    getKeys
} from '../../lib/${{ values.collection_name_cap }}Item.js'

// Initialize Logger
const LOGGER = new Logger()

// Initialize DynamoDB Client
const DDB_CLIENT = new DynamoDBClient()
const DDB_TABLE_NAME = process.env.DDB_TABLE_NAME || ''


/**
 * Delete item from the DynamoDB table.
 *
 * @param itemKeys - The primary key and sort key of the item.
 *
 * @returns Promise<void>
 */
export async function deleteItem(itemKeys: ${{ values.collection_name_cap }}ItemKeys): Promise<void> {
    const params: DeleteItemCommandInput = {
        TableName: DDB_TABLE_NAME,
        Key: {
            'pk': { S: itemKeys.pk },
            'sk': { S: itemKeys.sk }
        },
        ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }

    try {
        const command = new DeleteItemCommand(params)
        const output = await DDB_CLIENT.send(command)
        LOGGER.debug('DeleteItemCommand succeeded', { output })
    } catch (error) {
        LOGGER.error({
            error: <DynamoDBServiceException>error,
            name: (<DynamoDBServiceException>error).name,
            message: (<DynamoDBServiceException>error).message,
        })
        throw error
    }
}


/**
 * Event handler for delete (DELETE) API operations
 *
 * @param event - The API Gateway event
 * @param context - The Lambda runtime context
 *
 * @returns Promise<APIGatewayProxyResult>
 */
export async function handler (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    LOGGER.debug('Received event', { event })
    const event_id = context.awsRequestId

    const id = event.pathParameters?.id as string
    const itemKeys = getKeys(id)

    let statusCode: number
    let body: string
    try {
        await deleteItem(
            itemKeys
        )
        statusCode = 200
        const response: SuccessResponseType = { "request_id": event_id }
        body = JSON.stringify(response)
    } catch (error) {
        LOGGER.error("Operation failed", { event })
        const fault = (<DynamoDBServiceException>error).$fault
        switch (fault) {
            case 'client':
                statusCode = 400
                break;
            default:
                statusCode = 500
                break;
        }
        const errorResponse: ErrorResponseType = {
            error: (<Error>error).name,
            message: (<Error>error).message
        }
        body = JSON.stringify(errorResponse)
    }

    return {
        statusCode,
        body
    }
}

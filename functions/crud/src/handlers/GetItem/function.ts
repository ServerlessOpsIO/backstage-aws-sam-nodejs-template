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
    GetItemCommand,
    GetItemCommandInput,
    GetItemCommandOutput,
    DynamoDBServiceException
} from '@aws-sdk/client-dynamodb'
import {
    unmarshall
} from '@aws-sdk/util-dynamodb'
import { ErrorResponseType } from '../../lib/ErrorResponseType.js'
import { ItemKeys, ItemData, getKeys } from '../../lib/Item.js'

// Initialize Logger
const LOGGER = new Logger()

// Initialize DynamoDB Client
const DDB_CLIENT = new DynamoDBClient()
const DDB_TABLE_NAME = process.env.DDB_TABLE_NAME || ''


/**
 * Retrieve item from the DynamoDB table.
 *
 * @param itemKeys - The primary key and sort key of the item.
 *
 * @returns Promise<ItemData>
 */
export async function getItem(itemKeys: ItemKeys): Promise<ItemData> {
    const params: GetItemCommandInput = {
        TableName: DDB_TABLE_NAME,
        Key: {
            'pk': { S: itemKeys.pk },
            'sk': { S: itemKeys.sk }
        },
        ProjectionExpression: 'apiVersion, kind, metadata, spec'
    }

    let output: GetItemCommandOutput
    try {
        const command = new GetItemCommand(params)
        output = await DDB_CLIENT.send(command)
        LOGGER.debug('GetItemCommand succeeded', { output })
    } catch (error) {
        LOGGER.error({
            error: <DynamoDBServiceException>error,
            name: (<DynamoDBServiceException>error).name,
            message: (<DynamoDBServiceException>error).message,
        })
        throw error
    }

    // This here I believe just to satisfy TypeScript. DDB should throw an error when the item
    // is not found
    if ( typeof output.Item == 'undefined' ) {
        throw new Error('Item not found')
    }

    return unmarshall(output.Item) as ItemData
}


/**
 * Event handler for retrieve (GET) API operations
 *
 * @param event - The API Gateway event
 * @param context - The Lambda runtime context
 *
 * @returns Promise<APIGatewayProxyResult>
 */
export async function handler (event: APIGatewayProxyEvent, _: Context): Promise<APIGatewayProxyResult> {
    LOGGER.debug('Received event', { event })

    const id = event.pathParameters?.id as string
    const itemKeys = getKeys(id)

    let statusCode: number
    let body: string
    try {
        const itemData: ItemData = await getItem(
            itemKeys,
        )
        statusCode = 200
        body = JSON.stringify(itemData)
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

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
    DynamoDBServiceException,
    PutItemCommand,
    PutItemCommandInput,
} from '@aws-sdk/client-dynamodb'
import {
    marshall
} from '@aws-sdk/util-dynamodb'
import { SuccessResponseType } from '../../lib/SuccessResponseType.js'
import { ErrorResponseType } from '../../lib/ErrorResponseType.js'
import { ${{ values.collection_name_cap }}ItemKeys, ${{ values.collection_name_cap }}ItemData, ${{ values.collection_name_cap }}Item, createKeys, getKeys } from '../../lib/${{ values.collection_name_cap }}Item.js'

// Initialize Logger
const LOGGER = new Logger()

//Initialize DynamoDB Client
const DDB_CLIENT = new DynamoDBClient()
const DDB_TABLE_NAME = process.env.DDB_TABLE_NAME || ''


/**
 * Put item into the DynamoDB table.
 *
 * @param itemKeys - The primary key and sort key of the item.
 * @param itemData - The data to be stored in the item.
 * @param upsert - If true, the item will be updated if it already exists.
 *
 * @returns void
 */
export async function putItem(itemKeys: ${{ values.collection_name_cap }}ItemKeys, itemDada: ${{ values.collection_name_cap }}ItemData, upsert: boolean): Promise<void> {

    const item: ${{ values.collection_name_cap }}Item = {
        ...itemKeys,
        ...itemDada
    }

    const params: PutItemCommandInput = {
        TableName: DDB_TABLE_NAME,
        Item: marshall(item),
    }

    if (!upsert) {
        params.ConditionExpression = 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }

    try {
        const command = new PutItemCommand(params)
        const output = await DDB_CLIENT.send(command)
        LOGGER.debug('PutItemCommand succeeded', { output })
    } catch (error) {
        LOGGER.error({
            name: (<DynamoDBServiceException>error).name,
            message: (<DynamoDBServiceException>error).message,
            error: <DynamoDBServiceException>error,
        })
        throw error
    }
}


/**
 * Event handler for create (POST) API operations
 *
 * @param event - The API Gateway event
 * @param context - The Lambda runtime context
 *
 * @returns Promise<APIGatewayProxyResult>
 */
export async function handler_create (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    LOGGER.debug('Received event', { event })

    const request_id = context.awsRequestId
    const itemKeys = createKeys()
    const itemData: ${{ values.collection_name_cap }}ItemData = JSON.parse(event.body || '{}')

    let statusCode: number
    let body: string
    try {
        await putItem(itemKeys, itemData, false)
        statusCode = 201
        const response: SuccessResponseType = { "request_id": request_id }
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

/**
 * Event handler for upsert (PUT) API operations
 *
 * @param event - The API Gateway event
 * @param context - The Lambda runtime context
 *
 * @returns Promise<APIGatewayProxyResult>
 */
export async function handler_upsert (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    LOGGER.debug('Received event', { event })

    const event_id = context.awsRequestId
    const id = event.pathParameters?.id as string
    const itemKeys = getKeys(id)
    // All already validated at gateway
    const itemData: ${{ values.collection_name_cap }}ItemData = JSON.parse(event.body || '{}')

     /*
    // Validate requested ID against body data
    if (
        itemData. !== event.pathParameters?.id
    ) {
        const response: ErrorResponseType = {
            error: 'BadRequest',
            message: '${{ values.collection_name_cap }}Item metadata does not match request path'
        }
        return {
            statusCode: 400,
            body: JSON.stringify(response)
        }
    }
    */

    let statusCode: number
    let body: string
    try {
        await putItem(itemKeys, itemData, true)
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
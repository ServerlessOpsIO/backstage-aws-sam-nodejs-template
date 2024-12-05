import { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { mockClient } from "aws-sdk-client-mock"
import 'aws-sdk-client-mock-jest';
import {
    DynamoDBClient,
    DeleteItemCommand,
    ConditionalCheckFailedException,
    DynamoDBServiceException
} from '@aws-sdk/client-dynamodb'
import {
    marshall
} from '@aws-sdk/util-dynamodb'
import { ${{ values.collection_name_cap }}ItemKeys } from '../../lib/${{ values.collection_name_cap }}Item.js'

// Mock clients
const mockDdbTableName = 'mockTable'
const mockDdbClient = mockClient(DynamoDBClient)

// Function under test
import * as func from './function.js'
jest.mock('./function.js', () => {
    return {
        ...jest.requireActual('./function.js'),
        DDB_CLIENT: mockDdbClient,
    }
})

describe('Delete${{ values.collection_name_cap }}Item', () => {
    beforeEach(() => {
        mockDdbClient.reset()
    })

    afterEach(() => { })

    describe('deleteItem()', () => {
        let itemKeys: ${{ values.collection_name_cap }}ItemKeys

        beforeEach(() => {
            itemKeys = { pk: 'pk', sk: 'sk' }
        })


        describe('should succeed when', () => {
            test('deleting item', async () => {
                mockDdbClient
                    .on(DeleteItemCommand)
                    .resolves({})

                await func.deleteItem(itemKeys)

                expect(mockDdbClient).toHaveReceivedCommand(DeleteItemCommand)
            })
        })

        describe('should fail when', () => {
            test('deleting non-existent', async () => {
                mockDdbClient
                    .on(DeleteItemCommand)
                    .rejects(new ConditionalCheckFailedException({
                        $metadata: {},
                        message: 'The conditional request failed',
                    }))

                await expect(
                    func.deleteItem(itemKeys)
                ).rejects.toThrow(ConditionalCheckFailedException)

                expect(mockDdbClient).toHaveReceivedCommand(DeleteItemCommand)

            })
        })
    })

    describe('handler()', () => {
        let event: APIGatewayProxyEvent
        let context: Context

        beforeEach(() => {
            event = {
                body: null,
                headers: {},
                multiValueHeaders: {},
                httpMethod: 'DELETE',
                isBase64Encoded: false,
                path: '',
                pathParameters: { id: 'id' },
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {} as any,
                resource: ''
            }
            context = { awsRequestId: 'request-id' } as any
        })

        describe('should succeed when', () => {
            test('deleting item', async () => {
                const result = await func.handler(event, context)

                const mockItem = { pk: '${{ values.collection_name }}#id', sk: '${{ values.collection_name }}#id' }

                expect(mockDdbClient).toHaveReceivedCommandWith(
                    DeleteItemCommand,
                    {
                        Key: marshall(mockItem),
                        ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
                    }
                )

                expect(result.statusCode).toBe(200)
                expect(JSON.parse(result.body)).toEqual({ request_id: 'request-id' })
            })
        })

        describe('should fail when', () => {
            test('deleting non-existent item', async () => {
                mockDdbClient
                    .on(DeleteItemCommand)
                    .rejects(new ConditionalCheckFailedException({
                        $metadata: {},
                        message: 'The conditional request failed',
                    }))

                const result = await func.handler(event, context)
                expect(result.statusCode).toBe(400)
            })
            test('DDB client error; returns 400', async () => {
                mockDdbClient
                    .on(DeleteItemCommand)
                    .rejects(new DynamoDBServiceException({
                        $fault: 'client',
                        $metadata: {},
                        name: 'MockedError',
                        message: 'mocked client error',
                    }))

                const result = await func.handler(event, context)
                expect(result.statusCode).toBe(400)
            })
            test('DDB server error; returns 500', async () => {
                mockDdbClient
                    .on(DeleteItemCommand)
                    .rejects(new DynamoDBServiceException({
                        $fault: 'server',
                        $metadata: {},
                        name: 'MockedError',
                        message: 'mocked server error',
                    }))

                const result = await func.handler(event, context)
                expect(result.statusCode).toBe(500)
            })
        })
    })
})
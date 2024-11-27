import { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { mockClient } from "aws-sdk-client-mock"
import 'aws-sdk-client-mock-jest';
import {
    DynamoDBClient,
    PutItemCommand,
    ConditionalCheckFailedException,
    DynamoDBServiceException
} from '@aws-sdk/client-dynamodb'
import {
    marshall
} from '@aws-sdk/util-dynamodb'

import { ${{ values.collection_name_cap }}ItemKeys, ${{ values.collection_name_cap }}Data } from '../../lib/${{ values.collection_name_cap }}Item.js'
jest.mock('../../lib/${{ values.collection_name_cap }}Item.js', () => {
    return {
        ...jest.requireActual('../../lib/${{ values.collection_name_cap }}Item.js'),
        createKeys: jest.fn(() => ({ pk: 'id', sk: 'id' })),
        getKeys: jest.fn(() => ({ pk: 'id', sk: 'id' })),
    }
})

// Mock clients
const mockDdbClient = mockClient(DynamoDBClient)

// Function under test
import * as func from './function.js'
jest.mock('./function.js', () => {
    return {
        ...jest.requireActual('./function.js'),
        DDB_CLIENT: mockDdbClient,
    }
})

describe('Create${{ values.collection_name_cap }}Item', () => {
    beforeEach(() => {
        mockDdbClient.reset()
    })

    afterEach(() => {})

    describe('putItem()', () => {
        let itemKeys: ${{ values.collection_name_cap }}ItemKeys
        let itemData: ${{ values.collection_name_cap }}Data

        beforeEach(() => {
            itemKeys = { pk: 'pk', sk: 'sk' }
            itemData = { data: 'data' }
        })


        describe('should succeed when', () => {
            test('creating new item', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .resolves({})

                await func.putItem(itemKeys, itemData, false)

                expect(mockDdbClient).toHaveReceivedCommand(PutItemCommand)
            })
            test('upserting existing item', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .resolves({})

                await func.putItem(itemKeys, itemData, true)

                expect(mockDdbClient).toHaveReceivedCommand(PutItemCommand)
            })
        })

        describe('should fail when', () => {
            test('creating existing item', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .rejects(new ConditionalCheckFailedException({
                        $metadata: {},
                        message: 'The conditional request failed',
                    }))

                await expect(
                    func.putItem(itemKeys, itemData, true)
                ).rejects.toThrow(ConditionalCheckFailedException)

                expect(mockDdbClient).toHaveReceivedCommand(PutItemCommand)

            })
        })
    })

    describe('handler_create()', () => {
        let event: APIGatewayProxyEvent
        let context: Context

        beforeEach(() => {
            event = {
                body: JSON.stringify({ data: 'data' }),
                headers: {},
                multiValueHeaders: {},
                httpMethod: 'POST',
                isBase64Encoded: false,
                path: '',
                pathParameters: null,
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {} as any,
                resource: ''
            }
            context = { awsRequestId: 'request-id' } as any
        })

        describe('should succeed when', () => {
            test('createing item', async () => {
                const result = await func.handler_create(event, context)
                expect(result.statusCode).toBe(201)
                expect(JSON.parse(result.body)).toEqual({ id: 'request-id' })
            })
        })

        describe('should fail when', () => {
            test('creating existing item', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .rejects(new ConditionalCheckFailedException({
                        $metadata: {},
                        message: 'The conditional request failed',
                    }))

                const result = await func.handler_create(event, context)
                expect(result.statusCode).toBe(400)
            })
            test('DDB client error; returns 400', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .rejects(new DynamoDBServiceException({
                        $fault: 'client',
                        $metadata: {},
                        name: 'MockedError',
                        message: 'mocked client error',
                    }))

                const result = await func.handler_create(event, context)
                expect(result.statusCode).toBe(400)
            })
            test('DDB server error; returns 500', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .rejects(new DynamoDBServiceException({
                        $fault: 'server',
                        $metadata: {},
                        name: 'MockedError',
                        message: 'mocked server error',
                    }))

                const result = await func.handler_create(event, context)
                expect(result.statusCode).toBe(500)
            })
        })
    })

    describe('handler_upsert()', () => {
        let event: APIGatewayProxyEvent
        let context: Context

        beforeEach(() => {

            event = {
                body: JSON.stringify({ id: 'id', data: 'data' }),
                headers: {},
                multiValueHeaders: {},
                httpMethod: 'PUT',
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
            test('upserting item', async () => {
                const result = await func.handler_upsert(event, context)

                expect(mockDdbClient).toHaveReceivedCommandWith(
                    PutItemCommand,
                    {
                        Item: marshall({pk: 'id', sk: 'id', id: 'id', data: 'data'})
                    }
                )

                expect(result.statusCode).toBe(200)
                expect(JSON.parse(result.body)).toEqual({ request_id: 'request-id' })
            })
        })

        describe('should fail when', () => {
            test('pathParameter id does not match data id', async () => {
                event.pathParameters = { id: 'other-id' }

                const result = await func.handler_upsert(event, context)
                expect(result.statusCode).toBe(400)
            })

            test('DDB client error; returns 400', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .rejects(new DynamoDBServiceException({
                        $fault: 'client',
                        $metadata: {},
                        name: 'MockedError',
                        message: 'mocked client error',
                    }))

                const result = await func.handler_upsert(event, context)
                expect(result.statusCode).toBe(400)
            })
            test('DDB server error; returns 500', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .rejects(new DynamoDBServiceException({
                        $fault: 'server',
                        $metadata: {},
                        name: 'MockedError',
                        message: 'mocked server error',
                    }))

                const result = await func.handler_upsert(event, context)
                expect(result.statusCode).toBe(500)
            })
        })
    })
})
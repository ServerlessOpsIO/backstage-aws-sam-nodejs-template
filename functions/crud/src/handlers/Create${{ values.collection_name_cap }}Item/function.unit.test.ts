import { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { mockClient } from "aws-sdk-client-mock"
import 'aws-sdk-client-mock-jest';
import {
    DynamoDBClient,
    PutItemCommand,
    ConditionalCheckFailedException,
    DynamoDBServiceException
} from '@aws-sdk/client-dynamodb'

import { ${{ values.collection_name_cap }}Data } from '../../lib/${{ values.collection_name_cap }}Item.js'
jest.mock('../../lib/${{ values.collection_name_cap }}Item.js', () => {
    return {
        ...jest.requireActual('../../lib/${{ values.collection_name_cap }}Item.js'),
        createKeys: jest.fn(() => ({ pk: '${{ values.collection_name }}#1234', sk: '${{ values.collection_name }}#1234' })),
        getIdFromKeys: jest.fn(() => '1234')
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

    afterEach(() => { })

    describe('putItem()', () => {
        let itemData: ${{ values.collection_name_cap }}Data

        beforeEach(() => {
            itemData = { data: 'data' }
        })


        describe('should succeed when', () => {
            test('creating new item', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .resolves({})

                await func.createItem(itemData)

                expect(mockDdbClient).toHaveReceivedCommand(PutItemCommand)
            })
            test('upserting existing item', async () => {
                mockDdbClient
                    .on(PutItemCommand)
                    .resolves({})

                await func.createItem(itemData)

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
                    func.createItem(itemData)
                ).rejects.toThrow(ConditionalCheckFailedException)

                expect(mockDdbClient).toHaveReceivedCommand(PutItemCommand)

            })
        })
    })

    describe('handler()', () => {
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
                const result = await func.handler(event, context)
                expect(result.statusCode).toBe(201)
                expect(JSON.parse(result.body)).toEqual({ id: '1234' })
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

                const result = await func.handler(event, context)
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

                const result = await func.handler(event, context)
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

                const result = await func.handler(event, context)
                expect(result.statusCode).toBe(500)
            })
        })
    })
})
import { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { mockClient } from "aws-sdk-client-mock"
import 'aws-sdk-client-mock-jest';
import {
    DynamoDBClient,
    GetItemCommand,
    ConditionalCheckFailedException,
    DynamoDBServiceException
} from '@aws-sdk/client-dynamodb'
import {
    marshall
} from '@aws-sdk/util-dynamodb'
import { ${{ values.collection_name_cap }}ItemKeys, ${{ values.collection_name_cap }}ItemData } from '../../lib/${{ values.collection_name_cap }}Item.js'

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

describe('Get${{ values.collection_name_cap }}Item', () => {
    beforeEach(() => {
        mockDdbClient.reset()
    })

    afterEach(() => { })

    describe('getItem()', () => {
        let itemKeys: ${{ values.collection_name_cap }}ItemKeys
        let itemData: ${{ values.collection_name_cap }}ItemData

        beforeEach(() => {
            itemKeys = { pk: 'pk', sk: 'sk' }
            itemData = { data: 'data' }
        })


        describe('should succeed when', () => {
            test('getting item', async () => {
                mockDdbClient
                    .on(GetItemCommand)
                    .resolves({
                        Item: marshall({
                            pk: 'pk',
                            sk: 'sk',
                            data: 'data'
                        })
                    })

                await func.getItem(itemKeys)

                expect(mockDdbClient).toHaveReceivedCommand(GetItemCommand)
            })
        })

        describe('should fail when', () => {
            test('getting non-existent', async () => {
                mockDdbClient
                    .on(GetItemCommand)
                    .resolves({})

                await expect(
                    func.getItem(itemKeys)
                ).rejects.toThrow(new Error('${{ values.collection_name_cap }}Item not found'))

                expect(mockDdbClient).toHaveReceivedCommand(GetItemCommand)

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
                httpMethod: 'GET',
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
            test('getting item', async () => {
                const itemKeys = { pk: 'id', sk: 'id' }
                const itemData = { data: 'data' }

                mockDdbClient
                    .on(GetItemCommand)
                    .resolves({
                        Item: marshall({
                            ...itemKeys,
                            ...itemData
                        })
                    })

                const result = await func.handler(event, context)
                expect(result.statusCode).toBe(200)

                const body = JSON.parse(result.body)
                // Don't leak DB keys
                expect(Object.keys(body)).not.toContain('pk')
                expect(Object.keys(body)).not.toContain('sk')

                expect(body).toEqual(itemData)
            })
        })

        describe('should fail when', () => {
            test('getting non-existent item', async () => {
                mockDdbClient
                    .on(GetItemCommand)
                    .rejects(new ConditionalCheckFailedException({
                        $metadata: {},
                        message: 'The conditional request failed',
                    }))

                const result = await func.handler(event, context)
                expect(result.statusCode).toBe(400)
            })
            test('DDB client error; returns 400', async () => {
                mockDdbClient
                    .on(GetItemCommand)
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
                    .on(GetItemCommand)
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
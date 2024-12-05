import { createKeys, getKeysFromId, getIdFromKeys } from './${{ values.collection_name_cap }}Item.js'
import { v4 as uuid } from 'uuid'

jest.mock('uuid', () => {
    return {
        v4: jest.fn(() => '1234-5678'),
    }
})

describe('${{ values.collection_name_cap }}Item', () => {
    describe('createKeys()', () => {
        describe('succeeds', () => {
            test('creating keys', () => {
                const mockUuid = uuid()
                const keys = createKeys()

                expect(keys).toEqual({ pk: `${{ values.collection_name }}#${mockUuid}`, sk: `${{ values.collection_name }}#${mockUuid}` })
            })
        })
    })

    describe('getKeysFromId()', () => {
        describe('succeeds', () => {
            test('getting keys', () => {
                const id = 'test-id'
                const expectedKeys = {
                    pk: `${{ values.collection_name }}#${id}`,
                    sk: `${{ values.collection_name }}#${id}`
                }
                const keys = getKeysFromId(id)

                expect(keys).toEqual(expectedKeys)
            })
        })
    })

    describe('getIdFromKeys()', () => {
        describe('succeeds', () => {
            test('getting keys', () => {
                const expectedId = 'test-id'
                const keys = {
                    pk: `${{ values.collection_name }}#${expectedId}`,
                    sk: `${{ values.collection_name }}#${expectedId}`
                }
                const id = getIdFromKeys(keys)

                expect(id).toEqual(expectedId)
            })
        })
    })
})

import { createKeys, getKeys } from './${{ values.collection_name_cap }}Item.js'
import { v4 as uuid} from 'uuid'

jest.mock('uuid', () => {
    return {
        v4: jest.fn(() => '1234-5678'),
    }
})

describe('${{ values.collection_name_cap }}Item', () => {
    describe('createKeys()', () => {
        test('generates keys with uuid when id is not provided', () => {
            const mockUuid = uuid()
            const keys = createKeys()

            expect(keys).toEqual({ pk: mockUuid, sk: mockUuid })
        })

        test('generates keys with provided id', () => {
            const id = 'test-id'
            const keys = createKeys(id)

            expect(keys).toEqual({ pk: id, sk: id })
        })
    })

    describe('getKeys()', () => {
        test('generates keys with provided id', () => {
            const id = 'test-id'
            const keys = getKeys(id)

            expect(keys).toEqual({ pk: id, sk: id })
        })
    })
})

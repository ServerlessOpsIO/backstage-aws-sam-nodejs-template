import { v4 as uuid } from 'uuid'

export interface ${{ values.collection_name_cap }}ItemKeys {
    pk: string
    sk: string
}

export interface ${{ values.collection_name_cap }}ItemData {
    [key: string]: any
}

export interface ${{ values.collection_name_cap }}Item extends ${{ values.collection_name_cap }}ItemKeys, ${{ values.collection_name_cap }}ItemData { }

/**
 * Create a new ${{ values.collection_name_cap }}ItemKeys object with the same value for pk and sk. Key values a uuid or the 
 * optional id parameter if provided
 * @param id - optional string to use as the key value
 *
 * @returns ${{ values.collection_name_cap }}ItemKeys
 */
export function createKeys(id?: string): ${{ values.collection_name_cap }}ItemKeys {
    const key = id || uuid()
    return {
        pk: key,
        sk: key
    }
}

/**
 * Create a new ${{ values.collection_name_cap }}ItemKeys object with the same value for pk and sk
 * @param id - string to use as the key value
 *
 * @returns ${{ values.collection_name_cap }}ItemKeys
 */
export function getKeys(id: string): ${{ values.collection_name_cap }}ItemKeys {
    return {
        pk: id,
        sk: id
    }
}

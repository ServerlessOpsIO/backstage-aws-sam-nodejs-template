import { v4 as uuid } from 'uuid'

/**
 * ${{ values.collection_name_cap }}Data interface - entity data
 *
 * @param [key: string] - any other key value pairs
 */
export interface ${{ values.collection_name_cap }}Data {
    [key: string]: any
}

/**
 * ${{ values.collection_name_cap }}ItemKeys interface - primary keys for DDB item
 *
 * @param pk - primary key value
 * @param sk - sort key value
 */
export interface ${{ values.collection_name_cap }}ItemKeys {
    pk: string
    sk: string
}

/**
 * ${{ values.collection_name_cap }}Item interface - DDB item
 *
 * @param id - optional id value
 */export interface ${{ values.collection_name_cap }}Item extends ${{ values.collection_name_cap }}ItemKeys, ${{ values.collection_name_cap }}Data {
    id: string
}

/**
 * Create a new ${{ values.collection_name_cap }}ItemKeys object with the same value for pk and sk. Key values are
 * a uuid or the optional id parameter if provided
 *
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
 *
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

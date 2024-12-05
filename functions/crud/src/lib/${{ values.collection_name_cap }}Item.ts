import { v4 as uuid } from 'uuid'

const COLLECTION_NAME = '${{ values.collection_name }}'

/**
 * ${{ values.collection_name_cap }}Data interface - entity data with optional id
 *
 * @param id - optional id value
 * @param key - optional key value
 */
export interface ${{ values.collection_name_cap }}Data {
    id?: string
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
 */
export interface ${{ values.collection_name_cap }}Item extends ${{ values.collection_name_cap }}ItemKeys, ${{ values.collection_name_cap }}Data {
    id: string
}

/**
 * Create a new ${{ values.collection_name_cap }}ItemKeys object with the same value for pk and sk. Key values are a uuid or the
 * optional id parameter if provided
 *
 * @param id - optional string to use as the key value
 *
 * @returns ${{ values.collection_name_cap }}ItemKeys
 */
export function createKeys(): ${{ values.collection_name_cap }}ItemKeys {
    const key = `${COLLECTION_NAME}#${uuid()}`
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
export function getKeysFromId(id: string): ${{ values.collection_name_cap }}ItemKeys {
    const key = `${COLLECTION_NAME}#${id}`
    return {
        pk: key,
        sk: key
    }
}

/**
 * Get the id value from the passed keys
 *
 * @param keys - ${{ values.collection_name_cap }}ItemKeys object
 *
 * @returns string
 */
export function getIdFromKeys(keys: ${{ values.collection_name_cap }}ItemKeys): string {
    return keys.pk.split('#')[1]
}

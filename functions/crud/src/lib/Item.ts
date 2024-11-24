import { v4 as uuid } from 'uuid'

export interface ItemKeys {
    pk: string
    sk: string
}

export interface ItemData {
    [key: string]: any
}

export interface Item extends ItemKeys, ItemData { }

/**
 * Create a new ItemKeys object with the same value for pk and sk. Key values a uuid or the 
 * optional id parameter if provided
 * @param id - optional string to use as the key value
 *
 * @returns ItemKeys
 */
export function createKeys(id?: string): ItemKeys {
    const key = id || uuid()
    return {
        pk: key,
        sk: key
    }
}

/**
 * Create a new ItemKeys object with the same value for pk and sk
 * @param id - string to use as the key value
 *
 * @returns ItemKeys
 */
export function getKeys(id: string): ItemKeys {
    return {
        pk: id,
        sk: id
    }
}

/**
 * Repository Provider Interface
 *
 * This file defines a TypeScript interface for a repository provider,
 * which is a common pattern in software architecture for abstracting data access operations.
 */

/**
 * Defines the structure for data being saved
 * Requires an id property as a string
 * Allows any additional properties
 */
export type SaveParams = {
  id: string;
  [k: string]: any;
};

/**
 * Repository Provider Interface
 *
 * Defines four standard CRUD operations:
 * - save: Stores data with the given parameters
 * - one: Retrieves a single item by ID
 * - all: Retrieves all items of a specific category
 * - delete: Removes an item by ID
 */
export interface IRepositoryProvider {
  /**
   * Stores data with the given parameters
   * @param data The data to be saved
   * @returns A promise resolving to void
   */
  save(data: SaveParams): Promise<void>;

  /**
   * Retrieves a single item by ID
   * @param id The unique identifier of the item
   * @returns A promise resolving to the requested item or null if not found
   */
  one<T>(id: string): Promise<T | null>;

  /**
   * Retrieves all items of a specific category
   * @param filter Optional filtering criteria
   * @returns A promise resolving to an array of items
   */
  all<T>(filter?: object): Promise<T[]>;

  /**
   * Removes an item by ID
   * @param id The unique identifier of the item to delete
   * @returns A promise resolving to void
   */
  delete(id: string): Promise<void>;
}

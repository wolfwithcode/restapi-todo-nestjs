export type SaveParams = {
  id: string;
  [k: string]: any;
};

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

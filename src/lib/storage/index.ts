export * from './types';
export * from './StorageFactory';
export * from './LocalAdapter';

// Convenience function to get storage client
import { StorageFactory } from './StorageFactory';
export function getStorageClient() {
  return StorageFactory.getAdapter();
}
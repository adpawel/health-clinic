export type ResourceType = 'appointments' | 'doctors' | 'users' | 'absences' | 'availabilities';

export interface DataSyncAPI {
  subscribe(resource: ResourceType, onUpdate: () => void): () => void;
}
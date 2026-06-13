export interface SavedContract {
  id: string;
  name: string;
  timestamp: number;
  type: 'Cá nhân' | 'Hợp đồng 2 Bên';
  fileUrl: string;
  signatures: {
    partyA?: string;
    partyB?: string;
    single?: string;
  }
}

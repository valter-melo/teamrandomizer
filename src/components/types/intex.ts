// Tipos principais da aplicação
export interface Team {
  nome: string;
  jogadores: string[];
}

export interface PlayerColumns {
  coluna1: string[];
  coluna2: string[];
  coluna3: string[];
  coluna4: string[];
}

// Props dos componentes
export interface PlayerColumnProps {
  players: string[];
  color: string;
}

export interface FileUploadProps {
  onFileUpload: (file: File, content: string) => void;
}

// Tipo para eventos de arquivo
export interface FileEvent {
  target: {
    files: FileList | File[];
  };
}

export interface FieldSchema {
    type: string | 'string' | 'int' | 'float' | 'boolean';
    required: boolean;
    unique: boolean;
    min: number | null;
    max: number | null;
}

export interface Record {
    [key: string]: any;
}

export interface Result {
    code: string;
    success: boolean;
    message: string;
    records: Record[] | null;
}

export interface TableSchema {
    fields: { [key: string]: FieldSchema };
}

export interface HightDBConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    aero?: string | null;
    reconnectInterval: number | 5000
}

export interface HightDBClient {
    connect(): Promise<void>;
    disconnect(): void;
    query(sql: string): Promise<Record[] | string>;

    inserir(db:string, record: Record[]): Promise<Result>;

    listarDb(db:string): Promise<Result>;

    buscar(db:string, query: Record): Promise<Result>;

    editar(db:string, query: Record, where: Record): Promise<Result>;

    deletar(db:string, query: Record): Promise<Result>;

    createDatabase(name: string, schema: TableSchema, ifNotExists: boolean): Promise<Result>
}
import { createConnection, Socket } from 'net';
import { HightDBConfig, Record, TableSchema, Result, HightDBClient } from './src/types';

export class HightDB implements HightDBClient {
    private config: HightDBConfig;
    private client: Socket | null = null;
    private currentDatabase: string | null = null;

    constructor(config: HightDBConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client = createConnection(this.config.port, this.config.host, () => {
                this.client!.write(`ENTRAR ${this.config.username} ${this.config.password}\n`);

                setTimeout(() => {
                    this.client!.once('data', async (data) => {
                        console.log(data.toString());
                        if (data.toString().includes('Autenticado com sucesso')) {
                            if (this.config.aero) {
                                try {
                                    await this.query('USAR aero' + this.config.aero);
                                } catch (error) {
                                    console.error('Erro ao usar tabela:', error);
                                    reject(error);
                                }
                            }
                            console.log('Conectado com sucesso');
                            resolve();
                        } else {
                            reject(new Error('Falha na autenticação'));
                        }
                    });
                }, 100)
            });

            this.client.on('error', (err) => {
                console.error('Erro no cliente:', err);
                reject(err);
            });

            this.client.on('close', () => {
                console.log('Conexão encerrada. Tentando reconectar...');
                this.reconnect();
            });
        });
    }

    disconnect(): void {
        if (this.client) {
            this.client.end();
            console.log('Desconectado do servidor');
        }
    }

    private reconnect(): void {
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error('Erro ao reconectar:', error);
                this.reconnect();
            }
        }, this.config.reconnectInterval);
    }

    createDatabase(name: string, schema: TableSchema, ifNotExists: boolean): Promise<Result> {
        return new Promise(async (resolve, reject) => {
            let sql = `CRIAR db ${name} VALORES `;
            for (const key in schema.fields) {
                const field = schema.fields[key];
                if ((field.type === 'string' || field.type == "int") && field.min !== null && field.max !== null) {
                    sql += `${key}=${field.type}(${field.min},${field.max})`
                } else {
                    sql += `${key}=${field.type}`
                }
                if (field.required) {
                    sql += '-required';
                }
                if (field.unique) {
                    sql += '-unique';
                }
                sql += ' ';
            }
            try {
                const query = await this.query(sql)
                if(typeof query === 'string') {
                    if(query.includes('já existe')) {
                        if(ifNotExists) {
                            resolve({
                                success: true,
                                message: query,
                                records: null
                            })
                        } else {
                            reject({
                                success: false,
                                message: query,
                                records: null
                            })

                        }
                    } else if(query.includes('Banco criado com schema')) {
                        resolve({
                            success: true,
                            message: query,
                            records: null
                        })
                    }
                }
            } catch (e) {
                reject({
                    success: false,
                    message: e,
                    records: null
                })
            }
        })
    }

    query(sql: string): Promise<Record[] | string> {
        return new Promise(async (resolve, reject) => {
            const query = await this.sendCommand(sql)
            if (query.includes('ERRO:')) {
                reject(new Error(query));
            } else {
                try {
                    const result = JSON.parse(query);
                    resolve(result);
                } catch (error) {
                    resolve(query)
                }
            }
        });
    }

    private sendCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Cliente não conectado'));
                return;
            }

            this.client.write(`${command}\n`);

            this.client.once('data', (data) => {
                resolve(data.toString());
            });

            this.client.once('error', (err) => {
                reject(err);
            });
        });
    }



    buscar(query: Record): Promise<Result> {
        return new Promise(async (resolve, reject) => {
            if (!query || Object.keys(query).length === 0) {
                reject(new Error('Query não pode ser vazia'));
                return;
            }
            try {
                let v = ""
                for (const key in query) {
                    if (typeof query[key] === 'string') {
                        query[key] = `"${query[key]}"`;
                    } else if (typeof query[key] === 'boolean') {
                        query[key] = query[key] ? 'true' : 'false';
                    } else if (typeof query[key] === 'number') {
                        query[key] = query[key].toString();
                    }
                    v+=`${key}=${query[key]} `
                }
                const result = await this.query(`BUSCAR ${v}`);
                if (typeof result === 'string') {
                    reject({
                        success: false,
                        message: result,
                        records: null
                    });
                    throw new Error(result)
                } else {
                    resolve({
                        success: true,
                        message: '',
                        records: result
                    });
                }
            } catch (error) {
                reject({
                    success: false,
                    message: error,
                    records: null
                });
            }
        });
    }

    editar(query: Record, where: Record): Promise<Result> {
        return new Promise(async (resolve, reject) => {
            if (!query || Object.keys(query).length === 0) {
                reject(new Error('Query não pode ser vazia'));
                return;
            }
            try {
                let v = ""
                for (const key in query) {
                    if (typeof query[key] === 'string') {
                        query[key] = `"${query[key]}"`;
                    } else if (typeof query[key] === 'boolean') {
                        query[key] = query[key] ? 'true' : 'false';
                    } else if (typeof query[key] === 'number') {
                        query[key] = query[key].toString();
                    }
                    v+=`${key}=${query[key]} `
                }
                let w = ""
                for (const key in where) {
                    if (typeof where[key] === 'string') {
                        where[key] = `"${where[key]}"`;
                    } else if (typeof where[key] === 'boolean') {
                        where[key] = where[key] ? 'true' : 'false';
                    } else if (typeof where[key] === 'number') {
                        where[key] = where[key].toString();
                    }
                    w+=`${key}=${where[key]} `
                }
                const result = await this.query(`EDITAR ${v} ONDE ${w}`);
                if (typeof result === 'string' && result.includes('registro(s) atualizado(s).')) {
                    resolve({
                        success: true,
                        message: result,
                        records: null
                    });
                }
            } catch (error) {
                reject({
                    success: false,
                    message: error,
                    records: null
                });
            }
        });
    }

    inserir(record: Record): Promise<Result> {
        return new Promise(async (resolve, reject) => {
            let v = ""
            for (const key in record) {
                if (typeof record[key] === 'string') {
                    record[key] = `"${record[key]}"`;
                } else if (typeof record[key] === 'boolean') {
                    record[key] = record[key] ? 'true' : 'false';
                } else if (typeof record[key] === 'number') {
                    record[key] = record[key].toString();
                }
                v+=`${key}=${record[key]} `
            }
            try {
                const t = await this.query(`INSERIR ${v}`)
                if(typeof t === 'string' && t.startsWith('Registro inserido.')) {
                    resolve({
                        success: true,
                        message: t,
                        records: null
                    })
                }
            } catch (e) {
                reject({
                    success: false,
                    message: e,
                    records: null
                })
            }
        })
    }

    deletar(query: Record): Promise<Result> {
        return new Promise(async (resolve, reject) => {
            if (!query || Object.keys(query).length === 0) {
                reject(new Error('Query não pode ser vazia'));
                return;
            }
            try {
                let v = ""
                for (const key in query) {
                    if (typeof query[key] === 'string') {
                        query[key] = `"${query[key]}"`;
                    } else if (typeof query[key] === 'boolean') {
                        query[key] = query[key] ? 'true' : 'false';
                    } else if (typeof query[key] === 'number') {
                        query[key] = query[key].toString();
                    }
                    v+=`${key}=${query[key]} `
                }
                const result = await this.query(`DELETAR ${v}`);
                if (typeof result === 'string' && result.includes('registro(s) removido(s).')) {
                    resolve({
                        success: true,
                        message: result,
                        records: null
                    });
                }
            } catch (error) {
                reject({
                    success: false,
                    message: error,
                    records: null
                });
            }
        })
    }
}
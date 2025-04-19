"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HightDB = void 0;
const net_1 = require("net");
class HightDB {
    constructor(config) {
        this.client = null;
        this.currentDatabase = null;
        this.config = config;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.client = (0, net_1.createConnection)(this.config.port, this.config.host, () => {
                    this.client.write(`ENTRAR ${this.config.username} ${this.config.password}\n`);
                    setTimeout(() => {
                        this.client.once('data', (data) => __awaiter(this, void 0, void 0, function* () {
                            console.log(data.toString());
                            if (data.toString().includes('Autenticado com sucesso')) {
                                if (this.config.aero) {
                                    try {
                                        yield this.query('USAR aero ' + this.config.aero);
                                    }
                                    catch (error) {
                                        reject(error);
                                    }
                                }
                                console.log('Conectado com sucesso');
                                resolve();
                            }
                            else {
                                reject(new Error('Falha na autenticação'));
                            }
                        }));
                    }, 100);
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
        });
    }
    disconnect() {
        if (this.client) {
            this.client.end();
            console.log('Desconectado do servidor');
        }
    }
    reconnect() {
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.connect();
            }
            catch (error) {
                console.error('Erro ao reconectar:', error);
                this.reconnect();
            }
        }), this.config.reconnectInterval);
    }
    createDatabase(name, schema, ifNotExists) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let sql = `CRIAR db ${name} VALORES `;
            for (const key in schema.fields) {
                const field = schema.fields[key];
                if ((field.type === 'string' || field.type == "int") && field.min !== null && field.max !== null) {
                    sql += `${key}=${field.type}(${field.min},${field.max})`;
                }
                else {
                    sql += `${key}=${field.type}`;
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
                const query = yield this.query(sql);
                if (typeof query === 'string') {
                    if (query.includes('já existe')) {
                        if (ifNotExists) {
                            resolve({
                                success: true,
                                message: query,
                                records: null
                            });
                        }
                        else {
                            reject({
                                success: false,
                                message: query,
                                records: null
                            });
                        }
                    }
                    else if (query.includes('Banco criado com schema')) {
                        resolve({
                            success: true,
                            message: query,
                            records: null
                        });
                    }
                }
            }
            catch (e) {
                reject({
                    success: false,
                    message: e,
                    records: null
                });
            }
        }));
    }
    query(sql) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const query = yield this.sendCommand(sql);
            if (query.includes('ERRO:')) {
                reject(new Error(query));
            }
            else {
                try {
                    const result = JSON.parse(query);
                    resolve(result);
                }
                catch (error) {
                    resolve(query);
                }
            }
        }));
    }
    sendCommand(command) {
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
    buscar(db, query) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (!query || Object.keys(query).length === 0) {
                reject(new Error('Query não pode ser vazia'));
                return;
            }
            try {
                let v = "";
                for (const key in query) {
                    if (typeof query[key] === 'string') {
                        query[key] = `"${query[key]}"`;
                    }
                    else if (typeof query[key] === 'boolean') {
                        query[key] = query[key] ? 'true' : 'false';
                    }
                    else if (typeof query[key] === 'number') {
                        query[key] = query[key].toString();
                    }
                    v += `${key}=${query[key]} `;
                }
                const result = yield this.query(`BUSCAR ${db} ${v}`);
                if (typeof result === 'string') {
                    reject({
                        success: false,
                        message: result,
                        records: null
                    });
                    throw new Error(result);
                }
                else {
                    resolve({
                        success: true,
                        message: '',
                        records: result
                    });
                }
            }
            catch (error) {
                reject({
                    success: false,
                    message: error,
                    records: null
                });
            }
        }));
    }
    editar(db, query, where) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (!query || Object.keys(query).length === 0) {
                reject(new Error('Query não pode ser vazia'));
                return;
            }
            try {
                let v = "";
                for (const key in query) {
                    if (typeof query[key] === 'string') {
                        query[key] = `"${query[key]}"`;
                    }
                    else if (typeof query[key] === 'boolean') {
                        query[key] = query[key] ? 'true' : 'false';
                    }
                    else if (typeof query[key] === 'number') {
                        query[key] = query[key].toString();
                    }
                    v += `${key}=${query[key]} `;
                }
                let w = "";
                for (const key in where) {
                    if (typeof where[key] === 'string') {
                        where[key] = `"${where[key]}"`;
                    }
                    else if (typeof where[key] === 'boolean') {
                        where[key] = where[key] ? 'true' : 'false';
                    }
                    else if (typeof where[key] === 'number') {
                        where[key] = where[key].toString();
                    }
                    w += `${key}=${where[key]} `;
                }
                const result = yield this.query(`EDITAR ${db} ${v} ONDE ${w}`);
                if (typeof result === 'string' && result.includes('registro(s) atualizado(s).')) {
                    resolve({
                        success: true,
                        message: result,
                        records: null
                    });
                }
            }
            catch (error) {
                reject({
                    success: false,
                    message: error,
                    records: null
                });
            }
        }));
    }
    inserir(db, record) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let v = "";
            for (const key in record) {
                if (typeof record[key] === 'string') {
                    record[key] = `"${record[key]}"`;
                }
                else if (typeof record[key] === 'boolean') {
                    record[key] = record[key] ? 'true' : 'false';
                }
                else if (typeof record[key] === 'number') {
                    record[key] = record[key].toString();
                }
                v += `${key}=${record[key]} `;
            }
            try {
                const t = yield this.query(`INSERIR ${db} ${v}`);
                if (typeof t === 'string' && t.startsWith('Registro inserido.')) {
                    resolve({
                        success: true,
                        message: t,
                        records: null
                    });
                }
            }
            catch (e) {
                reject({
                    success: false,
                    message: e,
                    records: null
                });
            }
        }));
    }
    deletar(db, query) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (!query || Object.keys(query).length === 0) {
                reject(new Error('Query não pode ser vazia'));
                return;
            }
            try {
                let v = "";
                for (const key in query) {
                    if (typeof query[key] === 'string') {
                        query[key] = `"${query[key]}"`;
                    }
                    else if (typeof query[key] === 'boolean') {
                        query[key] = query[key] ? 'true' : 'false';
                    }
                    else if (typeof query[key] === 'number') {
                        query[key] = query[key].toString();
                    }
                    v += `${key}=${query[key]} `;
                }
                const result = yield this.query(`DELETAR ${db} ${v}`);
                if (typeof result === 'string' && result.includes('registro(s) removido(s).')) {
                    resolve({
                        success: true,
                        message: result,
                        records: null
                    });
                }
            }
            catch (error) {
                reject({
                    success: false,
                    message: error,
                    records: null
                });
            }
        }));
    }
    listarDb() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.query(`LISTAR db`);
            try {
                if (typeof result === 'string') {
                    reject({
                        success: false,
                        message: result,
                        records: null
                    });
                    throw new Error(result);
                }
                else {
                    resolve({
                        success: true,
                        message: '',
                        records: result
                    });
                }
            }
            catch (e) {
                reject({
                    success: false,
                    message: e,
                    records: null
                });
            }
        }));
    }
}
exports.HightDB = HightDB;

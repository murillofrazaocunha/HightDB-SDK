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
                    this.client.once('data', (data) => {
                        if (data.toString().includes('Autenticado com sucesso')) {
                            resolve();
                        }
                        else {
                            reject(new Error('Falha na autenticação'));
                        }
                    });
                });
                this.client.on('error', (err) => {
                    reject(err);
                });
            });
        });
    }
    disconnect() {
        if (this.client) {
            this.client.end();
        }
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
    listarBancos() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.sendCommand('VER_BANCOS');
            return JSON.parse(response);
        });
    }
    usarBanco(nome) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand(`USAR ${nome}`);
            this.currentDatabase = nome;
        });
    }
    inserirRegistro(record) {
        return __awaiter(this, void 0, void 0, function* () {
            const recordString = Object.entries(record)
                .map(([key, value]) => `${key}=${value}`)
                .join(' ');
            yield this.sendCommand(`INSERIR ${recordString}`);
        });
    }
    editarRegistro(campo, valor, ondeCampo, ondeValor) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand(`EDITAR ${campo}=${valor} ONDE ${ondeCampo}=${ondeValor}`);
        });
    }
    buscarRegistros(campo, valor) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.sendCommand(`BUSCAR ${campo}=${valor}`);
            return JSON.parse(response);
        });
    }
    listarRegistros() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.sendCommand('LISTAR');
            return JSON.parse(response);
        });
    }
    deletarRegistro(campo, valor) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand(`DELETAR ${campo}=${valor}`);
        });
    }
    visualizarSchema() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.sendCommand('SCHEMA');
            return JSON.parse(response);
        });
    }
    criarUsuario(user) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand(`CRIAR_USUARIO ${user.username} ${user.password} ${user.role}`);
        });
    }
    trocarSenha(username, novaSenha) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand(`TROCAR_SENHA ${username} ${novaSenha}`);
        });
    }
    gerenciarPermissao(nomeBanco, username, acao) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendCommand(`PERMISSAO ${nomeBanco} ${username} ${acao}`);
        });
    }
}
// Exemplo de uso
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = {
            host: 'localhost',
            port: 1525,
            username: 'root',
            password: 'qz5rIDaYXYqBzPhP'
        };
        const client = new HightDB(config);
        try {
            yield client.connect();
            console.log('Conectado ao HightDB');
            const bancos = yield client.listarBancos();
            console.log('Bancos de dados:', bancos);
            yield client.usarBanco('clientes');
            console.log('Usando banco de dados "clientes"');
            yield client.inserirRegistro({ id: 1, nome: 'João', email: 'joao@example.com' });
            console.log('Registro inserido');
            const registros = yield client.listarRegistros();
            console.log('Registros:', registros);
            yield client.editarRegistro('email', 'joao_novo@example.com', 'id', 1);
            console.log('Registro editado');
            const registrosBuscados = yield client.buscarRegistros('nome', 'João');
            console.log('Registros buscados:', registrosBuscados);
            yield client.deletarRegistro('id', 1);
            console.log('Registro deletado');
            const schema = yield client.visualizarSchema();
            console.log('Schema do banco de dados:', schema);
            yield client.criarUsuario({ username: 'maria', password: 'senha123', role: 'user' });
            console.log('Usuário criado');
            yield client.trocarSenha('maria', 'nova_senha123');
            console.log('Senha trocada');
            yield client.gerenciarPermissao('clientes', 'maria', 'adicionar');
            console.log('Permissão adicionada');
            client.disconnect();
            console.log('Desconectado do HightDB');
        }
        catch (error) {
            console.error('Erro:', error);
        }
    });
}
main();

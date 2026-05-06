/*
  QRPSI — Script completo para SQL Server
  ----------------------------------------
  - Cria o banco (opcional), as tabelas e o seed inicial:
    * 5 temas + 39 perguntas (catálogo oficial)
    * Usuários: Gil (gil@gsoft.com.br / Gil@1974)
                Saavedra (saavedra@gsoft.com.br / Admin@2026)
  Senhas em bcrypt ($2b$10$...) geradas com Node bcrypt rounds 10.

  Uso típico:
    - Execute em SSMS ou sqlcmd conectado ao servidor (master ou destino).
    - Se o banco já existir, pode comentar o bloco CREATE DATABASE.
    - Conflito com objetos existentes: descomente o bloco DROP para recriar do zero.

  Compatível com o mesmo esquema das migrations Knex do projeto.
*/

SET NOCOUNT ON;

/* ========= 1) Banco de dados ========= */
IF DB_ID(N'QRPSI') IS NULL
BEGIN
  CREATE DATABASE [QRPSI];
END
GO

USE [QRPSI];
GO

/* ========= 2) Limpar objetos (opcional — descomente para dropar tudo) =========
IF OBJECT_ID(N'dbo.PesquisasRespostasDetalhes', N'U') IS NOT NULL DROP TABLE dbo.PesquisasRespostasDetalhes;
IF OBJECT_ID(N'dbo.PesquisasRespostas', N'U') IS NOT NULL DROP TABLE dbo.PesquisasRespostas;
IF OBJECT_ID(N'dbo.Pesquisas', N'U') IS NOT NULL DROP TABLE dbo.Pesquisas;
IF OBJECT_ID(N'dbo.Departamentos', N'U') IS NOT NULL DROP TABLE dbo.Departamentos;
IF OBJECT_ID(N'dbo.Perguntas', N'U') IS NOT NULL DROP TABLE dbo.Perguntas;
IF OBJECT_ID(N'dbo.TemasPerguntas', N'U') IS NOT NULL DROP TABLE dbo.TemasPerguntas;
IF OBJECT_ID(N'dbo.Empresas', N'U') IS NOT NULL DROP TABLE dbo.Empresas;
IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NOT NULL DROP TABLE dbo.Usuarios;
GO
*/

/* ========= 3) Tabelas ========= */
IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Usuarios (
    Id INT IDENTITY(1,1) NOT NULL,
    Nome NVARCHAR(150) NOT NULL,
    Email NVARCHAR(150) NOT NULL,
    SenhaHash NVARCHAR(255) NOT NULL,
    RefreshToken NVARCHAR(MAX) NULL,
    Ativo BIT NOT NULL CONSTRAINT DF_Usuarios_Ativo DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Usuarios_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_Usuarios PRIMARY KEY (Id),
    CONSTRAINT UQ_Usuarios_Email UNIQUE (Email)
  );
END
GO

IF OBJECT_ID(N'dbo.Empresas', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Empresas (
    Id INT IDENTITY(1,1) NOT NULL,
    Uuid UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Empresas_Uuid DEFAULT (NEWID()),
    Nome NVARCHAR(200) NOT NULL,
    Cnpj NVARCHAR(20) NULL,
    Ativo BIT NOT NULL CONSTRAINT DF_Empresas_Ativo DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Empresas_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_Empresas PRIMARY KEY (Id),
    CONSTRAINT UQ_Empresas_Uuid UNIQUE (Uuid)
  );
END
GO

IF OBJECT_ID(N'dbo.TemasPerguntas', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.TemasPerguntas (
    Id INT IDENTITY(1,1) NOT NULL,
    Ordem INT NOT NULL,
    Nome NVARCHAR(200) NOT NULL,
    Ativo BIT NOT NULL CONSTRAINT DF_TemasPerguntas_Ativo DEFAULT (1),
    CONSTRAINT PK_TemasPerguntas PRIMARY KEY (Id)
  );
END
GO

IF OBJECT_ID(N'dbo.Perguntas', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Perguntas (
    Id INT IDENTITY(1,1) NOT NULL,
    TemaId INT NOT NULL,
    Ordem INT NOT NULL,
    Texto NVARCHAR(500) NOT NULL,
    Ativo BIT NOT NULL CONSTRAINT DF_Perguntas_Ativo DEFAULT (1),
    CONSTRAINT PK_Perguntas PRIMARY KEY (Id),
    CONSTRAINT FK_Perguntas_Tema FOREIGN KEY (TemaId) REFERENCES dbo.TemasPerguntas (Id)
  );
END
GO

IF OBJECT_ID(N'dbo.Departamentos', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Departamentos (
    Id INT IDENTITY(1,1) NOT NULL,
    EmpresaId INT NOT NULL,
    Nome NVARCHAR(150) NOT NULL,
    NomeNormalizado NVARCHAR(150) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Departamentos_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Departamentos PRIMARY KEY (Id),
    CONSTRAINT FK_Departamentos_Empresa FOREIGN KEY (EmpresaId) REFERENCES dbo.Empresas (Id) ON DELETE CASCADE,
    CONSTRAINT UQ_Departamentos_Empresa_NomeNorm UNIQUE (EmpresaId, NomeNormalizado)
  );
END
GO

IF OBJECT_ID(N'dbo.Pesquisas', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pesquisas (
    Id INT IDENTITY(1,1) NOT NULL,
    UuidLink UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Pesquisas_UuidLink DEFAULT (NEWID()),
    EmpresaId INT NOT NULL,
    Titulo NVARCHAR(200) NOT NULL,
    DataPesquisa DATE NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Pesquisas_Status DEFAULT (N'ABERTA'),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Pesquisas_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_Pesquisas PRIMARY KEY (Id),
    CONSTRAINT FK_Pesquisas_Empresa FOREIGN KEY (EmpresaId) REFERENCES dbo.Empresas (Id) ON DELETE CASCADE,
    CONSTRAINT UQ_Pesquisas_UuidLink UNIQUE (UuidLink)
  );
END
GO

IF OBJECT_ID(N'dbo.PesquisasRespostas', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PesquisasRespostas (
    Id INT IDENTITY(1,1) NOT NULL,
    PesquisaId INT NOT NULL,
    DepartamentoId INT NULL,
    NomeRespondente NVARCHAR(150) NULL,
    DepartamentoInformado NVARCHAR(150) NULL,
    DataResposta DATETIME2 NOT NULL CONSTRAINT DF_PesquisasRespostas_DataResposta DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_PesquisasRespostas PRIMARY KEY (Id),
    CONSTRAINT FK_PesquisasRespostas_Pesquisa FOREIGN KEY (PesquisaId) REFERENCES dbo.Pesquisas (Id) ON DELETE CASCADE,
    /* NO ACTION: SET NULL aqui gera erro 1785 (múltiplos caminhos CASCADE a partir de Empresa). */
    CONSTRAINT FK_PesquisasRespostas_Depto FOREIGN KEY (DepartamentoId) REFERENCES dbo.Departamentos (Id) ON DELETE NO ACTION
  );
END
GO

IF OBJECT_ID(N'dbo.PesquisasRespostasDetalhes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PesquisasRespostasDetalhes (
    Id INT IDENTITY(1,1) NOT NULL,
    PesquisaRespostaId INT NOT NULL,
    PerguntaId INT NOT NULL,
    Resposta BIT NOT NULL,
    CONSTRAINT PK_PesquisasRespostasDetalhes PRIMARY KEY (Id),
    CONSTRAINT FK_PRD_Resposta FOREIGN KEY (PesquisaRespostaId) REFERENCES dbo.PesquisasRespostas (Id) ON DELETE CASCADE,
    CONSTRAINT FK_PRD_Pergunta FOREIGN KEY (PerguntaId) REFERENCES dbo.Perguntas (Id),
    CONSTRAINT UQ_RespostaDetalhe_Pergunta UNIQUE (PesquisaRespostaId, PerguntaId)
  );
END
GO

/* ========= 4) Seed — limpa só dados de catálogo / usuários (preserva empresas/pesquisas se já houver) ========= */
DELETE FROM dbo.PesquisasRespostasDetalhes;
DELETE FROM dbo.PesquisasRespostas;
DELETE FROM dbo.Pesquisas;
DELETE FROM dbo.Departamentos;
DELETE FROM dbo.Empresas;
DELETE FROM dbo.Perguntas;
DELETE FROM dbo.TemasPerguntas;
DELETE FROM dbo.Usuarios;
GO

SET IDENTITY_INSERT dbo.TemasPerguntas ON;
INSERT INTO dbo.TemasPerguntas (Id, Ordem, Nome, Ativo) VALUES
(1, 1, N'Organização do Trabalho', 1),
(2, 2, N'Fatores sociais no trabalho', 1),
(3, 3, N'Ambiente de trabalho', 1),
(4, 4, N'Fatores pessoais e equilíbrio vida-trabalho', 1),
(5, 5, N'Cultura e gestão organizacional', 1);
SET IDENTITY_INSERT dbo.TemasPerguntas OFF;
GO

SET IDENTITY_INSERT dbo.Perguntas ON;
INSERT INTO dbo.Perguntas (Id, TemaId, Ordem, Texto, Ativo) VALUES
(1, 1, 1, N'Demandas excessivas de trabalho', 1),
(2, 1, 2, N'Falta de tempo adequado para realizar tarefas', 1),
(3, 1, 3, N'Papéis e responsabilidades ambíguos ou conflitantes', 1),
(4, 1, 4, N'Mudanças frequentes sem comunicação adequada', 1),
(5, 1, 5, N'Falta de autonomia ou controle sobre o trabalho', 1),
(6, 1, 6, N'Monitoramento excessivo (microgerenciamento)', 1),
(7, 1, 7, N'Jornadas longas ou trabalho em turnos', 1),
(8, 1, 8, N'Sobrecarga mental ou cognitiva (excesso de informações)', 1),
(9, 1, 9, N'Sobrecarga emocional (exposição constante a sofrimento/conflitos)', 1),
(10, 1, 10, N'Interrupções frequentes que prejudicam a concentração', 1),
(11, 1, 11, N'Recursos insuficientes (pessoas, tempo, materiais)', 1),
(12, 1, 12, N'Insegurança no emprego ou contratos instáveis', 1),
(13, 1, 13, N'Mudanças organizacionais sem apoio adequado', 1),
(14, 2, 14, N'Relações interpessoais precárias', 1),
(15, 2, 15, N'Falta de apoio da liderança', 1),
(16, 2, 16, N'Conflitos com colegas ou superiores', 1),
(17, 2, 17, N'Falta de reconhecimento pelo desempenho', 1),
(18, 2, 18, N'Práticas injustas de avaliação', 1),
(19, 2, 19, N'Exclusão social ou discriminação', 1),
(20, 2, 20, N'Assédio moral', 1),
(21, 2, 21, N'Assédio sexual', 1),
(22, 2, 22, N'Clima organizacional hostil ou tóxico', 1),
(23, 2, 23, N'Falta de participação em processos decisórios', 1),
(24, 2, 24, N'Comunicação ineficaz ou inexistente', 1),
(25, 2, 25, N'Liderança autoritária, abusiva ou ausente', 1),
(26, 3, 26, N'Espaços desconfortáveis ou barulhentos', 1),
(27, 3, 27, N'Iluminação inadequada', 1),
(28, 3, 28, N'Ferramentas ou equipamentos ineficientes', 1),
(29, 3, 29, N'Ambientes extremos (calor, frio, altura, umidade)', 1),
(30, 3, 30, N'Situações de risco constante (perigo, violência)', 1),
(31, 3, 31, N'Condições ergonômicas inadequadas (posturas, repetitividade)', 1),
(32, 3, 32, N'Isolamento físico no trabalho', 1),
(33, 4, 33, N'Dificuldade em conciliar trabalho e vida pessoal/familiar', 1),
(34, 4, 34, N'Trabalho remoto sem limites claros de jornada', 1),
(35, 4, 35, N'Falta de apoio em situações de crise pessoal', 1),
(36, 5, 36, N'Falta de valores claros na organização', 1),
(37, 5, 37, N'Conflito de valores entre empresa e colaboradores', 1),
(38, 5, 38, N'Cultura de cobrança excessiva por resultados a qualquer custo', 1),
(39, 5, 39, N'Percepção de injustiça organizacional (favoritismo, desigualdade)', 1);
SET IDENTITY_INSERT dbo.Perguntas OFF;
GO

/* Gil@1974 / Admin@2026 — hashes bcrypt cost 10 (Node bcrypt) */
INSERT INTO dbo.Usuarios (Nome, Email, SenhaHash, RefreshToken, Ativo, CreatedAt)
VALUES
(N'Gil', N'gil@gsoft.com.br', N'$2b$10$ON.wAmRemIXmzFQxoGO0q.BjcnNGFsi7otrOwyfFHoCve8HEhqwk.', NULL, 1, SYSUTCDATETIME()),
(N'Saavedra', N'saavedra@gsoft.com.br', N'$2b$10$XqwxouPWFh2F.BvbxHCyrOqU.6NeARvDGUggXik4Fw4BtX0HKBhmm', NULL, 1, SYSUTCDATETIME());
GO

DBCC CHECKIDENT ('dbo.TemasPerguntas', RESEED, 5);
DBCC CHECKIDENT ('dbo.Perguntas', RESEED, 39);
DBCC CHECKIDENT ('dbo.Usuarios', RESEED, 2);
GO

PRINT N'QRPSI: banco, tabelas e seed aplicados com sucesso.';
GO

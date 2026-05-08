import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise'
import postgres from 'postgres'

import { normalizeAdminAccessMatrix } from '@/lib/admin-access'
import {
  DENUNCIA_FLOW,
  LOWER_COMPLEXITY_FLOW,
  getLaneForStatus,
  mapInternalToPublicStatus,
} from '@/lib/server/policy'
import { hashPassword } from '@/lib/server/security'
import { createSeedDatabase } from '@/lib/server/seed'
import type {
  AppDatabase,
  AppSettingsRecord,
  AppUserRecord,
  AttachmentRecord,
  CommentRecord,
  CommunicationRecord,
  DepartmentRecord,
  ManifestanteRecord,
  ManifestationRecord,
  ResponseTemplateRecord,
  SatisfactionSurveyRecord,
  SessionRecord,
  TimelineRecord,
  WorkflowStatus,
} from '@/lib/server/schema'
import {
  findFirstEligibleUserForQueue,
  getOperationalQueueForManifestation,
  isUserEligibleForOperationalQueue,
} from '@/lib/workflow-routing'

const APP_RECORD_ID = 'artglass-ouvidoria'
const LEGACY_APP_STATE_ID = 'artglass-ouvidoria'
const CURRENT_DATABASE_VERSION = 2
const DEFAULT_SEED_PASSWORD = 'ArtGlass@123'
const DEFAULT_ADMIN_ID = 'user-admin-geral'
const DEFAULT_ADMIN_EMAIL = 'admin@artglass.com.br'
const DEFAULT_ADMIN_PASSWORD_HASH = hashPassword(DEFAULT_SEED_PASSWORD)

type DatabaseDriver = 'postgres' | 'mysql'
type PostgresClient = ReturnType<typeof postgres>
type SqlValue = string | number | boolean | null
type SqlRow = Record<string, unknown>
type ConnectionConfig = {
  driver: DatabaseDriver
  url: string
  parsedUrl: URL
  requireSsl: boolean
}

type AttachmentBlobRow = {
  attachment_id: string
  manifestation_id: string
  filename: string
  mime_type: string
  size_bytes: number
  content_base64: string
}

type AttachmentBlobResult = {
  id: string
  manifestationId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  content: Buffer
}

interface SqlExecutor {
  driver: DatabaseDriver
  query<T extends SqlRow = SqlRow>(statement: string, params?: SqlValue[]): Promise<T[]>
  execute(statement: string, params?: SqlValue[]): Promise<void>
}

export interface DatabaseMutationContext {
  saveAttachmentBlob(input: {
    attachmentId: string
    manifestationId: string
    fileName: string
    mimeType: string
    sizeBytes: number
    contentBase64: string
  }): Promise<void>
}

let postgresClient: PostgresClient | null = null
let mysqlPool: Pool | null = null
let bootstrapPromise: Promise<void> | null = null
let accessMatrixCache:
  | {
      expiresAt: number
      matrix: AppSettingsRecord['acessos']
    }
  | null = null

const ACCESS_MATRIX_CACHE_TTL_MS = 60_000

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL nao configurada. Defina a conexao do banco de dados no arquivo .env.',
    )
  }

  return databaseUrl
}

function requiresSsl(parsedUrl: URL) {
  const sslMode = parsedUrl.searchParams.get('sslmode')?.toLowerCase()
  const ssl = parsedUrl.searchParams.get('ssl')?.toLowerCase()

  return (
    parsedUrl.hostname.includes('supabase.co') ||
    sslMode === 'require' ||
    ssl === 'true' ||
    ssl === 'require'
  )
}

function getConnectionConfig(): ConnectionConfig {
  const url = getDatabaseUrl()
  const parsedUrl = new URL(url)

  if (parsedUrl.protocol === 'postgres:' || parsedUrl.protocol === 'postgresql:') {
    return {
      driver: 'postgres',
      url,
      parsedUrl,
      requireSsl: requiresSsl(parsedUrl),
    }
  }

  if (parsedUrl.protocol === 'mysql:') {
    return {
      driver: 'mysql',
      url,
      parsedUrl,
      requireSsl: requiresSsl(parsedUrl),
    }
  }

  throw new Error(
    'DATABASE_URL deve usar um protocolo suportado: postgresql://, postgres:// ou mysql://.',
  )
}

function getPostgresClient() {
  if (!postgresClient) {
    const config = getConnectionConfig()

    if (config.driver !== 'postgres') {
      throw new Error('Conexao PostgreSQL solicitada com DATABASE_URL de outro provedor.')
    }

    postgresClient = postgres(config.url, {
      idle_timeout: 20,
      max: 5,
      prepare: false,
      ssl: config.requireSsl ? 'require' : undefined,
    })
  }

  return postgresClient
}

function getMysqlPool() {
  if (!mysqlPool) {
    const config = getConnectionConfig()

    if (config.driver !== 'mysql') {
      throw new Error('Conexao MySQL solicitada com DATABASE_URL de outro provedor.')
    }

    const databaseName = config.parsedUrl.pathname.replace(/^\//, '')
    if (!databaseName) {
      throw new Error('DATABASE_URL do MySQL precisa informar o nome do banco de dados.')
    }

    mysqlPool = mysql.createPool({
      host: config.parsedUrl.hostname,
      port: config.parsedUrl.port ? Number(config.parsedUrl.port) : 3306,
      user: decodeURIComponent(config.parsedUrl.username),
      password: decodeURIComponent(config.parsedUrl.password),
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      ssl: config.requireSsl ? { rejectUnauthorized: false } : undefined,
    })
  }

  return mysqlPool
}

function convertPlaceholdersToPostgres(statement: string) {
  let index = 0
  return statement.replace(/\?/g, () => `$${++index}`)
}

function createPostgresExecutor(client: PostgresClient): SqlExecutor {
  return {
    driver: 'postgres',
    async query<T extends SqlRow = SqlRow>(statement: string, params: SqlValue[] = []) {
      const result = await client.unsafe<T[]>(convertPlaceholdersToPostgres(statement), params)
      return result
    },
    async execute(statement: string, params: SqlValue[] = []) {
      await client.unsafe(convertPlaceholdersToPostgres(statement), params)
    },
  }
}

function createMysqlExecutor(connection: Pool | PoolConnection): SqlExecutor {
  return {
    driver: 'mysql',
    async query<T extends SqlRow = SqlRow>(statement: string, params: SqlValue[] = []) {
      const [rows] = await connection.query<RowDataPacket[]>(statement, params)
      return rows as unknown as T[]
    },
    async execute(statement: string, params: SqlValue[] = []) {
      await connection.query(statement, params)
    },
  }
}

function getReadExecutor() {
  const config = getConnectionConfig()
  if (config.driver === 'postgres') {
    return createPostgresExecutor(getPostgresClient())
  }

  return createMysqlExecutor(getMysqlPool())
}

async function withTransaction<T>(callback: (executor: SqlExecutor) => Promise<T>) {
  const config = getConnectionConfig()

  if (config.driver === 'postgres') {
    return getPostgresClient().begin(async (transaction) => {
      return callback(createPostgresExecutor(transaction as unknown as PostgresClient))
    })
  }

  const connection = await getMysqlPool().getConnection()

  try {
    await connection.beginTransaction()
    const result = await callback(createMysqlExecutor(connection))
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function createDefaultAdminUser(now: string): AppUserRecord {
  return {
    id: DEFAULT_ADMIN_ID,
    nome: 'Administrador Geral',
    email: DEFAULT_ADMIN_EMAIL,
    perfil: 'admin',
    senhaHash: DEFAULT_ADMIN_PASSWORD_HASH,
    ativo: true,
    criadoEm: now,
    atualizadoEm: now,
  }
}

function ensureDefaultUsers(database: AppDatabase) {
  const hasAdmin = database.usuarios.some(
    (user) => user.id === DEFAULT_ADMIN_ID || user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL,
  )

  if (!hasAdmin) {
    const now = new Date().toISOString()
    database.usuarios.unshift(createDefaultAdminUser(now))
  }

  database.usuarios = database.usuarios.map((user) => ({
    ...user,
    deveTrocarSenha: Boolean(user.deveTrocarSenha),
    tentativasFalhasLogin: user.tentativasFalhasLogin ?? 0,
  }))
  database.settings = {
    ...database.settings,
    acessos: normalizeAdminAccessMatrix(database.settings?.acessos),
  }

  return database
}

function ensureBaselineReferenceData(database: AppDatabase) {
  const baseline = createSeedDatabase()

  for (const department of baseline.departamentos) {
    if (!database.departamentos.some((current) => current.id === department.id)) {
      database.departamentos.push(department)
    }
  }

  for (const template of baseline.templates) {
    if (!database.templates.some((current) => current.id === template.id)) {
      database.templates.push(template)
    }
  }

  for (const user of baseline.usuarios) {
    if (
      !database.usuarios.some(
        (current) =>
          current.id === user.id || current.email.toLowerCase() === user.email.toLowerCase(),
      )
    ) {
      database.usuarios.push(user)
    }
  }
}

function normalizeManifestationAssignments(database: AppDatabase) {
  for (const manifestation of database.manifestacoes) {
    const queue = getOperationalQueueForManifestation(manifestation)
    const responsible = manifestation.responsavelAtualId
      ? database.usuarios.find((user) => user.id === manifestation.responsavelAtualId)
      : undefined

    if (
      responsible &&
      responsible.ativo &&
      isUserEligibleForOperationalQueue(responsible, queue, manifestation.areaResponsavelId)
    ) {
      continue
    }

    const fallback = findFirstEligibleUserForQueue(
      database.usuarios,
      queue,
      manifestation.areaResponsavelId,
    )

    manifestation.responsavelAtualId = fallback?.id
  }
}

function normalizeSessions(database: AppDatabase) {
  const validUserIds = new Set(
    database.usuarios.filter((user) => user.ativo).map((user) => user.id),
  )

  database.sessoes = database.sessoes.filter(
    (session) =>
      validUserIds.has(session.usuarioId) &&
      new Date(session.expiraEm).getTime() > Date.now(),
  )
}

function normalizeManifestationStatus(manifestation: ManifestationRecord) {
  const currentStatus = manifestation.status
  const validStatus =
    manifestation.natureza === 'denuncia'
      ? DENUNCIA_FLOW.includes(currentStatus)
      : LOWER_COMPLEXITY_FLOW.includes(currentStatus)

  let normalizedStatus: WorkflowStatus = currentStatus

  if (!validStatus) {
    if (manifestation.natureza === 'denuncia') {
      normalizedStatus =
        manifestation.dataRespostaFinal || manifestation.concluidoEm
          ? 'resposta_manifestante_enviada'
          : 'em_analise_pertinencia'
    } else {
      normalizedStatus =
        manifestation.dataRespostaFinal || manifestation.concluidoEm
          ? 'concluida'
          : manifestation.areaResponsavelId
            ? 'encaminhada_area'
            : 'em_analise_ouvidoria'
    }
  }

  manifestation.status = normalizedStatus
  manifestation.laneAtual = getLaneForStatus(normalizedStatus)
  manifestation.statusPublico = mapInternalToPublicStatus(normalizedStatus)
}

function normalizeDatabase(payload: AppDatabase | string) {
  const database = (typeof payload === 'string' ? JSON.parse(payload) : payload) as AppDatabase
  database.versao = Math.max(Number(database.versao ?? 0), CURRENT_DATABASE_VERSION)
  ensureDefaultUsers(database)
  ensureBaselineReferenceData(database)
  normalizeSessions(database)
  database.manifestacoes.forEach(normalizeManifestationStatus)
  normalizeManifestationAssignments(database)
  return database
}

async function loadInitialState() {
  return createSeedDatabase()
}

function asString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return String(value ?? '')
}

function asOptionalString(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  return value instanceof Date ? value.toISOString() : String(value)
}

function asNumber(value: unknown) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return 0
}

function asBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'bigint') {
    return Number(value) === 1
  }

  if (typeof value === 'string') {
    return ['1', 'true', 't', 'yes'].includes(value.toLowerCase())
  }

  return false
}

function parseJsonValue<T>(value: unknown, fallback: T) {
  const raw = asOptionalString(value)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function mapUserRow(row: SqlRow): AppUserRecord {
  return {
    id: asString(row.id),
    nome: asString(row.nome),
    email: asString(row.email),
    perfil: asString(row.perfil) as AppUserRecord['perfil'],
    areaId: asOptionalString(row.area_id),
    senhaHash: asString(row.senha_hash),
    deveTrocarSenha: asBoolean(row.deve_trocar_senha),
    tentativasFalhasLogin: asNumber(row.tentativas_falhas_login),
    bloqueadoAte: asOptionalString(row.bloqueado_ate),
    ativo: asBoolean(row.ativo),
    ultimoAcessoEm: asOptionalString(row.ultimo_acesso_em),
    criadoEm: asString(row.criado_em),
    atualizadoEm: asString(row.atualizado_em),
  }
}

function mapSessionRow(row: SqlRow): SessionRecord {
  return {
    token: asString(row.token),
    usuarioId: asString(row.usuario_id),
    expiraEm: asString(row.expira_em),
    criadoEm: asString(row.criado_em),
  }
}

async function readAccessMatrixFromExecutor(executor: SqlExecutor) {
  if (accessMatrixCache && accessMatrixCache.expiresAt > Date.now()) {
    return accessMatrixCache.matrix
  }

  const rows = await executor.query<{ acessos_json: unknown }>(
    'select acessos_json from app_settings where id = ? limit 1',
    [APP_RECORD_ID],
  )

  const matrix = normalizeAdminAccessMatrix(parseJsonValue(rows[0]?.acessos_json, undefined))
  accessMatrixCache = {
    matrix,
    expiresAt: Date.now() + ACCESS_MATRIX_CACHE_TTL_MS,
  }

  return matrix
}

async function findUserRowByEmail(executor: SqlExecutor, email: string) {
  const rows = await executor.query(
    'select * from usuarios where email = ? and ativo = ? limit 1',
    [email.trim().toLowerCase(), true],
  )

  return rows[0] ? mapUserRow(rows[0]) : null
}

async function findUserRowById(executor: SqlExecutor, userId: string) {
  const rows = await executor.query('select * from usuarios where id = ? and ativo = ? limit 1', [
    userId,
    true,
  ])

  return rows[0] ? mapUserRow(rows[0]) : null
}

async function findSessionRowByToken(executor: SqlExecutor, tokenHash: string) {
  const rows = await executor.query('select * from sessoes where token = ? limit 1', [tokenHash])
  return rows[0] ? mapSessionRow(rows[0]) : null
}

async function findSessionContextRow(executor: SqlExecutor, tokenHash: string) {
  const rows = await executor.query(
    `
      select
        s.token as session_token,
        s.usuario_id as session_usuario_id,
        s.expira_em as session_expira_em,
        s.criado_em as session_criado_em,
        u.id as user_id,
        u.nome as user_nome,
        u.email as user_email,
        u.perfil as user_perfil,
        u.area_id as user_area_id,
        u.senha_hash as user_senha_hash,
        u.deve_trocar_senha as user_deve_trocar_senha,
        u.tentativas_falhas_login as user_tentativas_falhas_login,
        u.bloqueado_ate as user_bloqueado_ate,
        u.ativo as user_ativo,
        u.ultimo_acesso_em as user_ultimo_acesso_em,
        u.criado_em as user_criado_em,
        u.atualizado_em as user_atualizado_em
      from sessoes s
      inner join usuarios u on u.id = s.usuario_id
      where s.token = ?
        and u.ativo = ?
      limit 1
    `,
    [tokenHash, true],
  )

  if (rows.length === 0) {
    return null
  }

  const row = rows[0]

  return {
    session: mapSessionRow({
      token: row.session_token,
      usuario_id: row.session_usuario_id,
      expira_em: row.session_expira_em,
      criado_em: row.session_criado_em,
    }),
    user: mapUserRow({
      id: row.user_id,
      nome: row.user_nome,
      email: row.user_email,
      perfil: row.user_perfil,
      area_id: row.user_area_id,
      senha_hash: row.user_senha_hash,
      deve_trocar_senha: row.user_deve_trocar_senha,
      tentativas_falhas_login: row.user_tentativas_falhas_login,
      bloqueado_ate: row.user_bloqueado_ate,
      ativo: row.user_ativo,
      ultimo_acesso_em: row.user_ultimo_acesso_em,
      criado_em: row.user_criado_em,
      atualizado_em: row.user_atualizado_em,
    }),
  }
}

function nullable(value?: string) {
  return value ?? null
}

function getPlaceholders(size: number) {
  return Array.from({ length: size }, () => '?').join(', ')
}

function buildUpsertStatement(
  driver: DatabaseDriver,
  table: string,
  columns: string[],
  conflictColumns: string[],
) {
  const insertColumns = columns.join(', ')
  const placeholders = getPlaceholders(columns.length)
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column))

  if (driver === 'postgres') {
    if (updateColumns.length === 0) {
      return `insert into ${table} (${insertColumns}) values (${placeholders}) on conflict (${conflictColumns.join(', ')}) do nothing`
    }

    return `insert into ${table} (${insertColumns}) values (${placeholders}) on conflict (${conflictColumns.join(', ')}) do update set ${updateColumns
      .map((column) => `${column} = excluded.${column}`)
      .join(', ')}`
  }

  if (updateColumns.length === 0) {
    return `insert into ${table} (${insertColumns}) values (${placeholders}) on duplicate key update ${conflictColumns[0]} = values(${conflictColumns[0]})`
  }

  return `insert into ${table} (${insertColumns}) values (${placeholders}) on duplicate key update ${updateColumns
    .map((column) => `${column} = values(${column})`)
    .join(', ')}`
}

async function upsertRows(
  executor: SqlExecutor,
  table: string,
  columns: string[],
  rows: Array<Record<string, SqlValue>>,
  conflictColumns: string[],
) {
  if (rows.length === 0) {
    return
  }

  const statement = buildUpsertStatement(executor.driver, table, columns, conflictColumns)

  for (const row of rows) {
    await executor.execute(
      statement,
      columns.map((column) => row[column] ?? null),
    )
  }
}

async function deleteRowsNotIn(
  executor: SqlExecutor,
  table: string,
  idColumn: string,
  keepIds: string[],
) {
  if (keepIds.length === 0) {
    await executor.execute(`delete from ${table}`)
    return
  }

  await executor.execute(
    `delete from ${table} where ${idColumn} not in (${getPlaceholders(keepIds.length)})`,
    keepIds,
  )
}

async function queryTableExists(executor: SqlExecutor, tableName: string) {
  const statement =
    executor.driver === 'postgres'
      ? `
          select table_name
          from information_schema.tables
          where table_schema = 'public'
            and table_name = ?
          limit 1
        `
      : `
          select table_name
          from information_schema.tables
          where table_schema = database()
            and table_name = ?
          limit 1
        `

  const rows = await executor.query(statement, [tableName])
  return rows.length > 0
}

async function loadLegacyState(executor: SqlExecutor) {
  const hasLegacyTable = await queryTableExists(executor, 'app_state')
  if (!hasLegacyTable) {
    return null
  }

  const rows = await executor.query<{ payload: AppDatabase | string }>(
    'select payload from app_state where id = ? limit 1',
    [LEGACY_APP_STATE_ID],
  )

  if (rows.length === 0) {
    return null
  }

  return normalizeDatabase(rows[0].payload)
}

async function ensurePostgresSchema() {
  const executor = createPostgresExecutor(getPostgresClient())
  const statements = [
    `
      create table if not exists app_meta (
        id text primary key,
        versao integer not null,
        sequencial_protocolo integer not null,
        updated_at text not null
      )
    `,
    `
      create table if not exists app_settings (
        id text primary key,
        empresa_json text not null,
        notificacoes_json text not null,
        sla_json text not null,
        acessos_json text not null,
        updated_at text not null
      )
    `,
    `
      create table if not exists departamentos (
        id text primary key,
        nome text not null,
        responsavel text not null,
        email text not null,
        ativo boolean not null default true,
        criado_em text not null,
        atualizado_em text not null
      )
    `,
    `
      create table if not exists usuarios (
        id text primary key,
        nome text not null,
        email text not null unique,
        perfil text not null,
        area_id text null references departamentos(id) on delete set null,
        senha_hash text not null,
        deve_trocar_senha boolean not null default false,
        tentativas_falhas_login integer not null default 0,
        bloqueado_ate text null,
        ativo boolean not null default true,
        ultimo_acesso_em text null,
        criado_em text not null,
        atualizado_em text not null
      )
    `,
    `
      create table if not exists templates_resposta (
        id text primary key,
        titulo text not null,
        descricao text not null,
        assunto text not null,
        corpo text not null,
        tipo text not null,
        envio_automatico boolean not null default false,
        categoria text not null,
        criado_em text not null,
        atualizado_em text not null
      )
    `,
    `
      create table if not exists manifestacoes (
        id text primary key,
        protocolo text not null unique,
        natureza text not null,
        natureza_original text not null,
        assunto text not null,
        complexidade text not null,
        prioridade text not null,
        status text not null,
        status_publico text not null,
        lane_atual text not null,
        canal_origem text not null,
        titulo text not null,
        descricao text not null,
        data_ocorrido text null,
        local_ocorrido text null,
        pessoas_envolvidas text null,
        tentativa_anterior text not null,
        descricao_tentativa text null,
        situacao_em_andamento text not null,
        risco_imediato text not null,
        area_responsavel_id text null references departamentos(id) on delete set null,
        responsavel_atual_id text null references usuarios(id) on delete set null,
        prazo_resposta_inicial text not null,
        prazo_resposta_final text not null,
        data_resposta_inicial text null,
        data_resposta_final text null,
        prorrogada boolean not null default false,
        justificativa_prorrogacao text null,
        criado_em text not null,
        atualizado_em text not null,
        concluido_em text null,
        arquivado_em text null
      )
    `,
    `
      create table if not exists manifestantes (
        manifestation_id text primary key references manifestacoes(id) on delete cascade,
        tipo_identificacao text not null,
        nome text null,
        cpf_cnpj text null,
        email text null,
        telefone text null,
        relacao_artglass text null,
        deseja_retorno text not null,
        melhor_horario text null,
        consentimento_lgpd boolean not null default false,
        declaracao_verdade boolean not null default false
      )
    `,
    `
      create table if not exists anexos (
        id text primary key,
        manifestation_id text not null references manifestacoes(id) on delete cascade,
        nome_arquivo text not null,
        caminho_arquivo text not null,
        mime_type text not null,
        tamanho integer not null,
        enviado_por text not null,
        visibilidade text not null,
        criado_em text not null
      )
    `,
    `
      create table if not exists attachment_blobs (
        attachment_id text primary key,
        manifestation_id text not null,
        filename text not null,
        mime_type text not null,
        size_bytes integer not null,
        content_base64 text not null,
        created_at text not null default ''
      )
    `,
    `
      create table if not exists comunicacoes (
        id text primary key,
        manifestation_id text not null references manifestacoes(id) on delete cascade,
        tipo text not null,
        assunto text not null,
        corpo text not null,
        remetente text not null,
        destinatario text not null,
        status text not null,
        canal text not null,
        enviada_em text null,
        criada_em text not null
      )
    `,
    `
      create table if not exists comentarios (
        id text primary key,
        manifestation_id text not null references manifestacoes(id) on delete cascade,
        autor text not null,
        perfil text not null,
        corpo text not null,
        criado_em text not null
      )
    `,
    `
      create table if not exists timeline_registros (
        id text primary key,
        manifestation_id text not null references manifestacoes(id) on delete cascade,
        data text not null,
        usuario text not null,
        acao text not null,
        descricao text not null,
        visibilidade text not null
      )
    `,
    `
      create table if not exists pesquisas_satisfacao (
        id text primary key,
        manifestation_id text not null references manifestacoes(id) on delete cascade,
        nota_geral integer not null,
        clareza integer not null,
        tempo_resposta integer not null,
        respeito integer not null,
        demanda_compreendida text not null,
        deseja_reabrir boolean not null default false,
        comentario text null,
        criado_em text not null
      )
    `,
    `
      create table if not exists sessoes (
        token text primary key,
        usuario_id text not null references usuarios(id) on delete cascade,
        expira_em text not null,
        criado_em text not null
      )
    `,
  ]

  for (const statement of statements) {
    await executor.execute(statement)
  }
}

async function ensureMysqlSchema() {
  const executor = createMysqlExecutor(getMysqlPool())
  const statements = [
    `
      create table if not exists app_meta (
        id varchar(191) primary key,
        versao int not null,
        sequencial_protocolo int not null,
        updated_at varchar(40) not null
      )
    `,
    `
      create table if not exists app_settings (
        id varchar(191) primary key,
        empresa_json longtext not null,
        notificacoes_json longtext not null,
        sla_json longtext not null,
        acessos_json longtext not null,
        updated_at varchar(40) not null
      )
    `,
    `
      create table if not exists departamentos (
        id varchar(191) primary key,
        nome varchar(255) not null,
        responsavel varchar(255) not null,
        email varchar(255) not null,
        ativo boolean not null default true,
        criado_em varchar(40) not null,
        atualizado_em varchar(40) not null
      )
    `,
    `
      create table if not exists usuarios (
        id varchar(191) primary key,
        nome varchar(255) not null,
        email varchar(255) not null unique,
        perfil varchar(60) not null,
        area_id varchar(191) null,
        senha_hash longtext not null,
        deve_trocar_senha boolean not null default false,
        tentativas_falhas_login int not null default 0,
        bloqueado_ate varchar(40) null,
        ativo boolean not null default true,
        ultimo_acesso_em varchar(40) null,
        criado_em varchar(40) not null,
        atualizado_em varchar(40) not null,
        constraint fk_usuarios_area foreign key (area_id) references departamentos(id) on delete set null
      )
    `,
    `
      create table if not exists templates_resposta (
        id varchar(191) primary key,
        titulo varchar(255) not null,
        descricao text not null,
        assunto varchar(255) not null,
        corpo longtext not null,
        tipo varchar(40) not null,
        envio_automatico boolean not null default false,
        categoria varchar(40) not null,
        criado_em varchar(40) not null,
        atualizado_em varchar(40) not null
      )
    `,
    `
      create table if not exists manifestacoes (
        id varchar(191) primary key,
        protocolo varchar(191) not null unique,
        natureza varchar(60) not null,
        natureza_original varchar(60) not null,
        assunto varchar(80) not null,
        complexidade varchar(40) not null,
        prioridade varchar(40) not null,
        status varchar(80) not null,
        status_publico varchar(80) not null,
        lane_atual varchar(60) not null,
        canal_origem varchar(40) not null,
        titulo varchar(255) not null,
        descricao longtext not null,
        data_ocorrido varchar(40) null,
        local_ocorrido varchar(255) null,
        pessoas_envolvidas longtext null,
        tentativa_anterior varchar(40) not null,
        descricao_tentativa longtext null,
        situacao_em_andamento varchar(40) not null,
        risco_imediato varchar(40) not null,
        area_responsavel_id varchar(191) null,
        responsavel_atual_id varchar(191) null,
        prazo_resposta_inicial varchar(40) not null,
        prazo_resposta_final varchar(40) not null,
        data_resposta_inicial varchar(40) null,
        data_resposta_final varchar(40) null,
        prorrogada boolean not null default false,
        justificativa_prorrogacao longtext null,
        criado_em varchar(40) not null,
        atualizado_em varchar(40) not null,
        concluido_em varchar(40) null,
        arquivado_em varchar(40) null,
        constraint fk_manifestacoes_area foreign key (area_responsavel_id) references departamentos(id) on delete set null,
        constraint fk_manifestacoes_responsavel foreign key (responsavel_atual_id) references usuarios(id) on delete set null
      )
    `,
    `
      create table if not exists manifestantes (
        manifestation_id varchar(191) primary key,
        tipo_identificacao varchar(40) not null,
        nome varchar(255) null,
        cpf_cnpj varchar(40) null,
        email varchar(255) null,
        telefone varchar(80) null,
        relacao_artglass varchar(60) null,
        deseja_retorno varchar(40) not null,
        melhor_horario varchar(120) null,
        consentimento_lgpd boolean not null default false,
        declaracao_verdade boolean not null default false,
        constraint fk_manifestantes_manifestacao foreign key (manifestation_id) references manifestacoes(id) on delete cascade
      )
    `,
    `
      create table if not exists anexos (
        id varchar(191) primary key,
        manifestation_id varchar(191) not null,
        nome_arquivo varchar(255) not null,
        caminho_arquivo varchar(255) not null,
        mime_type varchar(191) not null,
        tamanho int not null,
        enviado_por varchar(191) not null,
        visibilidade varchar(40) not null,
        criado_em varchar(40) not null,
        constraint fk_anexos_manifestacao foreign key (manifestation_id) references manifestacoes(id) on delete cascade
      )
    `,
    `
      create table if not exists attachment_blobs (
        attachment_id varchar(191) primary key,
        manifestation_id varchar(191) not null,
        filename varchar(255) not null,
        mime_type varchar(191) not null,
        size_bytes int not null,
        content_base64 longtext not null,
        created_at varchar(40) not null default ''
      )
    `,
    `
      create table if not exists comunicacoes (
        id varchar(191) primary key,
        manifestation_id varchar(191) not null,
        tipo varchar(40) not null,
        assunto varchar(255) not null,
        corpo longtext not null,
        remetente varchar(255) not null,
        destinatario varchar(255) not null,
        status varchar(40) not null,
        canal varchar(40) not null,
        enviada_em varchar(40) null,
        criada_em varchar(40) not null,
        constraint fk_comunicacoes_manifestacao foreign key (manifestation_id) references manifestacoes(id) on delete cascade
      )
    `,
    `
      create table if not exists comentarios (
        id varchar(191) primary key,
        manifestation_id varchar(191) not null,
        autor varchar(255) not null,
        perfil varchar(60) not null,
        corpo longtext not null,
        criado_em varchar(40) not null,
        constraint fk_comentarios_manifestacao foreign key (manifestation_id) references manifestacoes(id) on delete cascade
      )
    `,
    `
      create table if not exists timeline_registros (
        id varchar(191) primary key,
        manifestation_id varchar(191) not null,
        data varchar(40) not null,
        usuario varchar(255) not null,
        acao varchar(255) not null,
        descricao longtext not null,
        visibilidade varchar(40) not null,
        constraint fk_timeline_manifestacao foreign key (manifestation_id) references manifestacoes(id) on delete cascade
      )
    `,
    `
      create table if not exists pesquisas_satisfacao (
        id varchar(191) primary key,
        manifestation_id varchar(191) not null,
        nota_geral int not null,
        clareza int not null,
        tempo_resposta int not null,
        respeito int not null,
        demanda_compreendida varchar(40) not null,
        deseja_reabrir boolean not null default false,
        comentario longtext null,
        criado_em varchar(40) not null,
        constraint fk_pesquisas_manifestacao foreign key (manifestation_id) references manifestacoes(id) on delete cascade
      )
    `,
    `
      create table if not exists sessoes (
        token varchar(191) primary key,
        usuario_id varchar(191) not null,
        expira_em varchar(40) not null,
        criado_em varchar(40) not null,
        constraint fk_sessoes_usuario foreign key (usuario_id) references usuarios(id) on delete cascade
      )
    `,
  ]

  for (const statement of statements) {
    await executor.execute(statement)
  }
}

function serializeSettings(settings: AppSettingsRecord) {
  return {
    empresa_json: JSON.stringify(settings.empresa),
    notificacoes_json: JSON.stringify(settings.notificacoes),
    sla_json: JSON.stringify(settings.sla),
    acessos_json: JSON.stringify(settings.acessos),
  }
}

function buildEmptyManifestante(): ManifestanteRecord {
  return {
    tipoIdentificacao: 'anonima',
    desejaRetorno: 'anonimo',
    consentimentoLgpd: false,
    declaracaoVerdade: false,
  }
}

function groupByManifestationId<T extends { manifestation_id: string }>(rows: T[]) {
  const groups = new Map<string, T[]>()

  for (const row of rows) {
    const current = groups.get(row.manifestation_id) ?? []
    current.push(row)
    groups.set(row.manifestation_id, current)
  }

  return groups
}

function sortDescendingByDate<T>(records: T[], getDate: (record: T) => string | undefined) {
  return [...records].sort(
    (left, right) =>
      new Date(getDate(right) ?? 0).getTime() - new Date(getDate(left) ?? 0).getTime(),
  )
}

async function readRelationalState(executor: SqlExecutor, shouldNormalize = true) {
  const metaRows = await executor.query('select * from app_meta where id = ? limit 1', [APP_RECORD_ID])
  const settingsRows = await executor.query('select * from app_settings where id = ? limit 1', [
    APP_RECORD_ID,
  ])

  if (metaRows.length === 0 || settingsRows.length === 0) {
    throw new Error('Estado relacional da aplicacao nao encontrado no banco de dados.')
  }

  const departmentRows = await executor.query('select * from departamentos')
  const userRows = await executor.query('select * from usuarios')
  const templateRows = await executor.query('select * from templates_resposta')
  const manifestationRows = await executor.query('select * from manifestacoes')
  const manifestanteRows = await executor.query('select * from manifestantes')
  const attachmentRows = await executor.query('select * from anexos')
  const communicationRows = await executor.query('select * from comunicacoes')
  const commentRows = await executor.query('select * from comentarios')
  const timelineRows = await executor.query('select * from timeline_registros')
  const surveyRows = await executor.query('select * from pesquisas_satisfacao')
  const sessionRows = await executor.query('select * from sessoes')

  const settingsRow = settingsRows[0]
  const settings: AppSettingsRecord = {
    empresa: parseJsonValue(settingsRow.empresa_json, createSeedDatabase().settings.empresa),
    notificacoes: parseJsonValue(
      settingsRow.notificacoes_json,
      createSeedDatabase().settings.notificacoes,
    ),
    sla: parseJsonValue(settingsRow.sla_json, createSeedDatabase().settings.sla),
    acessos: normalizeAdminAccessMatrix(parseJsonValue(settingsRow.acessos_json, undefined)),
  }

  const manifestantesByManifestationId = new Map<string, ManifestanteRecord>()
  for (const row of manifestanteRows) {
    manifestantesByManifestationId.set(asString(row.manifestation_id), {
      tipoIdentificacao: asString(row.tipo_identificacao) as ManifestanteRecord['tipoIdentificacao'],
      nome: asOptionalString(row.nome),
      cpfCnpj: asOptionalString(row.cpf_cnpj),
      email: asOptionalString(row.email),
      telefone: asOptionalString(row.telefone),
      relacaoArtGlass: asOptionalString(row.relacao_artglass) as ManifestanteRecord['relacaoArtGlass'],
      desejaRetorno: asString(row.deseja_retorno) as ManifestanteRecord['desejaRetorno'],
      melhorHorario: asOptionalString(row.melhor_horario),
      consentimentoLgpd: asBoolean(row.consentimento_lgpd),
      declaracaoVerdade: asBoolean(row.declaracao_verdade),
    })
  }

  const attachmentsByManifestationId = groupByManifestationId(
    attachmentRows.map((row) => ({
      manifestation_id: asString(row.manifestation_id),
      id: asString(row.id),
      nome_arquivo: asString(row.nome_arquivo),
      caminho_arquivo: asString(row.caminho_arquivo),
      mime_type: asString(row.mime_type),
      tamanho: asNumber(row.tamanho),
      enviado_por: asString(row.enviado_por),
      visibilidade: asString(row.visibilidade),
      criado_em: asString(row.criado_em),
    })),
  )

  const communicationsByManifestationId = groupByManifestationId(
    communicationRows.map((row) => ({
      manifestation_id: asString(row.manifestation_id),
      id: asString(row.id),
      tipo: asString(row.tipo),
      assunto: asString(row.assunto),
      corpo: asString(row.corpo),
      remetente: asString(row.remetente),
      destinatario: asString(row.destinatario),
      status: asString(row.status),
      canal: asString(row.canal),
      enviada_em: asOptionalString(row.enviada_em),
      criada_em: asString(row.criada_em),
    })),
  )

  const commentsByManifestationId = groupByManifestationId(
    commentRows.map((row) => ({
      manifestation_id: asString(row.manifestation_id),
      id: asString(row.id),
      autor: asString(row.autor),
      perfil: asString(row.perfil),
      corpo: asString(row.corpo),
      criado_em: asString(row.criado_em),
    })),
  )

  const timelineByManifestationId = groupByManifestationId(
    timelineRows.map((row) => ({
      manifestation_id: asString(row.manifestation_id),
      id: asString(row.id),
      data: asString(row.data),
      usuario: asString(row.usuario),
      acao: asString(row.acao),
      descricao: asString(row.descricao),
      visibilidade: asString(row.visibilidade),
    })),
  )

  const manifestacoes: ManifestationRecord[] = manifestationRows.map((row) => {
    const manifestationId = asString(row.id)
    const anexos: AttachmentRecord[] = sortDescendingByDate(
      (attachmentsByManifestationId.get(manifestationId) ?? []).map((attachment) => ({
        id: attachment.id,
        nomeArquivo: attachment.nome_arquivo,
        caminhoArquivo: attachment.caminho_arquivo,
        mimeType: attachment.mime_type,
        tamanho: attachment.tamanho,
        enviadoPor: attachment.enviado_por,
        visibilidade: attachment.visibilidade as AttachmentRecord['visibilidade'],
        criadoEm: attachment.criado_em,
      })),
      (attachment) => attachment.criadoEm,
    )

    const comunicacoes: CommunicationRecord[] = sortDescendingByDate(
      (communicationsByManifestationId.get(manifestationId) ?? []).map((communication) => ({
        id: communication.id,
        tipo: communication.tipo as CommunicationRecord['tipo'],
        assunto: communication.assunto,
        corpo: communication.corpo,
        de: communication.remetente,
        para: communication.destinatario,
        status: communication.status as CommunicationRecord['status'],
        canal: communication.canal as CommunicationRecord['canal'],
        enviadaEm: communication.enviada_em,
        criadaEm: communication.criada_em,
      })),
      (communication) => communication.criadaEm,
    )

    const comentarios: CommentRecord[] = sortDescendingByDate(
      (commentsByManifestationId.get(manifestationId) ?? []).map((comment) => ({
        id: comment.id,
        autor: comment.autor,
        perfil: comment.perfil as CommentRecord['perfil'],
        corpo: comment.corpo,
        criadoEm: comment.criado_em,
      })),
      (comment) => comment.criadoEm,
    )

    const timeline: TimelineRecord[] = sortDescendingByDate(
      (timelineByManifestationId.get(manifestationId) ?? []).map((entry) => ({
        id: entry.id,
        data: entry.data,
        usuario: entry.usuario,
        acao: entry.acao,
        descricao: entry.descricao,
        visibilidade: entry.visibilidade as TimelineRecord['visibilidade'],
      })),
      (entry) => entry.data,
    )

    return {
      id: manifestationId,
      protocolo: asString(row.protocolo),
      natureza: asString(row.natureza) as ManifestationRecord['natureza'],
      naturezaOriginal: asString(row.natureza_original) as ManifestationRecord['naturezaOriginal'],
      assunto: asString(row.assunto) as ManifestationRecord['assunto'],
      complexidade: asString(row.complexidade) as ManifestationRecord['complexidade'],
      prioridade: asString(row.prioridade) as ManifestationRecord['prioridade'],
      status: asString(row.status) as ManifestationRecord['status'],
      statusPublico: asString(row.status_publico) as ManifestationRecord['statusPublico'],
      laneAtual: asString(row.lane_atual) as ManifestationRecord['laneAtual'],
      canalOrigem: asString(row.canal_origem) as ManifestationRecord['canalOrigem'],
      titulo: asString(row.titulo),
      descricao: asString(row.descricao),
      dataOcorrido: asOptionalString(row.data_ocorrido),
      localOcorrido: asOptionalString(row.local_ocorrido),
      pessoasEnvolvidas: asOptionalString(row.pessoas_envolvidas),
      tentativaAnterior: asString(row.tentativa_anterior) as ManifestationRecord['tentativaAnterior'],
      descricaoTentativa: asOptionalString(row.descricao_tentativa),
      situacaoEmAndamento: asString(row.situacao_em_andamento) as ManifestationRecord['situacaoEmAndamento'],
      riscoImediato: asString(row.risco_imediato) as ManifestationRecord['riscoImediato'],
      manifestante: manifestantesByManifestationId.get(manifestationId) ?? buildEmptyManifestante(),
      areaResponsavelId: asOptionalString(row.area_responsavel_id),
      responsavelAtualId: asOptionalString(row.responsavel_atual_id),
      prazoRespostaInicial: asString(row.prazo_resposta_inicial),
      prazoRespostaFinal: asString(row.prazo_resposta_final),
      dataRespostaInicial: asOptionalString(row.data_resposta_inicial),
      dataRespostaFinal: asOptionalString(row.data_resposta_final),
      prorrogada: asBoolean(row.prorrogada),
      justificativaProrrogacao: asOptionalString(row.justificativa_prorrogacao),
      anexos,
      comunicacoes,
      comentarios,
      timeline,
      criadoEm: asString(row.criado_em),
      atualizadoEm: asString(row.atualizado_em),
      concluidoEm: asOptionalString(row.concluido_em),
      arquivadoEm: asOptionalString(row.arquivado_em),
    }
  })

  const pesquisas: SatisfactionSurveyRecord[] = surveyRows.map((row) => ({
    id: asString(row.id),
    manifestacaoId: asString(row.manifestation_id),
    notaGeral: asNumber(row.nota_geral),
    clareza: asNumber(row.clareza),
    tempoResposta: asNumber(row.tempo_resposta),
    respeito: asNumber(row.respeito),
    demandaCompreendida: asString(
      row.demanda_compreendida,
    ) as SatisfactionSurveyRecord['demandaCompreendida'],
    desejaReabrir: asBoolean(row.deseja_reabrir),
    comentario: asOptionalString(row.comentario),
    criadoEm: asString(row.criado_em),
  }))

  const database: AppDatabase = {
    versao: asNumber(metaRows[0].versao),
    sequencialProtocolo: asNumber(metaRows[0].sequencial_protocolo),
    settings,
    departamentos: departmentRows.map((row) => ({
      id: asString(row.id),
      nome: asString(row.nome),
      responsavel: asString(row.responsavel),
      email: asString(row.email),
      ativo: asBoolean(row.ativo),
      criadoEm: asString(row.criado_em),
      atualizadoEm: asString(row.atualizado_em),
    })),
    usuarios: userRows.map((row) => ({
      id: asString(row.id),
      nome: asString(row.nome),
      email: asString(row.email),
      perfil: asString(row.perfil) as AppUserRecord['perfil'],
      areaId: asOptionalString(row.area_id),
      senhaHash: asString(row.senha_hash),
      deveTrocarSenha: asBoolean(row.deve_trocar_senha),
      tentativasFalhasLogin: asNumber(row.tentativas_falhas_login),
      bloqueadoAte: asOptionalString(row.bloqueado_ate),
      ativo: asBoolean(row.ativo),
      ultimoAcessoEm: asOptionalString(row.ultimo_acesso_em),
      criadoEm: asString(row.criado_em),
      atualizadoEm: asString(row.atualizado_em),
    })),
    templates: templateRows.map((row) => ({
      id: asString(row.id),
      titulo: asString(row.titulo),
      descricao: asString(row.descricao),
      assunto: asString(row.assunto),
      corpo: asString(row.corpo),
      tipo: asString(row.tipo) as ResponseTemplateRecord['tipo'],
      envioAutomatico: asBoolean(row.envio_automatico),
      categoria: asString(row.categoria) as ResponseTemplateRecord['categoria'],
      criadoEm: asString(row.criado_em),
      atualizadoEm: asString(row.atualizado_em),
    })),
    manifestacoes: sortDescendingByDate(manifestacoes, (manifestation) => manifestation.criadoEm),
    pesquisas: sortDescendingByDate(pesquisas, (survey) => survey.criadoEm),
    sessoes: sessionRows.map((row) => ({
      token: asString(row.token),
      usuarioId: asString(row.usuario_id),
      expiraEm: asString(row.expira_em),
      criadoEm: asString(row.criado_em),
    })),
  }

  return shouldNormalize ? normalizeDatabase(database) : database
}

function createMutationContext(executor: SqlExecutor): DatabaseMutationContext {
  return {
    async saveAttachmentBlob(input) {
      await upsertRows(
        executor,
        'attachment_blobs',
        [
          'attachment_id',
          'manifestation_id',
          'filename',
          'mime_type',
          'size_bytes',
          'content_base64',
          'created_at',
        ],
        [
          {
            attachment_id: input.attachmentId,
            manifestation_id: input.manifestationId,
            filename: input.fileName,
            mime_type: input.mimeType,
            size_bytes: input.sizeBytes,
            content_base64: input.contentBase64,
            created_at: new Date().toISOString(),
          },
        ],
        ['attachment_id'],
      )
    },
  }
}

async function persistRelationalSnapshot(executor: SqlExecutor, database: AppDatabase) {
  const normalized = normalizeDatabase(database)
  const now = new Date().toISOString()
  const settingsColumns = serializeSettings(normalized.settings)
  accessMatrixCache = {
    matrix: normalized.settings.acessos,
    expiresAt: Date.now() + ACCESS_MATRIX_CACHE_TTL_MS,
  }

  await upsertRows(
    executor,
    'app_meta',
    ['id', 'versao', 'sequencial_protocolo', 'updated_at'],
    [
      {
        id: APP_RECORD_ID,
        versao: normalized.versao,
        sequencial_protocolo: normalized.sequencialProtocolo,
        updated_at: now,
      },
    ],
    ['id'],
  )

  await upsertRows(
    executor,
    'app_settings',
    ['id', 'empresa_json', 'notificacoes_json', 'sla_json', 'acessos_json', 'updated_at'],
    [
      {
        id: APP_RECORD_ID,
        ...settingsColumns,
        updated_at: now,
      },
    ],
    ['id'],
  )

  await upsertRows(
    executor,
    'departamentos',
    ['id', 'nome', 'responsavel', 'email', 'ativo', 'criado_em', 'atualizado_em'],
    normalized.departamentos.map((department) => ({
      id: department.id,
      nome: department.nome,
      responsavel: department.responsavel,
      email: department.email,
      ativo: department.ativo,
      criado_em: department.criadoEm,
      atualizado_em: department.atualizadoEm,
    })),
    ['id'],
  )

  await upsertRows(
    executor,
    'usuarios',
    [
      'id',
      'nome',
      'email',
      'perfil',
      'area_id',
      'senha_hash',
      'deve_trocar_senha',
      'tentativas_falhas_login',
      'bloqueado_ate',
      'ativo',
      'ultimo_acesso_em',
      'criado_em',
      'atualizado_em',
    ],
    normalized.usuarios.map((user) => ({
      id: user.id,
      nome: user.nome,
      email: user.email.toLowerCase(),
      perfil: user.perfil,
      area_id: nullable(user.areaId),
      senha_hash: user.senhaHash,
      deve_trocar_senha: Boolean(user.deveTrocarSenha),
      tentativas_falhas_login: user.tentativasFalhasLogin ?? 0,
      bloqueado_ate: nullable(user.bloqueadoAte),
      ativo: user.ativo,
      ultimo_acesso_em: nullable(user.ultimoAcessoEm),
      criado_em: user.criadoEm,
      atualizado_em: user.atualizadoEm,
    })),
    ['id'],
  )

  await upsertRows(
    executor,
    'templates_resposta',
    [
      'id',
      'titulo',
      'descricao',
      'assunto',
      'corpo',
      'tipo',
      'envio_automatico',
      'categoria',
      'criado_em',
      'atualizado_em',
    ],
    normalized.templates.map((template) => ({
      id: template.id,
      titulo: template.titulo,
      descricao: template.descricao,
      assunto: template.assunto,
      corpo: template.corpo,
      tipo: template.tipo,
      envio_automatico: template.envioAutomatico,
      categoria: template.categoria,
      criado_em: template.criadoEm,
      atualizado_em: template.atualizadoEm,
    })),
    ['id'],
  )

  await upsertRows(
    executor,
    'manifestacoes',
    [
      'id',
      'protocolo',
      'natureza',
      'natureza_original',
      'assunto',
      'complexidade',
      'prioridade',
      'status',
      'status_publico',
      'lane_atual',
      'canal_origem',
      'titulo',
      'descricao',
      'data_ocorrido',
      'local_ocorrido',
      'pessoas_envolvidas',
      'tentativa_anterior',
      'descricao_tentativa',
      'situacao_em_andamento',
      'risco_imediato',
      'area_responsavel_id',
      'responsavel_atual_id',
      'prazo_resposta_inicial',
      'prazo_resposta_final',
      'data_resposta_inicial',
      'data_resposta_final',
      'prorrogada',
      'justificativa_prorrogacao',
      'criado_em',
      'atualizado_em',
      'concluido_em',
      'arquivado_em',
    ],
    normalized.manifestacoes.map((manifestation) => ({
      id: manifestation.id,
      protocolo: manifestation.protocolo,
      natureza: manifestation.natureza,
      natureza_original: manifestation.naturezaOriginal,
      assunto: manifestation.assunto,
      complexidade: manifestation.complexidade,
      prioridade: manifestation.prioridade,
      status: manifestation.status,
      status_publico: manifestation.statusPublico,
      lane_atual: manifestation.laneAtual,
      canal_origem: manifestation.canalOrigem,
      titulo: manifestation.titulo,
      descricao: manifestation.descricao,
      data_ocorrido: nullable(manifestation.dataOcorrido),
      local_ocorrido: nullable(manifestation.localOcorrido),
      pessoas_envolvidas: nullable(manifestation.pessoasEnvolvidas),
      tentativa_anterior: manifestation.tentativaAnterior,
      descricao_tentativa: nullable(manifestation.descricaoTentativa),
      situacao_em_andamento: manifestation.situacaoEmAndamento,
      risco_imediato: manifestation.riscoImediato,
      area_responsavel_id: nullable(manifestation.areaResponsavelId),
      responsavel_atual_id: nullable(manifestation.responsavelAtualId),
      prazo_resposta_inicial: manifestation.prazoRespostaInicial,
      prazo_resposta_final: manifestation.prazoRespostaFinal,
      data_resposta_inicial: nullable(manifestation.dataRespostaInicial),
      data_resposta_final: nullable(manifestation.dataRespostaFinal),
      prorrogada: manifestation.prorrogada,
      justificativa_prorrogacao: nullable(manifestation.justificativaProrrogacao),
      criado_em: manifestation.criadoEm,
      atualizado_em: manifestation.atualizadoEm,
      concluido_em: nullable(manifestation.concluidoEm),
      arquivado_em: nullable(manifestation.arquivadoEm),
    })),
    ['id'],
  )

  await upsertRows(
    executor,
    'manifestantes',
    [
      'manifestation_id',
      'tipo_identificacao',
      'nome',
      'cpf_cnpj',
      'email',
      'telefone',
      'relacao_artglass',
      'deseja_retorno',
      'melhor_horario',
      'consentimento_lgpd',
      'declaracao_verdade',
    ],
    normalized.manifestacoes.map((manifestation) => ({
      manifestation_id: manifestation.id,
      tipo_identificacao: manifestation.manifestante.tipoIdentificacao,
      nome: nullable(manifestation.manifestante.nome),
      cpf_cnpj: nullable(manifestation.manifestante.cpfCnpj),
      email: nullable(manifestation.manifestante.email?.toLowerCase()),
      telefone: nullable(manifestation.manifestante.telefone),
      relacao_artglass: nullable(manifestation.manifestante.relacaoArtGlass),
      deseja_retorno: manifestation.manifestante.desejaRetorno,
      melhor_horario: nullable(manifestation.manifestante.melhorHorario),
      consentimento_lgpd: manifestation.manifestante.consentimentoLgpd,
      declaracao_verdade: manifestation.manifestante.declaracaoVerdade,
    })),
    ['manifestation_id'],
  )

  const attachmentRows = normalized.manifestacoes.flatMap((manifestation) =>
    manifestation.anexos.map((attachment) => ({
      id: attachment.id,
      manifestation_id: manifestation.id,
      nome_arquivo: attachment.nomeArquivo,
      caminho_arquivo: attachment.caminhoArquivo,
      mime_type: attachment.mimeType,
      tamanho: attachment.tamanho,
      enviado_por: attachment.enviadoPor,
      visibilidade: attachment.visibilidade,
      criado_em: attachment.criadoEm,
    })),
  )

  await upsertRows(
    executor,
    'anexos',
    [
      'id',
      'manifestation_id',
      'nome_arquivo',
      'caminho_arquivo',
      'mime_type',
      'tamanho',
      'enviado_por',
      'visibilidade',
      'criado_em',
    ],
    attachmentRows,
    ['id'],
  )

  const communicationRows = normalized.manifestacoes.flatMap((manifestation) =>
    manifestation.comunicacoes.map((communication) => ({
      id: communication.id,
      manifestation_id: manifestation.id,
      tipo: communication.tipo,
      assunto: communication.assunto,
      corpo: communication.corpo,
      remetente: communication.de,
      destinatario: communication.para,
      status: communication.status,
      canal: communication.canal,
      enviada_em: nullable(communication.enviadaEm),
      criada_em: communication.criadaEm,
    })),
  )

  await upsertRows(
    executor,
    'comunicacoes',
    [
      'id',
      'manifestation_id',
      'tipo',
      'assunto',
      'corpo',
      'remetente',
      'destinatario',
      'status',
      'canal',
      'enviada_em',
      'criada_em',
    ],
    communicationRows,
    ['id'],
  )

  const commentRows = normalized.manifestacoes.flatMap((manifestation) =>
    manifestation.comentarios.map((comment) => ({
      id: comment.id,
      manifestation_id: manifestation.id,
      autor: comment.autor,
      perfil: comment.perfil,
      corpo: comment.corpo,
      criado_em: comment.criadoEm,
    })),
  )

  await upsertRows(
    executor,
    'comentarios',
    ['id', 'manifestation_id', 'autor', 'perfil', 'corpo', 'criado_em'],
    commentRows,
    ['id'],
  )

  const timelineRows = normalized.manifestacoes.flatMap((manifestation) =>
    manifestation.timeline.map((entry) => ({
      id: entry.id,
      manifestation_id: manifestation.id,
      data: entry.data,
      usuario: entry.usuario,
      acao: entry.acao,
      descricao: entry.descricao,
      visibilidade: entry.visibilidade,
    })),
  )

  await upsertRows(
    executor,
    'timeline_registros',
    ['id', 'manifestation_id', 'data', 'usuario', 'acao', 'descricao', 'visibilidade'],
    timelineRows,
    ['id'],
  )

  await upsertRows(
    executor,
    'pesquisas_satisfacao',
    [
      'id',
      'manifestation_id',
      'nota_geral',
      'clareza',
      'tempo_resposta',
      'respeito',
      'demanda_compreendida',
      'deseja_reabrir',
      'comentario',
      'criado_em',
    ],
    normalized.pesquisas.map((survey) => ({
      id: survey.id,
      manifestation_id: survey.manifestacaoId,
      nota_geral: survey.notaGeral,
      clareza: survey.clareza,
      tempo_resposta: survey.tempoResposta,
      respeito: survey.respeito,
      demanda_compreendida: survey.demandaCompreendida,
      deseja_reabrir: survey.desejaReabrir,
      comentario: nullable(survey.comentario),
      criado_em: survey.criadoEm,
    })),
    ['id'],
  )

  await upsertRows(
    executor,
    'sessoes',
    ['token', 'usuario_id', 'expira_em', 'criado_em'],
    normalized.sessoes.map((session) => ({
      token: session.token,
      usuario_id: session.usuarioId,
      expira_em: session.expiraEm,
      criado_em: session.criadoEm,
    })),
    ['token'],
  )

  await deleteRowsNotIn(
    executor,
    'manifestantes',
    'manifestation_id',
    normalized.manifestacoes.map((manifestation) => manifestation.id),
  )
  await deleteRowsNotIn(
    executor,
    'anexos',
    'id',
    attachmentRows.map((attachment) => String(attachment.id)),
  )
  await deleteRowsNotIn(
    executor,
    'attachment_blobs',
    'attachment_id',
    attachmentRows.map((attachment) => String(attachment.id)),
  )
  await deleteRowsNotIn(
    executor,
    'comunicacoes',
    'id',
    communicationRows.map((communication) => String(communication.id)),
  )
  await deleteRowsNotIn(
    executor,
    'comentarios',
    'id',
    commentRows.map((comment) => String(comment.id)),
  )
  await deleteRowsNotIn(
    executor,
    'timeline_registros',
    'id',
    timelineRows.map((entry) => String(entry.id)),
  )
  await deleteRowsNotIn(
    executor,
    'pesquisas_satisfacao',
    'id',
    normalized.pesquisas.map((survey) => survey.id),
  )
  await deleteRowsNotIn(
    executor,
    'sessoes',
    'token',
    normalized.sessoes.map((session) => session.token),
  )
  await deleteRowsNotIn(
    executor,
    'manifestacoes',
    'id',
    normalized.manifestacoes.map((manifestation) => manifestation.id),
  )
  await deleteRowsNotIn(
    executor,
    'templates_resposta',
    'id',
    normalized.templates.map((template) => template.id),
  )
  await deleteRowsNotIn(
    executor,
    'usuarios',
    'id',
    normalized.usuarios.map((user) => user.id),
  )
  await deleteRowsNotIn(
    executor,
    'departamentos',
    'id',
    normalized.departamentos.map((department) => department.id),
  )
}

async function ensureRelationalStateSeeded(executor: SqlExecutor) {
  const metaRows = await executor.query('select id from app_meta where id = ? limit 1', [APP_RECORD_ID])
  const settingsRows = await executor.query('select id from app_settings where id = ? limit 1', [
    APP_RECORD_ID,
  ])

  if (metaRows.length > 0 && settingsRows.length > 0) {
    return
  }

  const legacyState = await loadLegacyState(executor)
  const initialState = legacyState ?? normalizeDatabase(await loadInitialState())
  await persistRelationalSnapshot(executor, initialState)
}

async function ensureNormalizedRelationalState(executor: SqlExecutor) {
  const rawDatabase = await readRelationalState(executor, false)
  const rawSnapshot = JSON.stringify(rawDatabase)
  const normalizedDatabase = normalizeDatabase(JSON.parse(rawSnapshot) as AppDatabase)
  const normalizedSnapshot = JSON.stringify(normalizedDatabase)

  if (rawSnapshot !== normalizedSnapshot) {
    await persistRelationalSnapshot(executor, normalizedDatabase)
  }
}

async function ensureDatabase() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const config = getConnectionConfig()

      if (config.driver === 'postgres') {
        await ensurePostgresSchema()
      } else {
        await ensureMysqlSchema()
      }

      await withTransaction(async (executor) => {
        await ensureRelationalStateSeeded(executor)
        await ensureNormalizedRelationalState(executor)
      })
    })().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  await bootstrapPromise
}

export async function findActiveUserForAuthentication(email: string) {
  await ensureDatabase()
  const executor = getReadExecutor()
  return findUserRowByEmail(executor, email)
}

export async function markUserLoginFailure(
  userId: string,
  maxFailedAttempts: number,
  lockMinutes: number,
) {
  await ensureDatabase()
  const executor = getReadExecutor()
  const now = new Date()
  const blockedUntil = new Date(now.getTime() + lockMinutes * 60_000).toISOString()

  await executor.execute(
    `
      update usuarios
      set tentativas_falhas_login = tentativas_falhas_login + 1,
          bloqueado_ate = case
            when tentativas_falhas_login + 1 >= ? then ?
            else bloqueado_ate
          end,
          atualizado_em = ?
      where id = ?
    `,
    [maxFailedAttempts, blockedUntil, now.toISOString(), userId],
  )
}

export async function markUserLoginSuccess(userId: string) {
  await ensureDatabase()
  const now = new Date().toISOString()

  await withTransaction(async (executor) => {
    await executor.execute(
      `
        update usuarios
        set ultimo_acesso_em = ?,
            atualizado_em = ?,
            tentativas_falhas_login = 0,
            bloqueado_ate = null
        where id = ?
      `,
      [now, now, userId],
    )
  })
}

export async function createSessionRecord(session: SessionRecord) {
  await ensureDatabase()
  const now = new Date().toISOString()
  const executor = getReadExecutor()

  await executor.execute(
    `
      update usuarios
      set ultimo_acesso_em = ?,
          atualizado_em = ?,
          tentativas_falhas_login = 0,
          bloqueado_ate = null
      where id = ?
    `,
    [now, now, session.usuarioId],
  )

  await executor.execute(
    `
      insert into sessoes (token, usuario_id, expira_em, criado_em)
      values (?, ?, ?, ?)
    `,
    [session.token, session.usuarioId, session.expiraEm, session.criadoEm],
  )
}

export async function deleteSessionRecord(tokenHash: string) {
  await ensureDatabase()
  await getReadExecutor().execute('delete from sessoes where token = ?', [tokenHash])
}

export async function findSessionContext(tokenHash: string) {
  await ensureDatabase()
  const executor = getReadExecutor()
  const context = await findSessionContextRow(executor, tokenHash)
  if (!context) {
    return null
  }

  const accessMatrix = await readAccessMatrixFromExecutor(executor)

  return {
    session: context.session,
    user: context.user,
    accessMatrix,
  }
}

export async function readDb() {
  await ensureDatabase()
  return readRelationalState(getReadExecutor())
}

export async function writeDb(database: AppDatabase) {
  await ensureDatabase()
  await withTransaction(async (executor) => {
    await persistRelationalSnapshot(executor, database)
  })
}

export async function updateDb<T>(
  updater: (database: AppDatabase, context: DatabaseMutationContext) => Promise<T> | T,
) {
  await ensureDatabase()

  return withTransaction(async (executor) => {
    const database = await readRelationalState(executor)
    const result = await updater(database, createMutationContext(executor))
    await persistRelationalSnapshot(executor, database)
    return result
  })
}

async function getPostgresAttachmentBlob(attachmentId: string): Promise<AttachmentBlobResult | null> {
  const rows = await createPostgresExecutor(getPostgresClient()).query<AttachmentBlobRow>(
    `
      select
        attachment_id,
        manifestation_id,
        filename,
        mime_type,
        size_bytes,
        content_base64
      from attachment_blobs
      where attachment_id = ?
      limit 1
    `,
    [attachmentId],
  )

  if (rows.length === 0) {
    return null
  }

  return {
    id: rows[0].attachment_id,
    manifestationId: rows[0].manifestation_id,
    fileName: rows[0].filename,
    mimeType: rows[0].mime_type,
    sizeBytes: rows[0].size_bytes,
    content: Buffer.from(rows[0].content_base64, 'base64'),
  }
}

async function getMysqlAttachmentBlob(attachmentId: string): Promise<AttachmentBlobResult | null> {
  const rows = await createMysqlExecutor(getMysqlPool()).query<AttachmentBlobRow>(
    `
      select
        attachment_id,
        manifestation_id,
        filename,
        mime_type,
        size_bytes,
        content_base64
      from attachment_blobs
      where attachment_id = ?
      limit 1
    `,
    [attachmentId],
  )

  if (rows.length === 0) {
    return null
  }

  return {
    id: rows[0].attachment_id,
    manifestationId: rows[0].manifestation_id,
    fileName: rows[0].filename,
    mimeType: rows[0].mime_type,
    sizeBytes: rows[0].size_bytes,
    content: Buffer.from(rows[0].content_base64, 'base64'),
  }
}

export async function getAttachmentBlob(attachmentId: string) {
  await ensureDatabase()
  const config = getConnectionConfig()

  if (config.driver === 'postgres') {
    return getPostgresAttachmentBlob(attachmentId)
  }

  return getMysqlAttachmentBlob(attachmentId)
}

import initSqlJs, { type Database } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const AUTH_DB_STORAGE_KEY = 'adegaz:auth-sqlite-db-v1'
const AUTH_SESSION_STORAGE_KEY = 'adegaz:auth-session-v1'
const PASSWORD_SALT = 'adegaz-local-auth-v1'

export type AuthUser = {
  matricula: string
  nome: string
}

type AuthSession = AuthUser & {
  loggedAt: string
}

let sqlPromise: ReturnType<typeof initSqlJs> | null = null

function getSql() {
  sqlPromise ??= initSqlJs({
    locateFile: () => sqlWasmUrl,
  })

  return sqlPromise
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function normalizeMatricula(value: string) {
  return value.trim().replace(/\s+/g, '')
}

function normalizeNome(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

async function openAuthDb() {
  const SQL = await getSql()
  const stored = localStorage.getItem(AUTH_DB_STORAGE_KEY)
  const db = stored ? new SQL.Database(base64ToBytes(stored)) : new SQL.Database()

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      matricula TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      senha_hash TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
  `)

  return db
}

function persistAuthDb(db: Database) {
  localStorage.setItem(AUTH_DB_STORAGE_KEY, bytesToBase64(db.export()))
}

async function hashPassword(matricula: string, senha: string) {
  const payload = `${PASSWORD_SALT}:${matricula}:${senha}`
  const encoded = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', encoded)

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getUserByMatricula(db: Database, matricula: string) {
  const stmt = db.prepare('SELECT matricula, nome, senha_hash FROM usuarios WHERE matricula = ?')

  try {
    stmt.bind([matricula])

    if (!stmt.step()) {
      return undefined
    }

    const row = stmt.getAsObject() as {
      matricula: string
      nome: string
      senha_hash: string
    }

    return row
  } finally {
    stmt.free()
  }
}

function saveSession(user: AuthUser) {
  const session: AuthSession = {
    ...user,
    loggedAt: new Date().toISOString(),
  }

  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

export function getStoredAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as AuthSession) : undefined

    if (!parsed?.matricula || !parsed.nome) {
      return undefined
    }

    return {
      matricula: normalizeMatricula(parsed.matricula),
      nome: normalizeNome(parsed.nome),
    } satisfies AuthUser
  } catch {
    return undefined
  }
}

export async function getSessionUser() {
  const session = getStoredAuthSession()

  if (!session) {
    return undefined
  }

  const db = await openAuthDb()

  try {
    const user = getUserByMatricula(db, session.matricula)

    if (!user) {
      clearAuthSession()
      return undefined
    }

    return {
      matricula: user.matricula,
      nome: user.nome,
    } satisfies AuthUser
  } finally {
    db.close()
  }
}

export async function registerUser(matriculaInput: string, nomeInput: string, senha: string) {
  const matricula = normalizeMatricula(matriculaInput)
  const nome = normalizeNome(nomeInput)

  if (!matricula) {
    throw new Error('Informe a matrícula.')
  }

  if (!nome) {
    throw new Error('Informe o nome.')
  }

  if (senha.length < 6) {
    throw new Error('A senha precisa ter pelo menos 6 caracteres.')
  }

  const db = await openAuthDb()

  try {
    if (getUserByMatricula(db, matricula)) {
      throw new Error('Já existe um usuário com essa matrícula.')
    }

    const senhaHash = await hashPassword(matricula, senha)

    db.run(
      'INSERT INTO usuarios (matricula, nome, senha_hash, criado_em) VALUES (?, ?, ?, ?)',
      [matricula, nome, senhaHash, new Date().toISOString()],
    )
    persistAuthDb(db)

    const user = { matricula, nome }
    saveSession(user)
    return user
  } finally {
    db.close()
  }
}

export async function loginUser(matriculaInput: string, senha: string) {
  const matricula = normalizeMatricula(matriculaInput)

  if (!matricula) {
    throw new Error('Informe a matrícula.')
  }

  if (senha.length < 6) {
    throw new Error('A senha precisa ter pelo menos 6 caracteres.')
  }

  const db = await openAuthDb()

  try {
    const user = getUserByMatricula(db, matricula)

    if (!user) {
      throw new Error('Matrícula ou senha inválida.')
    }

    const senhaHash = await hashPassword(matricula, senha)

    if (senhaHash !== user.senha_hash) {
      throw new Error('Matrícula ou senha inválida.')
    }

    const authUser = {
      matricula: user.matricula,
      nome: user.nome,
    }
    saveSession(authUser)
    return authUser
  } finally {
    db.close()
  }
}

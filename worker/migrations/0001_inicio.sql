-- Calendario de videos: una fila por video planificado. «datos» guarda el guion, la edición y el post (JSON).
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  pilar TEXT NOT NULL DEFAULT '',
  formato TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL,
  gancho TEXT NOT NULL DEFAULT '',
  datos TEXT NOT NULL DEFAULT '{}',
  estado TEXT NOT NULL DEFAULT 'grabar',
  nota TEXT NOT NULL DEFAULT '',
  hechos TEXT NOT NULL DEFAULT '[]',
  creado TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX videos_fecha ON videos (fecha);

-- Archivos en R2: el material que sube Max y las entregas editadas.
CREATE TABLE archivos (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'material',
  nombre TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'application/octet-stream',
  bytes INTEGER NOT NULL DEFAULT 0,
  clave TEXT NOT NULL,
  subida TEXT,
  estado TEXT NOT NULL DEFAULT 'subiendo',
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX archivos_video ON archivos (video_id);

-- Trozos ya subidos de cada archivo: permiten retomar una subida cortada.
CREATE TABLE partes (
  archivo_id TEXT NOT NULL REFERENCES archivos(id) ON DELETE CASCADE,
  n INTEGER NOT NULL,
  etag TEXT NOT NULL,
  PRIMARY KEY (archivo_id, n)
);

CREATE TABLE llaves (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT (datetime('now')),
  usado TEXT
);

CREATE TABLE bitacora (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT,
  quien TEXT NOT NULL,
  texto TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);

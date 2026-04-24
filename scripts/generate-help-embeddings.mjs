#!/usr/bin/env node
/**
 * generate-help-embeddings.mjs
 *
 * Script que regenera los embeddings de docs/help/*.md en Supabase (tabla crm_help_embeddings).
 *
 * Ejecución local (para desarrollo):
 *   GEMINI_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/generate-help-embeddings.mjs
 *
 * Ejecución en CI:
 *   Disparado por .github/workflows/regenerate-help-embeddings.yml en cada push a main
 *   que modifique docs/help/**.
 *
 * Estado: ESQUELETO. Pendiente de implementar cuando se arranque Fase 2 del plan RAG.
 * Ver docs/PLAN_ASISTENTE_RAG_CRM.md §Fase 2 para detalle.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

// ═══════════════════════════════════════════
// Configuración
// ═══════════════════════════════════════════

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DOCS_HELP_PATH = path.resolve(process.cwd(), "docs/help");
const BASE_REPO_URL = "https://github.com/jolivares-valere/valere-v2/blob/main";
const EMBEDDING_MODEL = "text-embedding-004"; // 768 dims
const MAX_CHUNK_CHARS = 800;
const BATCH_SIZE = 20; // inserts in batches to Supabase

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: faltan env vars GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genai.getGenerativeModel({ model: EMBEDDING_MODEL });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ═══════════════════════════════════════════
// Utilidades
// ═══════════════════════════════════════════

/**
 * Recorre recursivamente una carpeta y devuelve rutas absolutas de archivos .md
 */
async function findMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Parte el contenido de un markdown en chunks por secciones (##) respetando MAX_CHUNK_CHARS.
 * Mantiene el header de la sección como contexto en cada chunk.
 */
function chunkMarkdown(content) {
  const lines = content.split("\n");
  const chunks = [];
  let currentHeader = "";
  let currentChunk = "";

  for (const line of lines) {
    // Detectar headers ## o ###
    if (/^###? /.test(line)) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentHeader = line;
      currentChunk = line + "\n";
    } else {
      const next = currentChunk + line + "\n";
      if (next.length > MAX_CHUNK_CHARS && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = currentHeader + "\n(cont.)\n" + line + "\n";
      } else {
        currentChunk = next;
      }
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks.filter((c) => c.length > 50); // descartar chunks triviales
}

/**
 * Genera embedding para un texto vía Gemini API.
 */
async function embed(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values; // array de 768 floats
}

/**
 * Procesa un archivo .md: parsea frontmatter, chunkea, genera embeddings.
 */
async function processFile(filePath) {
  const raw = await readFile(filePath, "utf-8");
  const { data: frontmatter, content } = matter(raw);
  const chunks = chunkMarkdown(content);
  const relativePath = path.relative(path.resolve(process.cwd()), filePath).replace(/\\/g, "/");

  console.log(`📄 ${relativePath} → ${chunks.length} chunks`);

  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embed(chunk);
    rows.push({
      source_path: relativePath,
      section: frontmatter.section || "general",
      title: frontmatter.title || path.basename(filePath, ".md"),
      chunk_index: i,
      chunk_text: chunk,
      embedding: `[${embedding.join(",")}]`, // Postgres vector format
      source_url: `${BASE_REPO_URL}/${relativePath}`,
    });
  }
  return rows;
}

/**
 * Inserta filas en Supabase en batches.
 */
async function insertBatches(rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("crm_help_embeddings").insert(batch);
    if (error) {
      console.error(`ERROR insertando batch ${i}-${i + batch.length}:`, error);
      process.exit(1);
    }
    console.log(`  ✅ Insertado batch ${i}-${i + batch.length}/${rows.length}`);
  }
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main() {
  console.log("🚀 Regenerando embeddings de docs/help/...");
  const start = Date.now();

  // 1. Encontrar todos los .md
  const files = await findMarkdownFiles(DOCS_HELP_PATH);
  console.log(`📚 ${files.length} archivos markdown encontrados`);

  // 2. Borrar embeddings antiguos (regeneración completa)
  //    Alternativa más eficiente: solo borrar los afectados por el cambio.
  //    Para empezar, regeneración completa es más simple y robusta.
  console.log("🗑️  Borrando embeddings antiguos...");
  const { error: deleteError } = await supabase
    .from("crm_help_embeddings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
  if (deleteError) {
    console.error("ERROR borrando embeddings:", deleteError);
    process.exit(1);
  }

  // 3. Procesar cada fichero en secuencia (para no saturar rate limits Gemini)
  const allRows = [];
  for (const file of files) {
    const rows = await processFile(file);
    allRows.push(...rows);
  }

  // 4. Insertar en Supabase
  console.log(`💾 Insertando ${allRows.length} chunks en Supabase...`);
  await insertBatches(allRows);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✅ Terminado en ${elapsed}s. ${allRows.length} embeddings regenerados.`);
}

main().catch((err) => {
  console.error("💥 Error fatal:", err);
  process.exit(1);
});

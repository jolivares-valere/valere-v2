#!/usr/bin/env node

/**
 * generate-help-embeddings.mjs
 * Modelo: gemini-embedding-001 con outputDimensionality=768
 * SDK: @google/genai (mismo que la Edge Function)
 */

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const DOCS_HELP_PATH = path.resolve(process.cwd(), "docs/help");
const BASE_REPO_URL = "https://github.com/jolivares-valere/valere-v2/blob/main";
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;
const MAX_CHUNK_CHARS = 800;
const BATCH_SIZE = 20;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: faltan env vars");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function findMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await findMarkdownFiles(fullPath)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath);
  }
  return files;
}

function chunkMarkdown(content) {
  const lines = content.split("\n");
  const chunks = [];
  let currentHeader = "";
  let currentChunk = "";

  for (const line of lines) {
    if (/^###? /.test(line)) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentHeader = line;
      currentChunk = line + "\n";
    } else {
      const next = currentChunk + line + "\n";
      if (next.length > MAX_CHUNK_CHARS && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = currentHeader + "\n(cont.)\n" + line + "\n";
      } else currentChunk = next;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter((c) => c.length > 50);
}

async function embed(text) {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMS },
  });

  const values =
    result?.embeddings?.[0]?.values ??
    result?.embedding?.values ??
    null;

  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
    throw new Error(`Embedding inválido: length=${values?.length}, expected ${EMBEDDING_DIMS}`);
  }
  return values;
}

async function processFile(filePath) {
  const raw = await readFile(filePath, "utf-8");
  const { data: frontmatter, content } = matter(raw);
  const chunks = chunkMarkdown(content);
  const relativePath = path
    .relative(path.resolve(process.cwd()), filePath)
    .replace(/\\/g, "/");

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
      embedding: `[${embedding.join(",")}]`,
      source_url: `${BASE_REPO_URL}/${relativePath}`,
    });
  }
  return rows;
}

async function insertBatches(rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("crm_help_embeddings").insert(batch);
    if (error) {
      console.error(`ERROR batch ${i}-${i + batch.length}:`, error);
      process.exit(1);
    }
    console.log(`  ✅ Batch ${i + 1}-${i + batch.length}/${rows.length}`);
  }
}

async function main() {
  console.log(`🚀 Regenerando embeddings (${EMBEDDING_MODEL}, ${EMBEDDING_DIMS} dims)...`);
  const start = Date.now();

  const files = await findMarkdownFiles(DOCS_HELP_PATH);
  console.log(`📚 ${files.length} archivos markdown encontrados`);

  console.log("🗑  Borrando embeddings antiguos...");
  const { error: deleteError } = await supabase
    .from("crm_help_embeddings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.error("ERROR borrando:", deleteError);
    process.exit(1);
  }

  const allRows = [];
  for (const file of files) {
    const rows = await processFile(file);
    allRows.push(...rows);
  }

  console.log(`💾 Insertando ${allRows.length} chunks...`);
  await insertBatches(allRows);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✅ Terminado en ${elapsed}s. ${allRows.length} embeddings.`);
}

main().catch((err) => {
  console.error("💥 Error fatal:", err);
  process.exit(1);
});

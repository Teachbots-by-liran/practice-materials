// Where Word Quest keeps class data. Three interchangeable backends:
//  - Supabase, when its keys are set (production)
//  - a JSON file in .data/ (local development, no setup needed)
//  - memory (tests)
// Everything is stored as JSON rows in one table, grouped by collection.

import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Collection = "classes" | "groups" | "students" | "progress" | "assignments" | "flags" | "hidden";

export interface Row {
  id: string;
  classId?: string | null;
}

export interface Store {
  kind: "supabase" | "file" | "memory";
  get<T extends Row>(c: Collection, id: string): Promise<T | null>;
  list<T extends Row>(c: Collection, classId?: string): Promise<T[]>;
  put<T extends Row>(c: Collection, row: T): Promise<void>;
  remove(c: Collection, id: string): Promise<void>;
}

type Data = Partial<Record<Collection, Record<string, Row>>>;

export function memoryStore(initial: Data = {}): Store {
  const data: Data = structuredClone(initial);
  const table = (c: Collection) => (data[c] ??= {});
  return {
    kind: "memory",
    async get<T extends Row>(c: Collection, id: string) {
      const row = table(c)[id];
      return row ? (structuredClone(row) as T) : null;
    },
    async list<T extends Row>(c: Collection, classId?: string) {
      return Object.values(table(c))
        .filter((r) => classId === undefined || r.classId === classId)
        .map((r) => structuredClone(r) as T);
    },
    async put<T extends Row>(c: Collection, row: T) {
      table(c)[row.id] = structuredClone(row);
    },
    async remove(c: Collection, id: string) {
      delete table(c)[id];
    },
  };
}

function fileStore(file: string): Store {
  const read = (): Data => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  };
  const write = (d: Data) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(d, null, 1));
  };
  return {
    kind: "file",
    async get<T extends Row>(c: Collection, id: string) {
      return (read()[c]?.[id] ?? null) as T | null;
    },
    async list<T extends Row>(c: Collection, classId?: string) {
      return Object.values(read()[c] ?? {}).filter((r) => classId === undefined || r.classId === classId) as T[];
    },
    async put<T extends Row>(c: Collection, row: T) {
      const d = read();
      (d[c] ??= {})[row.id] = row;
      write(d);
    },
    async remove(c: Collection, id: string) {
      const d = read();
      delete d[c]?.[id];
      write(d);
    },
  };
}

const TABLE = "wq_rows";

function supabaseStore(db: SupabaseClient): Store {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`Supabase ${what} failed: ${error.message}`);
  };
  return {
    kind: "supabase",
    async get<T extends Row>(c: Collection, id: string) {
      const { data, error } = await db.from(TABLE).select("data").eq("collection", c).eq("id", id).maybeSingle();
      fail("read", error);
      return (data?.data ?? null) as T | null;
    },
    async list<T extends Row>(c: Collection, classId?: string) {
      let q = db.from(TABLE).select("data").eq("collection", c);
      if (classId !== undefined) q = q.eq("class_id", classId);
      const { data, error } = await q;
      fail("list", error);
      return (data ?? []).map((r) => r.data as T);
    },
    async put<T extends Row>(c: Collection, row: T) {
      const { error } = await db
        .from(TABLE)
        .upsert({ collection: c, id: row.id, class_id: row.classId ?? null, data: row, updated_at: new Date().toISOString() }, { onConflict: "collection,id" });
      fail("save", error);
    },
    async remove(c: Collection, id: string) {
      const { error } = await db.from(TABLE).delete().eq("collection", c).eq("id", id);
      fail("delete", error);
    },
  };
}

let cached: Store | null | undefined;

/** The configured store, or null when class features aren't set up (production without Supabase). */
export function getStore(): Store | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    cached = supabaseStore(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  } else if (process.env.NODE_ENV !== "production") {
    cached = fileStore(path.join(process.cwd(), ".data", "word-quest-dev.json"));
  } else {
    cached = null;
  }
  return cached;
}

/** For tests. */
export function setStore(s: Store | null): void {
  cached = s;
}

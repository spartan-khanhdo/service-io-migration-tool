/**
 * Parse PostgreSQL composite type values.
 *
 * Old PHP DB stores location/industry data as composite types:
 * - table_item_type: (id, name, slug)
 * - state_type: (id, name, slug, short)
 * - naics_type: (id, code, title)
 *
 * Format in DB: ("uuid-value","Name Value","slug-value")
 * Or with state: ("uuid-value","California","california","CA")
 */

export interface TableItem {
  id: string;
  name: string;
  slug: string;
}

export interface StateItem {
  id: string;
  name: string;
  slug: string;
  short: string;
}

export interface NaicsItem {
  id: string;
  code: string;
  title: string;
}

/**
 * Parse a PostgreSQL composite type string into an array of field values.
 * Handles quoted and unquoted fields, embedded commas within quotes.
 *
 * Input: `("val1","val 2",val3)` or `(val1,val2,val3)`
 * Output: `["val1", "val 2", "val3"]`
 */
function parseCompositeFields(raw: string): string[] {
  // Strip outer parentheses
  let inner = raw.trim();
  if (inner.startsWith("(") && inner.endsWith(")")) {
    inner = inner.slice(1, -1);
  }

  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < inner.length) {
    const char = inner[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < inner.length && inner[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ",") {
        fields.push(current);
        current = "";
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  fields.push(current);
  return fields;
}

export function parseTableItemType(raw: string | null | undefined): TableItem | null {
  if (!raw || raw === "(,,)" || raw === "" || raw === "null") return null;

  try {
    const fields = parseCompositeFields(raw);
    if (fields.length < 3) return null;

    const [id, name, slug] = fields;
    if (!id && !name) return null;

    return { id, name, slug };
  } catch {
    return null;
  }
}

export function parseStateType(raw: string | null | undefined): StateItem | null {
  if (!raw || raw === "(,,,)" || raw === "" || raw === "null") return null;

  try {
    const fields = parseCompositeFields(raw);
    if (fields.length < 4) return null;

    const [id, name, slug, short] = fields;
    if (!id && !name) return null;

    return { id, name, slug, short };
  } catch {
    return null;
  }
}

export function parseNaicsType(raw: string | null | undefined): NaicsItem | null {
  if (!raw || raw === "(,,)" || raw === "" || raw === "null") return null;

  try {
    const fields = parseCompositeFields(raw);
    if (fields.length < 3) return null;

    const [id, code, title] = fields;
    if (!id && !code) return null;

    return { id, code, title };
  } catch {
    return null;
  }
}

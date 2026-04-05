import { z } from "zod";

// --- Model factory ---

export const PROVIDERS = {
  openai: { label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini"] },
  google: { label: "Google Gemini", models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"] },
  mistral: { label: "Mistral", models: ["pixtral-large-latest", "mistral-large-latest"] },
  anthropic: { label: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"] },
};

export const DEFAULT_MODELS = {
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
  mistral: "pixtral-large-latest",
  anthropic: "claude-sonnet-4-20250514",
};

export async function getModel(provider, modelId, apiKey) {
  switch (provider) {
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      return createOpenAI({ apiKey })(modelId);
    }
    case "google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      return createGoogleGenerativeAI({ apiKey })(modelId);
    }
    case "mistral": {
      const { createMistral } = await import("@ai-sdk/mistral");
      return createMistral({ apiKey })(modelId);
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      return createAnthropic({ apiKey })(modelId);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// --- Zod extraction schema ---

export const extractionSchema = z.object({
  vendor: z.string().nullable().describe("Business or store name"),
  document_date: z.string().nullable().describe("Date on the document in YYYY-MM-DD format"),
  subtotal: z.number().nullable().describe("Amount before tax"),
  tax: z.number().nullable().describe("Total tax amount"),
  gst: z.number().nullable().describe("GST amount if applicable"),
  total: z.number().nullable().describe("Final total amount"),
  currency: z.string().default("INR").describe("Three-letter currency code"),
  document_type: z.enum(["receipt", "invoice", "bank_statement", "other"]).describe("Type of document"),
  line_items: z.array(z.object({
    name: z.string(),
    quantity: z.number().nullable(),
    unit_price: z.number().nullable(),
    total: z.number().nullable(),
  })).describe("Individual items/charges"),
  raw_text: z.string().describe("Complete text content of the document"),
});

// --- Default prompts ---

export const DEFAULT_PROMPTS = {
  extraction_system: {
    prompt_name: "Extraction System Prompt",
    prompt_text: `You are a precise document data extraction system. You analyze images of receipts, invoices, and bank statements in any language or currency. Extract structured data exactly as it appears on the document. For handwritten documents, do your best to interpret the text. Always preserve the original currency. Convert dates to ISO format (YYYY-MM-DD). If a field is not present or not readable, return null for that field.`,
    description: "The system prompt that sets the AI's role and behavior for document extraction.",
  },
  extraction_fields: {
    prompt_name: "Field Extraction Instructions",
    prompt_text: `Extract the following fields from this document:
- vendor: The business/store name
- document_date: The date on the document (format: YYYY-MM-DD)
- subtotal: Amount before tax
- tax: Total tax amount
- gst: GST amount if applicable (may be same as tax)
- total: Final total amount
- currency: Three-letter currency code (e.g., INR, USD, EUR)
- line_items: Array of items with {name, quantity, unit_price, total}
- raw_text: Complete text content of the document as you read it
- document_type: One of 'receipt', 'invoice', 'bank_statement', 'other'`,
    description: "Instructions telling the AI which fields to extract and their expected format.",
  },
  categorization: {
    prompt_name: "Auto-Categorization Prompt",
    prompt_text: `Based on the vendor name, line items, and document content below, classify this expense into exactly one of the following categories: {categories}

Vendor: {vendor}
Items: {line_items_summary}
Content: {raw_text_snippet}

Respond with only the category name, nothing else.`,
    description: "Prompt for auto-categorizing expenses. Use {categories}, {vendor}, {line_items_summary}, {raw_text_snippet} as placeholders.",
  },
  custom_field_base: {
    prompt_name: "Custom Field Extraction Base",
    prompt_text: `You are extracting a specific piece of information from a document. The document content is provided below. Follow the user's extraction instruction precisely. Respond with only the extracted value, nothing else. If the information is not present, respond with "N/A".

Document content:
{raw_text}

Extraction instruction:
{user_prompt}`,
    description: "Base prompt wrapper for custom field extraction. Uses {raw_text} and {user_prompt} placeholders.",
  },
};

/**
 * Ensure default prompts exist for a user. Inserts any missing prompt keys.
 */
export async function ensurePrompts(supabase, userId) {
  const { data: existing } = await supabase
    .from("doc_scanner_prompts")
    .select("prompt_key")
    .eq("user_id", userId);

  const existingKeys = new Set((existing || []).map((p) => p.prompt_key));
  const toInsert = [];

  for (const [key, val] of Object.entries(DEFAULT_PROMPTS)) {
    if (!existingKeys.has(key)) {
      toInsert.push({
        user_id: userId,
        prompt_key: key,
        prompt_name: val.prompt_name,
        prompt_text: val.prompt_text,
        description: val.description,
        is_default: true,
      });
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("doc_scanner_prompts").insert(toInsert);
  }
}

// --- Currencies ---

export const CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED", "JPY", "CNY",
  "CHF", "HKD", "NZD", "ZAR", "MYR", "THB", "IDR", "PHP", "KRW", "BRL",
];

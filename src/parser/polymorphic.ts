/**
 * Transform PHP Eloquent model_type values to Kotlin-style values.
 *
 * PHP stores: "App\Models\User", "App\Models\Business", etc.
 * Kotlin expects: "user", "business", etc.
 */

const MODEL_TYPE_MAP: Record<string, string> = {
  "App\\Models\\User": "user",
  "App\\Models\\Business": "business",
  "App\\Models\\Organization": "organization",
  "App\\Models\\Media": "media",
  "App\\Models\\BrokerProfile": "broker_profile",
  "App\\Models\\DocumentRequest": "document_request",
  "App\\Models\\BusinessPreQualification": "prequalification",
  "App\\Models\\PrequalificationLetter": "prequalification_letter",
  "App\\Models\\BusinessListingExtension": "business_listing_extension",
  "App\\Models\\UserOrganization": "user_organization",
  "App\\Models\\BusinessNote": "business_note",
  "App\\Models\\BusinessMessage": "business_message",
};

export function transformModelType(phpModelType: string): string {
  const mapped = MODEL_TYPE_MAP[phpModelType];
  if (mapped) return mapped;

  // Fallback: extract class name and convert to snake_case
  const className = phpModelType.split("\\").pop() || phpModelType;
  return className
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

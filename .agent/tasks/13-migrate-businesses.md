# Task 13: Migrate Businesses

## Phase
Phase 3 — Business & Related

## Priority
HIGHEST in Phase 3 — Many tables reference businesses

## Source
- **Old table**: `businesses` (PK: UUID)
- **Key old columns**: `id`, `headline`, `slug`, `short_summary`, `name`, `business_name`, `naics_code` (naics_type composite), `asking_price`, `down_payment`, `loan_amount`, `listing_price`, `address`, `has_dba`, `dba_name`, `status`, `pre_qualification_status`, `seller_id`, `broker_id`, `lender_id`, `source`, `slug`, `ytd_pnl_expiry_date`, `changed_values`, `cover_image`, `stamped_cover_image`, ...

## Target
- **New table**: `businesses` (PK: UUID)
- **Post Flyway 043**: Dropped `industry_id`, `state_code`, `state_id`, `county_id`, `city_id`, `city`, `country`, `hide_address`, `is_featured`, `view_count`, `inquiry_count`. Added `slug`, `ytd_pnl_expiry_date`, `changed_values`.

## Transformation Rules (Key Fields)
| Old Column | New Column | Rule |
|-----------|-----------|------|
| `id` | `id` | PRESERVE |
| `naics_code` (composite) | `naics_code` | Parse → extract `code` string |
| `address` | `address` | Direct copy |
| `has_dba` | `has_dba` | Direct copy |
| `slug` | `slug` | Direct copy (added in 043) |
| `ytd_pnl_expiry_date` | `ytd_pnl_expiry_date` | Direct copy (added in 043) |
| `changed_values` | `changed_values` | JSON → JSONB (added in 043) |
| `pre_qualification_status` | `pre_qualification_status` | Default `'draft'` if NULL (043 SET NOT NULL) |
| `cover_image` (JSON) | `cover_image` (JSONB) | JSON.stringify |
| `stamped_cover_image` (JSON) | `stamped_cover_image` (JSONB) | JSON.stringify |
| `reporting_year` | `reporting_year` | varchar → int |
| `location_state` (composite) | — | DROP (043 removed state_code, state_id) |
| `location_city` (composite) | — | DROP (043 removed city, city_id) |
| `location_county` (composite) | — | DROP (043 removed county_id) |
| `industry` (composite) | — | DROP (043 removed industry_id) |

## Notes
- **Flyway 043** aligned businesses with PHP — only `naics_code` composite still needs parsing
- No location composite parsing needed (columns dropped)
- `pre_qualification_status` must default to `'draft'` (NOT NULL after 043)

## File
`src/phases/phase-3/migrate-businesses.ts`

## Acceptance Criteria
- [ ] All businesses migrated with preserved UUIDs
- [ ] `slug`, `ytd_pnl_expiry_date`, `changed_values` preserved from old DB
- [ ] `pre_qualification_status` never NULL
- [ ] Financial decimal values preserved
- [ ] Soft-deleted businesses included

## Dependencies
- Task 00

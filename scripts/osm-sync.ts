/**
 * Daily sync design stub.
 *
 * Production implementation should:
 * 1. Read only shops that already have osm_id.
 * 2. Query Overpass in bounded batches with a descriptive User-Agent.
 * 3. Apply opening_hours directly only when no manual override exists.
 * 4. Put name/address/coordinate changes into osm_sync_changes.
 * 5. Never scan all Taipei every day.
 *
 * The network mutation is intentionally not enabled until a Supabase project,
 * admin identity and reviewed production shop list exist.
 */
console.log("OSM sync is intentionally disabled until production credentials and reviewed data are configured.");

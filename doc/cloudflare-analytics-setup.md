# Cloudflare Analytics Integration

Connect your Cloudflare account to view web analytics for your domains — page views, unique visitors, bandwidth, threats blocked, country/browser breakdowns, and HTTP status codes.

---

## Prerequisites

- A Cloudflare account with at least one active zone (domain)
- A Cloudflare API token with the correct permissions

---

## 1. Create a Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use the **"Read analytics and zones"** template, or create a custom token with:
   - **Zone : Analytics : Read**
   - **Zone : Zone : Read**
4. Set the zone scope (all zones or specific zones)
5. Click **Continue to summary** → **Create Token**
6. Copy the token — you'll paste it into the app

> **Note:** The token is stored securely in Supabase with row-level security. Only the authenticated user who saved it can access it.

---

## 2. Connect in the App

1. Navigate to **Cloudflare Analytics** in the sidebar (under Content & Social)
2. Paste your API token and click **Connect Cloudflare**
3. The app verifies the token and loads your domains
4. Select a domain from the dropdown
5. Choose a date range (24h, 7d, 14d, or 30d)
6. Analytics load automatically

---

## 3. Available Metrics

| Section | Metrics |
|---------|---------|
| **Overview** | Total requests, page views, unique visitors, threats blocked, bandwidth |
| **Traffic Trend** | Daily requests (bar chart), daily unique visitors (line chart) |
| **Countries** | Top 15 countries by request count with percentages |
| **Browsers** | Browser breakdown with donut chart (Chrome, Firefox, Safari, etc.) |
| **Status Codes** | HTTP response code distribution (2xx, 3xx, 4xx, 5xx) with progress bars |
| **HTTP Protocols** | Request count by protocol version (HTTP/1.1, HTTP/2, HTTP/3) |
| **Bandwidth** | Daily bandwidth served with trend line |
| **Threats** | Daily threat count (shown only when threats are detected) |
| **Page Views** | Daily page view trend |

---

## 4. Data Storage (Supabase)

Each analytics fetch is stored in the `cloudflare_analytics` table for historical tracking.

### Tables

**`cloudflare_tokens`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| api_token | text | Cloudflare API token |
| updated_at | timestamptz | Last updated |

**`cloudflare_analytics`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| zone_id | text | Cloudflare zone ID |
| zone_name | text | Domain name |
| date_range | text | e.g. "2026-03-11 to 2026-03-18" |
| totals | jsonb | Aggregated totals |
| daily_trend | jsonb | Per-day breakdown |
| countries | jsonb | Country breakdown |
| browsers | jsonb | Browser breakdown |
| status_codes | jsonb | HTTP status code breakdown |
| http_protocols | jsonb | Protocol version breakdown |
| fetched_at | timestamptz | When the data was fetched |

Both tables have **row-level security** enabled — users can only access their own data.

---

## 5. API Routes

### `POST /api/cloudflare/zones`

Verifies the API token and returns the user's Cloudflare zones.

**Request body:**
```json
{ "apiToken": "your-cloudflare-api-token" }
```

**Response:**
```json
{
  "zones": [
    { "id": "zone-id", "name": "example.com", "status": "active", "plan": "Free" }
  ]
}
```

### `POST /api/cloudflare/analytics`

Fetches analytics data for a specific zone and stores it in Supabase.

**Request body:**
```json
{
  "apiToken": "your-token",
  "zoneId": "zone-id",
  "zoneName": "example.com",
  "dateRange": "7"
}
```

**Response:** Full analytics object with totals, dailyTrend, countries, browsers, statusCodes, and httpProtocols.

---

## 6. Disconnect

Click the **Disconnect** button in the top-right of the analytics page. This removes the saved API token from Supabase. Previous analytics snapshots are retained for historical reference.

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid API token" | Ensure the token has Zone Analytics:Read and Zone:Read permissions |
| No zones listed | Check that the token scope includes the desired zones |
| Empty analytics | The zone may have no traffic in the selected date range, or the Cloudflare plan may limit API access |
| 403 error on analytics | Some GraphQL fields require a paid Cloudflare plan |

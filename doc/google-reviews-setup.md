# Google Reviews Integration

View and manage Google Business Profile reviews, and research any business's reviews via the Google Places API — all from one dashboard.

---

## Overview

The Reviews page has two tabs:

| Tab | Source | Capability |
|-----|--------|------------|
| **My Business Reviews** | Google Business Profile API | View all reviews, reply to reviews, track reply status |
| **Search Any Business** | Google Places API | Look up any business, see ratings & top 5 reviews |

---

## Tab 1: My Business Reviews

### Prerequisites

- A Google account that owns/manages a Google Business Profile
- Google OAuth connected in the app (with `business.manage` scope)

### Setup

1. Navigate to **Google Reviews** in the sidebar (under Content & Social)
2. Click the **My Business Reviews** tab
3. If not connected, click **Connect Google** — this opens Google OAuth
4. If you previously connected Google for Analytics, you may need to **reconnect** to grant the new Business Profile permission:
   - Go to **Settings** → **Disconnect Google** → reconnect via the Reviews page or Analytics page

### Usage

1. Click **Load Business Accounts**
2. Select your account from the dropdown
3. Select a location (auto-loads if you have only one)
4. Reviews load with:
   - **Rating overview** — average rating, total count, star visualization
   - **Star distribution** — breakdown of 5★ through 1★ with bar chart
   - **Reply status** — how many reviews have been replied to vs. pending
   - **Filter** — filter by star rating (All, 5★, 4★, 3★, 2★, 1★)
5. To **reply to a review**, click the "Reply" button under any unresponded review, type your response, and click "Send Reply"

### Google OAuth Scopes

The app requests these scopes:

| Scope | Purpose |
|-------|---------|
| `analytics.readonly` | Google Analytics data (existing) |
| `webmasters.readonly` | Search Console data (existing) |
| `business.manage` | Business Profile reviews + replies (new) |

---

## Tab 2: Search Any Business

### Prerequisites

- A Google Cloud project with the **Places API** enabled
- A Google Places API key

### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services
2. Enable the **Places API**
3. Go to Credentials → **Create Credentials** → **API Key**
4. Copy the API key
5. In the app, go to **Google Reviews** → **Search Any Business** tab
6. Paste the API key and click **Save**

> The API key is saved per-user in Supabase (`user_preferences` table). You only need to enter it once.

### Usage

1. Type a business name and location in the search bar (e.g., "Pizza Hut New York")
2. Select a business from the search results
3. View the business detail page:
   - **Business info** — name, address, phone, website, Google Maps link
   - **Rating overview** — average rating and total review count
   - **Star distribution** — breakdown chart
   - **Sentiment overview** — positive (4-5★), neutral (3★), negative (1-2★)
   - **Reviews** — up to 5 most relevant reviews with author, rating, text, and date
4. Use the star filter to narrow reviews
5. Click "← Back to search results" to search another business

### Limitations

The Google Places API returns a **maximum of 5 reviews** per place (the most relevant ones). This is a Google API limitation. For full review access to your own businesses, use the My Business Reviews tab.

---

## Data Storage (Supabase)

All fetched reviews are stored for historical tracking.

### Table: `google_reviews`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| location_id | text | Google location name or Place ID |
| source | text | `business_profile` or `places_api` |
| business_name | text | Business name (Places API) |
| average_rating | numeric(2,1) | Average star rating |
| total_reviews | integer | Total review count |
| reviews | jsonb | Array of review objects |
| fetched_at | timestamptz | When the data was fetched |

**Unique constraint:** `(user_id, location_id)` — upserts on each fetch so you always have the latest.

Row-level security is enabled — users can only access their own data.

### Places API Key Storage

The Google Places API key is stored in the `user_preferences` table under the `places_api_key` column. Users can remove it anytime via the "Remove Key" button.

---

## API Routes

### `POST /api/reviews/business`

Fetches Google Business Profile accounts, locations, or reviews depending on the parameters.

**List accounts:**
```json
{}
```
→ Returns `{ "accounts": [...] }`

**List locations:**
```json
{ "accountId": "accounts/123456" }
```
→ Returns `{ "locations": [...] }`

**Fetch reviews:**
```json
{ "accountId": "accounts/123456", "locationId": "accounts/123456/locations/789" }
```
→ Returns `{ "reviews": [...], "averageRating": 4.5, "totalReviewCount": 120 }`

### `POST /api/reviews/places`

Searches for businesses or fetches place details with reviews.

**Search businesses:**
```json
{ "apiKey": "AIza...", "query": "Pizza Hut New York" }
```
→ Returns `{ "places": [...] }`

**Fetch place details + reviews:**
```json
{ "apiKey": "AIza...", "placeId": "ChIJ..." }
```
→ Returns `{ "name": "...", "rating": 4.5, "reviews": [...], "starBreakdown": {...}, ... }`

### `POST /api/reviews/reply`

Replies to a Google Business Profile review. Requires Google OAuth.

```json
{
  "locationId": "accounts/123456/locations/789",
  "reviewId": "review-id-here",
  "comment": "Thank you for your feedback!"
}
```
→ Returns `{ "success": true, "reply": {...} }`

---

## Features

| Feature | My Business Reviews | Search Any Business |
|---------|:------------------:|:-------------------:|
| View reviews | All reviews | Top 5 reviews |
| Star rating & breakdown | Yes | Yes |
| Reply to reviews | Yes | No |
| Reply status tracking | Yes | No |
| Sentiment overview | Yes | Yes |
| Star rating filter | Yes | Yes |
| Business info (phone, website) | No | Yes |
| Google Maps link | No | Yes |
| Historical storage | Yes | Yes |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Missing Google Business Profile permission" | Disconnect Google in Settings, then reconnect to grant the new `business.manage` scope |
| No accounts listed | Ensure your Google account owns or manages a Business Profile |
| No locations listed | The selected account may not have any verified locations |
| Places API returns no reviews | Some businesses have no reviews, or the API may not return reviews for all places |
| "Places API error: REQUEST_DENIED" | Ensure the Places API is enabled in your Google Cloud project and the API key is valid |
| "Places API error: OVER_QUERY_LIMIT" | You've exceeded the API quota — check your Google Cloud billing/quota settings |

# Google MCP Servers Setup

This project includes three Google MCP servers configured in `.mcp.json` for use with Claude Code.

## Prerequisites

- **Node.js** 20+ (for gcloud MCP and GSC MCP)
- **pipx** (for Google Analytics MCP) — install with `pip install pipx`
- **gcloud CLI** (for gcloud MCP) — install from https://cloud.google.com/sdk/docs/install
- A **Google Cloud project** with the following APIs enabled

## 1. Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the following APIs via **APIs & Services > Library**:
   - **Google Search Console API**
   - **Google Analytics Data API**
   - **Google Analytics Admin API**

## 2. Create a Service Account

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Give it a descriptive name (e.g., `seo-tool-mcp`)
4. Click **Done** to create the account
5. Click on the new service account, go to the **Keys** tab
6. Click **Add Key > Create new key > JSON**
7. Save the downloaded JSON file securely (do NOT commit it to git)

## 3. Grant Access

### Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Go to **Settings > Users and permissions**
4. Add the service account email (e.g., `seo-tool-mcp@your-project.iam.gserviceaccount.com`) as a **Full** user

### Google Analytics 4
1. Go to [Google Analytics](https://analytics.google.com/)
2. Navigate to **Admin > Property > Property Access Management**
3. Add the service account email with **Viewer** role

## 4. Set Environment Variable

Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account JSON file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-credentials.json"
```

For persistent configuration, add this to your shell profile (`.bashrc`, `.zshrc`, etc.) or create a `.env.local` file:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-credentials.json
```

## 5. Install Google Analytics MCP

The Google Analytics MCP server is a Python package. Install it with pipx:

```bash
pipx install git+https://github.com/googleanalytics/google-analytics-mcp.git
```

## 6. Verify Setup

Once configured, restart Claude Code. The MCP servers will appear in the tools list. You can verify by asking Claude to:

- **GSC:** "Show me my top search queries from Google Search Console"
- **GA4:** "What are my top pages by pageviews in Google Analytics?"
- **gcloud:** "List my Google Cloud projects"

## MCP Servers Reference

| Server | Package | Purpose |
|--------|---------|---------|
| `gsc` | `mcp-server-gsc` | Google Search Console data (queries, clicks, impressions, CTR) |
| `google-analytics` | `analytics-mcp` | Google Analytics 4 data (reports, real-time, property info) |
| `gcloud` | `@google-cloud/gcloud-mcp` | Google Cloud CLI via natural language |

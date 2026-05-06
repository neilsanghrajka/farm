---
name: X
description: Use when building applications that interact with X (formerly Twitter) data. Reach for this skill when agents need to search posts, stream real-time data, manage user relationships, handle authentication, work with API fundamentals like rate limits and pagination, or integrate X data into applications.
metadata:
    mintlify-proj: x
    version: "1.0"
---

# X API Skill Reference

## Product summary

The X API is a REST and streaming API for accessing X's public data: posts, users, trends, spaces, direct messages, and more. Agents use it to search historical or recent posts, stream real-time data matching filter rules, look up user profiles, manage relationships (follows, likes, bookmarks), and build applications powered by X data.

**Key files and endpoints:**
- Base URL: `https://api.x.com/2`
- Authentication: Bearer Token (app-only), OAuth 1.0a (user context), OAuth 2.0, or Basic Auth (enterprise)
- Developer Console: https://console.x.com (manage apps, credentials, billing)
- Official SDKs: Python (`xdk`) and TypeScript (`@xdevplatform/xdk`)
- Primary docs: https://docs.x.com/x-api/introduction

## When to use

Reach for this skill when:
- **Searching posts** — Find posts by keyword, hashtag, user, engagement metrics, or date range (recent 7 days or full archive)
- **Streaming real-time data** — Set up filtered stream rules to receive matching posts as they're published
- **Looking up users or posts** — Retrieve user profiles, post details, or relationships by ID or username
- **Managing user actions** — Create/delete posts, like, repost, bookmark, follow, mute, or block
- **Handling authentication** — Choose the right auth method (Bearer Token for app-only, OAuth for user context)
- **Understanding API fundamentals** — Rate limits, pagination, fields, expansions, error handling
- **Building with SDKs** — Use Python or TypeScript SDKs to avoid manual authentication and pagination
- **Monitoring usage and costs** — Track API calls and credits in the Developer Console

## Quick reference

### Authentication methods

| Method | Use case | Credentials |
|:-------|:---------|:------------|
| **Bearer Token** | App-only, public data | API Key + API Secret → Bearer Token |
| **OAuth 1.0a** | User context, private data | API Key, Secret, Access Token, Token Secret |
| **OAuth 2.0** | User context with PKCE | Client ID, Client Secret, Authorization Code |
| **Basic Auth** | Enterprise APIs only | Email + Password (HTTP Basic header) |

Get credentials from Developer Console → Your App → Keys and Tokens.

### Common endpoints

| Task | Endpoint | Method |
|:-----|:---------|:-------|
| Search recent posts | `/2/tweets/search/recent` | GET |
| Search full archive | `/2/tweets/search/all` | GET |
| Get post by ID | `/2/tweets/{id}` | GET |
| Create post | `/2/tweets` | POST |
| Delete post | `/2/tweets/{id}` | DELETE |
| Get user by username | `/2/users/by/username/{username}` | GET |
| Get user by ID | `/2/users/{id}` | GET |
| Follow user | `/2/users/{id}/following` | POST |
| Get followers | `/2/users/{id}/followers` | GET |
| Filtered stream rules | `/2/tweets/search/stream/rules` | GET/POST |
| Connect to stream | `/2/tweets/search/stream` | GET |

### Field and expansion parameters

**Fields** — Request additional data for each object type:
```bash
?tweet.fields=created_at,public_metrics,lang
?user.fields=description,public_metrics,verified
?media.fields=url,alt_text,type
```

**Expansions** — Include related objects (author, media, referenced posts):
```bash
?expansions=author_id,attachments.media_keys,referenced_tweets.id
```

Combine both to get full context in one request.

### Rate limit headers

Every response includes:
```
x-rate-limit-limit: 900
x-rate-limit-remaining: 847
x-rate-limit-reset: 1705420800
```

Check `x-rate-limit-remaining` before making requests. When you hit a limit (429), wait until `x-rate-limit-reset` (Unix timestamp).

### Pagination

Use `pagination_token` from response to fetch next page:
```bash
?max_results=100&pagination_token=NEXT_TOKEN
```

SDKs handle pagination automatically with iterators.

## Decision guidance

### When to use Bearer Token vs OAuth

| Scenario | Use Bearer Token | Use OAuth 1.0a/2.0 |
|:---------|:-----------------|:-------------------|
| Access public data only | ✓ | — |
| Access user's private posts/bookmarks | — | ✓ |
| Post on behalf of user | — | ✓ |
| Build a web app with login | — | ✓ (OAuth 2.0) |
| Desktop/CLI tool | ✓ | ✓ (OAuth 1.0a) |
| Server-to-server automation | ✓ | — |

### When to use search vs filtered stream

| Need | Use search | Use filtered stream |
|:-----|:-----------|:-------------------|
| Historical data (past 7 days or archive) | ✓ | — |
| Real-time matching posts | — | ✓ |
| One-time lookup | ✓ | — |
| Continuous monitoring | — | ✓ |
| Complex queries | ✓ | ✓ |
| Persistent connection acceptable | — | ✓ |

### When to use fields vs expansions

| Goal | Use fields | Use expansions |
|:-----|:-----------|:----------------|
| Get more data on primary object | ✓ | — |
| Include related objects (author, media) | — | ✓ |
| Reduce API calls | — | ✓ |
| Get specific metrics (likes, reposts) | ✓ | — |

## Workflow

### 1. Set up authentication

1. Go to https://console.x.com and sign in with X account
2. Create a new App (or use existing)
3. Navigate to Keys and Tokens tab
4. Copy Bearer Token (for app-only) or API Key/Secret (for OAuth)
5. Store securely in environment variable: `export BEARER_TOKEN="your_token"`

### 2. Make your first request

```bash
curl "https://api.x.com/2/users/by/username/xdevelopers" \
  -H "Authorization: Bearer $BEARER_TOKEN"
```

Expected response:
```json
{
  "data": {
    "id": "2244994945",
    "name": "X Developers",
    "username": "xdevelopers"
  }
}
```

### 3. Request additional fields

Add field parameters to get more data:
```bash
curl "https://api.x.com/2/users/by/username/xdevelopers?user.fields=created_at,description,public_metrics" \
  -H "Authorization: Bearer $BEARER_TOKEN"
```

### 4. Include related objects with expansions

Combine expansions and fields to get full context:
```bash
curl "https://api.x.com/2/tweets/1234567890?expansions=author_id&user.fields=username,name" \
  -H "Authorization: Bearer $BEARER_TOKEN"
```

Response includes both the post and author in `includes.users`.

### 5. Handle pagination

For endpoints returning multiple results:
```bash
curl "https://api.x.com/2/tweets/search/recent?query=api&max_results=10&pagination_token=NEXT_TOKEN" \
  -H "Authorization: Bearer $BEARER_TOKEN"
```

### 6. Check rate limits

Before making requests, check remaining quota:
```bash
# After any request, check headers
x-rate-limit-remaining: 847
```

If approaching zero, wait until `x-rate-limit-reset` before retrying.

### 7. Use SDKs for production

Instead of manual cURL, use official SDKs:

**Python:**
```python
from xdk import Client

client = Client(bearer_token="YOUR_TOKEN")
user = client.users.get_by_username("xdevelopers")
print(user.data.username)
```

**TypeScript:**
```typescript
import { Client } from '@xdevplatform/xdk';

const client = new Client({ bearerToken: 'YOUR_TOKEN' });
const user = await client.users.getByUsername('xdevelopers');
console.log(user.data?.username);
```

## Common gotchas

- **Bearer Token not working for user context** — Bearer Token only accesses public data. For private posts, bookmarks, or actions on behalf of a user, use OAuth 1.0a or OAuth 2.0.

- **Missing fields in response** — By default, endpoints return minimal fields (e.g., post returns only `id`, `text`, `edit_history_tweet_ids`). Always add `tweet.fields`, `user.fields`, etc. to get additional data.

- **Forgetting expansions** — If you request `author_id` but don't add `expansions=author_id`, the author object won't be included. Expansions are required to fetch related objects.

- **Rate limit surprises** — Each endpoint has its own rate limit. Check the endpoint's documentation for the specific limit (e.g., 450/15min vs 900/15min). Monitor `x-rate-limit-remaining` header.

- **429 errors without waiting** — When you hit a rate limit, the response includes `x-rate-limit-reset` (Unix timestamp). Don't retry immediately; wait until that time.

- **Streaming connection drops** — Filtered stream sends keep-alive signals (blank lines) every 20 seconds. If you don't receive data or keep-alive for 20 seconds, reconnect. Implement exponential backoff.

- **Search query syntax errors** — Search operators are case-sensitive and require proper escaping. Use quotes for phrases: `"machine learning"` not `machine learning`. Test queries in the API reference first.

- **Partial errors in batch requests** — When looking up multiple posts/users, some may fail while others succeed. Check the `errors` array even in 200 responses.

- **Protected accounts** — Posts from protected accounts are only visible if you're authorized. Unauthenticated requests won't see them.

- **Deleted posts return 404** — Don't assume a post exists just because you have its ID. Always handle 404 responses.

- **Credentials in code** — Never hardcode API keys or tokens. Use environment variables or secure vaults. If exposed, regenerate immediately in the Developer Console.

## Verification checklist

Before submitting work with the X API:

- [ ] **Authentication working** — Test a simple request (e.g., user lookup) and confirm 200 response
- [ ] **Credentials stored securely** — Using environment variables, not hardcoded
- [ ] **Fields requested** — Added appropriate `tweet.fields`, `user.fields`, etc. for needed data
- [ ] **Expansions included** — If fetching related objects, added `expansions` parameter
- [ ] **Rate limits handled** — Code checks `x-rate-limit-remaining` and implements backoff for 429 errors
- [ ] **Pagination implemented** — For endpoints returning multiple results, handling `pagination_token`
- [ ] **Error handling in place** — Checking HTTP status codes and parsing error responses
- [ ] **Streaming reconnection logic** — If using filtered stream, implementing reconnect with backoff
- [ ] **Tested with real data** — Not just mocked responses; verified against actual API
- [ ] **Usage monitored** — Checked Developer Console for API usage and costs

## Resources

**Comprehensive navigation:** https://docs.x.com/llms.txt

**Critical documentation pages:**
1. [X API Introduction](https://docs.x.com/x-api/introduction) — Overview of all endpoints and features
2. [Make Your First Request](https://docs.x.com/make-your-first-request) — Quickstart with cURL examples
3. [Authentication Overview](https://docs.x.com/fundamentals/authentication/overview) — All auth methods explained
4. [Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits) — Per-endpoint limits and headers
5. [Fields & Expansions](https://docs.x.com/x-api/fundamentals/fields) — Customize response data
6. [Search Posts](https://docs.x.com/x-api/posts/search/introduction) — Recent and full-archive search
7. [Filtered Stream](https://docs.x.com/x-api/posts/filtered-stream/introduction) — Real-time streaming
8. [Response Codes & Errors](https://docs.x.com/x-api/fundamentals/response-codes-and-errors) — Error handling
9. [Official SDKs](https://docs.x.com/tools-and-libraries) — Python and TypeScript libraries
10. [Developer Console](https://console.x.com) — Manage apps and credentials

---

> For additional documentation and navigation, see: https://docs.x.com/llms.txt
# Generated API

> Version 1.0.0

## Endpoints

| Method | Path | Summary |
|--------|------|---------|
| `GET` | `/products` | List products |
| `GET` | `/users` | List all users |
| `POST` | `/users` | Create user |
| `GET` | `/users/{id}` | Get user by ID |
| `PUT` | `/users/{id}` | Update user |
| `DELETE` | `/users/{id}` | Delete user |

---

### GET `/products`

List products

#### Parameters

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `category` | query | No | string | Filter by product category |
| `minPrice` | query | No | number | Filter by minimum product price |
| `page` | query | No | number | Filter by page number |

#### Responses

| Status | Description |
|--------|-------------|
| 200 | Products listing |

---

### GET `/users`

List all users

#### Responses

| Status | Description |
|--------|-------------|
| 200 | List of users |

---

### POST `/users`

Create user

#### Request Body

**Content-Type:** `application/json`

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "email": {
      "type": "string"
    }
  }
}
```

#### Responses

| Status | Description |
|--------|-------------|
| 200 | OK |

---

### GET `/users/{id}`

Get user by ID

#### Parameters

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `id` | path | Yes | integer | id parameter |

#### Responses

| Status | Description |
|--------|-------------|
| 200 | User object |
| 404 | User not found |

---

### PUT `/users/{id}`

Update user

#### Parameters

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `id` | path | Yes | string | id parameter |

#### Responses

| Status | Description |
|--------|-------------|
| 200 | Updated user |
| 400 | Bad request |
| 404 | Not found |

---

### DELETE `/users/{id}`

Delete user

#### Parameters

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `id` | path | Yes | string | id parameter |

#### Responses

| Status | Description |
|--------|-------------|
| 204 | User deleted |
| 400 | Bad request |
| 404 | Not found |

# Payment Plan Types Explanation

## Overview

The payment plan system supports two distinct types of plans with different characteristics and purposes:

## 1. Business Plans (Lifetime Plans)

**Purpose**: Permanent business subscriptions that provide ongoing access to business features.

**Characteristics**:
- **Duration**: Lifetime (No expiration date)
- **Billing**: One-time payment
- **Features**: Must include business features (query, review, embeded)
- **Validity**: Not applicable (lifetime access)
- **Boost Limits**: Can include daily boost usage limits (maxBoostPerDay)

**Use Case**: When a business wants permanent access to business features like customer queries, review management, and embedded functionality.

**Example**:
```json
{
  "name": "Premium Business Plan",
  "planType": "business",
  "price": 299.99,
  "features": ["query", "review", "embeded"],
  "maxBoostPerDay": 5,
  "planDuration": "Lifetime (No expiration)",
  "planCategory": "Business Subscription"
}
```

## 2. Boost Plans (Temporary Plans)

**Purpose**: Temporary visibility boosts that provide enhanced exposure for a limited time.

**Characteristics**:
- **Duration**: Temporary (1-168 hours, maximum 7 days)
- **Billing**: One-time payment
- **Features**: No business features allowed
- **Validity**: Required (1-168 hours)
- **Boost Limits**: Not applicable (boost plans are the boost themselves)

**Use Case**: When a business wants temporary increased visibility or promotion for a specific period.

**Example**:
```json
{
  "name": "24-Hour Boost",
  "planType": "boost",
  "price": 19.99,
  "validityHours": 24,
  "planDuration": "24 hours",
  "planCategory": "Temporary Boost"
}
```

## Key Differences

| Aspect | Business Plans | Boost Plans |
|--------|----------------|-------------|
| **Duration** | Lifetime (No expiration) | Temporary (1-168 hours) |
| **Features** | Required (query, review, embeded) | Not allowed |
| **Validity Hours** | Not applicable | Required (1-168) |
| **Boost Limits** | Daily usage limits (maxBoostPerDay) | Not applicable |
| **Purpose** | Permanent business access | Temporary visibility boost |
| **Billing Model** | One-time payment | One-time payment |

## Validation Rules

### Business Plan Constraints
- ✅ Must have at least one business feature
- ✅ Cannot have validity hours
- ✅ Can have daily boost usage limits (maxBoostPerDay)
- ✅ Must be one-time payment

### Boost Plan Constraints
- ✅ Must have validity hours (1-168)
- ✅ Cannot have business features
- ✅ Cannot have daily boost limits (they are the boost themselves)
- ✅ Must be one-time payment

## API Endpoints

### Get All Plans
- `GET /api/admin/payment-plans` - Returns all plans with type-specific information
- `GET /api/admin/payment-plans/business` - Returns only business plans (lifetime)
- `GET /api/admin/payment-plans/boost` - Returns only boost plans (temporary)

### Plan Details
- `GET /api/admin/payment-plans/:id` - Basic plan information
- `GET /api/admin/payment-plans/:id/details` - Detailed plan information with type-specific details

## Implementation Notes

1. **Database Schema**: The `validityHours` field is only populated for boost plans
2. **Stripe Integration**: Both plan types use one-time payment pricing
3. **Frontend Display**: Plans are clearly labeled as "Lifetime" or "Temporary"
4. **Validation**: Joi validators enforce plan type constraints at the API level

## Business Logic

- **Business plans** provide permanent access to business features
- **Boost plans** provide temporary visibility enhancement
- Both plan types are one-time purchases (no recurring billing)
- Plan types cannot be mixed or converted between each other
- Each plan type serves a distinct business purpose

# Dashboard Statistics API Documentation

## Overview
The Dashboard API provides comprehensive statistics for the admin dashboard, including user counts, business metrics, subscription data, earnings, and month-over-month comparisons.

## Base URL
```
/api/admin/dashboard
```

## Authentication
All endpoints require admin authentication using the `authorizedAccessAdmin` middleware.

## Endpoints

### 1. Get Comprehensive Dashboard Statistics
**GET** `/api/admin/dashboard/stats`

Returns detailed dashboard statistics including overview metrics, current month data, previous month data, month-over-month changes, recent activity, and breakdowns.

#### Response Format
```json
{
  "success": true,
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "overview": {
      "totalUsers": 1250,
      "totalBusinesses": 89,
      "totalPaidSubscriptions": 67,
      "activeBoosts": 12,
      "totalEarnings": 15420.50
    },
    "currentMonth": {
      "users": 45,
      "businesses": 8,
      "subscriptions": 12,
      "boosts": 3,
      "earnings": 2340.75
    },
    "previousMonth": {
      "users": 38,
      "businesses": 6,
      "subscriptions": 9,
      "boosts": 2,
      "earnings": 1890.25
    },
    "monthOverMonth": {
      "users": {
        "change": 18.42,
        "trend": "increase"
      },
      "businesses": {
        "change": 33.33,
        "trend": "increase"
      },
      "subscriptions": {
        "change": 33.33,
        "trend": "increase"
      },
      "boosts": {
        "change": 50.0,
        "trend": "increase"
      },
      "earnings": {
        "change": 23.81,
        "trend": "increase"
      }
    },
    "recentActivity": {
      "last7Days": {
        "users": 12,
        "businesses": 3,
        "payments": 8
      }
    },
    "breakdowns": {
      "subscriptionStatus": [
        { "_id": "active", "count": 67 },
        { "_id": "inactive", "count": 12 },
        { "_id": "canceled", "count": 5 }
      ],
      "paymentStatus": [
        { "_id": "completed", "count": 89 },
        { "_id": "pending", "count": 3 },
        { "_id": "failed", "count": 1 }
      ]
    },
    "monthlyTrends": [
      {
        "month": "2024-01",
        "earnings": 1890.25,
        "transactions": 15
      },
      {
        "month": "2024-02",
        "earnings": 2340.75,
        "transactions": 18
      }
    ]
  }
}
```

#### Data Fields Explanation

**Overview Section:**
- `totalUsers`: Total active users in the system
- `totalBusinesses`: Total active businesses
- `totalPaidSubscriptions`: Total active business subscriptions
- `activeBoosts`: Currently active boost subscriptions
- `totalEarnings`: Total earnings from all completed payments

**Current Month Section:**
- Current month counts for all metrics (users, businesses, subscriptions, boosts, earnings)

**Previous Month Section:**
- Previous month counts for comparison

**Month-over-Month Section:**
- `change`: Percentage change from previous month
- `trend`: "increase" or "decrease"

**Recent Activity Section:**
- Last 7 days activity counts

**Breakdowns Section:**
- Subscription status distribution
- Payment status distribution

**Monthly Trends Section:**
- Last 6 months of earnings and transaction counts

---

### 2. Get Quick Statistics
**GET** `/api/admin/dashboard/quick-stats`

Returns simplified statistics for quick overview without detailed breakdowns.

#### Response Format
```json
{
  "success": true,
  "message": "Quick statistics fetched successfully",
  "data": {
    "totalUsers": 1250,
    "totalBusinesses": 89,
    "totalPaidSubscriptions": 67,
    "activeBoosts": 12,
    "totalEarnings": 15420.50,
    "currentMonthEarnings": 2340.75
  }
}
```

## Data Sources

### Models Used
- **User**: For user counts and registration statistics
- **Business**: For business counts and registration statistics  
- **Subscription**: For subscription and boost statistics
- **Payment**: For earnings and payment statistics

### Status Filters
- **Users**: `status: 'active'` (from GLOBAL_ENUMS.userStatus)
- **Businesses**: `status: 'active'` (from business model enum)
- **Subscriptions**: `status: 'active'`
- **Payments**: `status: 'completed'`

### Date Calculations
- **Current Month**: From 1st day of current month to now
- **Previous Month**: From 1st day of previous month to last day of previous month
- **Recent Activity**: Last 7 days from current date
- **Monthly Trends**: Last 6 months from current date

## Performance Considerations

### Database Queries
- Uses `Promise.all()` for concurrent database operations
- Implements proper indexing on status and createdAt fields
- Aggregation pipelines for complex calculations

### Caching Recommendations
- Consider implementing Redis caching for dashboard stats
- Cache results for 5-15 minutes depending on update frequency
- Implement cache invalidation on data changes

## Error Handling

### Common Error Codes
- `00500`: Internal server error
- `00401`: Unauthorized (admin authentication required)
- `00404`: Resource not found

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Usage Examples

### Frontend Dashboard Integration
```javascript
// Fetch comprehensive stats
const response = await fetch('/api/admin/dashboard/stats', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});

const stats = await response.json();

// Display overview metrics
document.getElementById('totalUsers').textContent = stats.data.overview.totalUsers;
document.getElementById('totalEarnings').textContent = `$${stats.data.overview.totalEarnings}`;

// Show month-over-month trends
const userTrend = stats.data.monthOverMonth.users;
const trendIcon = userTrend.trend === 'increase' ? '↗️' : '↘️';
document.getElementById('userTrend').innerHTML = `${trendIcon} ${userTrend.change.toFixed(1)}%`;
```

### Real-time Updates
```javascript
// Refresh stats every 5 minutes
setInterval(async () => {
  const stats = await fetchDashboardStats();
  updateDashboardUI(stats);
}, 5 * 60 * 1000);
```

## Security Considerations

### Authentication
- All endpoints require valid admin JWT token
- Token validation through `authorizedAccessAdmin` middleware
- No sensitive data exposure to unauthorized users

### Data Access
- Only aggregate statistics are returned
- No individual user or business details exposed
- Financial data limited to totals and trends

## Monitoring and Analytics

### Recommended Metrics to Track
- API response times
- Database query performance
- Cache hit/miss ratios
- Error rates by endpoint

### Logging
- All dashboard requests are logged
- Error logging with stack traces
- Performance metrics logging

## Future Enhancements

### Potential Features
- Custom date range filtering
- Export functionality (CSV/PDF)
- Real-time WebSocket updates
- Advanced analytics and forecasting
- Custom dashboard widgets
- Role-based access to specific metrics

### Performance Improvements
- Database query optimization
- Advanced caching strategies
- Background job processing for heavy calculations
- Data warehouse integration for historical analysis

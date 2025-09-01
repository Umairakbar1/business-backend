# Subscription and Boost Plan Logic Documentation

## Overview

This document explains the updated subscription and boost plan logic that handles pending subscriptions, queue management, and automatic activation.

## Key Changes

### 1. Subscription Status Management

#### Business Plans
- **Pending Status**: When a business subscribes to a plan, the subscription is created with `status: 'pending'`
- **Active Status**: After payment confirmation, the status changes to `active`
- **Duplicate Prevention**: If a business already has a pending subscription of the same type, the existing subscription is updated instead of creating a new one

#### Boost Plans
- **Pending Status**: Boost subscriptions start with `status: 'pending'`
- **Active Status**: After payment confirmation, status becomes `active`
- **Queue Management**: Boost plans are managed through a queue system per category
- **Same Category Prevention**: Only one pending boost subscription per business per category

### 2. Boost Queue Logic

#### Queue Structure
- Each business category has its own boost queue
- Only one business can be boosted per category at a time
- Businesses in queue have estimated start and end times

#### Queue States
- **Pending**: Business is waiting in queue
- **Active**: Business is currently boosted
- **Expired**: Boost has ended
- **Cancelled**: Business cancelled their boost

#### Automatic Activation
- When a boost expires, the next business in queue is automatically activated
- Business boost status (`isBoosted`, `isBoostActive`) is updated accordingly
- Subscription status and queue information are synchronized

### 3. Business Status Management

#### Boost Status Fields
- `isBoosted`: Whether the business has an active boost subscription
- `isBoostActive`: Whether the boost is currently active (not in queue)
- `boostExpiryAt`: When the current boost expires
- `boostSubscriptionId`: Reference to the active boost subscription

#### Status Logic
- **In Queue**: `isBoosted = false`, `isBoostActive = false`
- **Currently Active**: `isBoosted = true`, `isBoostActive = true`
- **No Boost**: All boost fields are null/false

## API Endpoints

### Subscription Management

#### Subscribe to Plan
```
POST /api/business/subscriptions/:businessId/subscribe
```
- Creates or updates pending subscription
- Prevents duplicate pending subscriptions
- Returns payment intent for completion

#### Subscribe to Boost Plan
```
POST /api/business/subscriptions/:businessId/boost/subscribe
```
- Creates or updates pending boost subscription
- Handles queue placement
- Prevents duplicate pending boost subscriptions per category

#### Confirm Payment
```
POST /api/business/subscriptions/:businessId/confirm-payment
```
- Activates subscription after payment
- Updates business boost status based on queue position
- Handles immediate activation or queue placement

### Queue Management

#### Get Queue Status
```
GET /api/business/subscriptions/:businessId/boost/queue-status
```
- Returns current queue position and status
- Shows estimated start/end times
- Indicates if boost is currently active

#### Cancel Boost Subscription
```
PATCH /api/business/subscriptions/:businessId/boost/cancel
```
- Removes business from queue
- Processes refunds based on usage
- Updates business status
- Activates next business if currently active

#### Boost Queue Management (Cron)
```
POST /api/business/subscriptions/boost-queue-management
```
- Handles automatic queue management
- Expires completed boosts
- Activates next businesses in queue
- Updates all related statuses

## Cron Job Setup

### Running the Cron Job
```bash
npm run boost-cron
```

### Cron Schedule
- Runs every 5 minutes
- Checks for expired boosts
- Activates next businesses in queue
- Updates subscription and business statuses

### Environment Variables
```env
API_BASE_URL=http://localhost:5000
```

## Business Logic Flow

### 1. Subscription Creation
```
Business subscribes → Check existing pending → Update or create new → Set status pending
```

### 2. Payment Confirmation
```
Payment confirmed → Set status active → Check queue position → Update business status
```

### 3. Queue Management
```
Boost expires → Activate next business → Update statuses → Continue queue
```

### 4. Cancellation
```
Business cancels → Remove from queue → Process refund → Update statuses
```

## Database Schema Updates

### Subscription Model
- `status`: Now includes 'pending' state
- `boostQueueInfo`: Queue management information
- `metadata`: Additional tracking information

### Business Model
- `isBoosted`: Boolean flag for boost status
- `isBoostActive`: Boolean flag for active boost
- `boostExpiryAt`: Boost expiration timestamp
- `boostSubscriptionId`: Reference to boost subscription

### BoostQueue Model
- `queue`: Array of queued businesses
- `currentlyActive`: Currently boosted business
- Methods for queue management

## Error Handling

### Common Scenarios
1. **Duplicate Pending Subscription**: Update existing instead of creating new
2. **Queue Full**: Return appropriate error message
3. **Payment Failure**: Keep subscription in pending state
4. **Queue Position Change**: Update estimated times

### Validation
- Business ownership verification
- Category requirement for boost plans
- Payment plan availability
- Queue position validation

## Testing Scenarios

### Business Plan Subscription
1. Create pending subscription
2. Confirm payment → Active status
3. Try duplicate subscription → Update existing

### Boost Plan Subscription
1. Create pending boost subscription
2. Place in queue or activate immediately
3. Confirm payment → Update queue status
4. Cancel subscription → Remove from queue

### Queue Management
1. Multiple businesses subscribe to same category
2. First business gets immediate activation
3. Others wait in queue
4. Automatic activation when boost expires

## Monitoring and Logging

### Key Metrics
- Queue length per category
- Average wait time
- Activation success rate
- Cancellation rate

### Logging
- Queue position changes
- Boost activations/expirations
- Payment confirmations
- Error scenarios

## Future Enhancements

### Potential Improvements
1. **Priority Queue**: Premium boost plans get priority
2. **Flexible Scheduling**: Allow businesses to choose boost times
3. **Queue Notifications**: Notify businesses of position changes
4. **Analytics Dashboard**: Queue performance metrics
5. **Auto-scaling**: Dynamic queue management based on demand

### Configuration Options
- Queue check frequency
- Boost duration flexibility
- Category-specific rules
- Payment plan restrictions

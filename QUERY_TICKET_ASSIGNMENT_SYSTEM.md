# Query Ticket Assignment and Status Management System

## Overview

This document describes the updated query ticket system that implements automatic assignment logic and status management permissions for both admin and business users.

## Assignment Logic

### Assignment Types

The system now supports two assignment types with **automatic ID assignment**:

1. **`assignedToType = "1"`** - Assign to business
   - **Automatically assigns to the business specified in `businessId`**
   - No need to provide `assignedTo` field
   - Backend automatically sets `assignedTo` to the ticket's `businessId`

2. **`assignedToType = "2"`** - Assign to me (current user)
   - **Automatically assigns to the user creating/updating the ticket**
   - No need to provide `assignedTo` field
   - Backend automatically sets `assignedTo` to the current user's ID

### Frontend Usage

**You only need to send `assignedToType` - the backend handles the rest!**

```javascript
// Example: Assign to business (type 1)
{
  "assignedToType": "1"
  // Backend automatically sets assignedTo = businessId
}

// Example: Assign to me (type 2)
{
  "assignedToType": "2"
  // Backend automatically sets assignedTo = currentUserId
}
```

### Business User Assignment

```javascript
// Example: Assign to business
POST /api/business/query-tickets
{
  "title": "Payment Issue",
  "businessId": "business_123",
  "description": "Payment gateway not working",
  "assignedToType": "1"  // Auto-assigns to business_123
}

// Example: Assign to me
POST /api/business/query-tickets
{
  "title": "Payment Issue",
  "businessId": "business_123",
  "description": "Payment gateway not working",
  "assignedToType": "2"  // Auto-assigns to current business owner
}
```

### Admin User Assignment

```javascript
// Example: Assign to business
POST /api/admin/query-tickets
{
  "title": "Compliance Review",
  "businessId": "business_123",
  "description": "Annual compliance review required",
  "assignedToType": "1"  // Auto-assigns to business_123
}

// Example: Assign to me
POST /api/admin/query-tickets
{
  "title": "System Maintenance",
  "businessId": "business_123",
  "description": "Need to perform maintenance",
  "assignedToType": "2"  // Auto-assigns to current admin
}
```

## Status Management Permissions

### Status Values

- `pending` - Initial status when ticket is created
- `in_progress` - Work has begun on the ticket
- `completed` - Ticket is finished
- `not_completed` - Ticket cannot be completed

### Permission Rules

#### 1. Ticket Creator (Admin or Business)
- **Can change status to any value**
- **Can delete the ticket**
- **Can close the ticket**
- **Full control over the ticket**

#### 2. Ticket Assignee
- **Can change status to `in_progress` and `completed`**
- **Cannot change status to `pending` or `not_completed`**
- **Cannot delete or close the ticket**

#### 3. Other Users
- **Cannot change status**
- **Cannot delete or close the ticket**
- **Read-only access**

### Status Change Examples

```javascript
// Assignee trying to change status to in_progress (ALLOWED)
PUT /api/query-tickets/:id/status
{
  "status": "in_progress"
}

// Assignee trying to change status to pending (DENIED)
PUT /api/query-tickets/:id/status
{
  "status": "pending"
}
// Response: "As an assignee, you can only change status to in_progress or completed"

// Creator changing status to any value (ALLOWED)
PUT /api/query-tickets/:id/status
{
  "status": "not_completed"
}
```

## API Endpoints

### Business Endpoints

#### Create Ticket
```
POST /api/business/query-tickets
Body: {
  "title": "Ticket Title",
  "businessId": "business_id",
  "description": "Description",
  "assignedToType": "1" | "2"
  // assignedTo is automatically set by backend
}
```

#### Update Ticket
```
PUT /api/business/query-tickets/:id
Body: {
  "assignedToType": "1" | "2"
  // assignedTo is automatically set by backend
}
```

#### Update Status
```
PUT /api/business/query-tickets/:id/status
Body: {
  "status": "pending" | "in_progress" | "completed" | "not_completed"
}
```

#### Close Ticket
```
PUT /api/business/query-tickets/:id/close
// Only creator can close tickets
```

#### Delete Ticket
```
DELETE /api/business/query-tickets/:id
// Only creator can delete tickets
```

### Admin Endpoints

#### Create Ticket
```
POST /api/admin/query-tickets
Body: {
  "title": "Ticket Title",
  "businessId": "business_id",
  "description": "Description",
  "assignedToType": "1" | "2"
  // assignedTo is automatically set by backend
}
```

#### Update Ticket
```
PUT /api/admin/query-tickets/:id
Body: {
  "assignedToType": "1" | "2"
  // assignedTo is automatically set by backend
}
```

#### Update Status
```
PUT /api/admin/query-tickets/:id/status
Body: {
  "status": "pending" | "in_progress" | "completed" | "not_completed"
}
```

#### Close Ticket
```
PUT /api/admin/query-tickets/:id/close
// Only creator can close tickets
```

#### Delete Ticket
```
DELETE /api/admin/query-tickets/:id
// Only creator can delete tickets
```

#### Assign Ticket
```
PATCH /api/admin/query-tickets/:id/assign
Body: {
  "assignedToType": "1" | "2"
  // assignedTo is automatically set by backend
}
```

## Business Logic Examples

### Scenario 1: Business Creates Ticket for Themselves
```javascript
// Business user creates a ticket and assigns it to themselves
POST /api/business/query-tickets
{
  "title": "Need help with payment",
  "businessId": "business_123",
  "description": "Payment gateway not working",
  "assignedToType": "2"  // Auto-assigns to current business owner
}

// Result: Ticket is assigned to the business user who created it
// Business user can change status to any value
// Business user can delete/close the ticket
```

### Scenario 2: Business Creates Ticket for Business
```javascript
// Business user creates a ticket and assigns it to the business
POST /api/business/query-tickets
{
  "title": "Collaboration request",
  "businessId": "business_123",
  "description": "Need to work together",
  "assignedToType": "1"  // Auto-assigns to business_123
}

// Result: Ticket is assigned to business_123
// business_123 can change status to in_progress or completed
// Only the creator can delete/close the ticket
```

### Scenario 3: Admin Creates Ticket for Themselves
```javascript
// Admin creates a ticket and assigns it to themselves
POST /api/admin/query-tickets
{
  "title": "System maintenance",
  "businessId": "business_123",
  "description": "Need to perform maintenance",
  "assignedToType": "2"  // Auto-assigns to current admin
}

// Result: Ticket is assigned to the admin who created it
// Admin can change status to any value
// Admin can delete/close the ticket
```

### Scenario 4: Admin Creates Ticket for Business
```javascript
// Admin creates a ticket and assigns it to a business
POST /api/admin/query-tickets
{
  "title": "Compliance review",
  "businessId": "business_123",
  "description": "Annual compliance review required",
  "assignedToType": "1"  // Auto-assigns to business_123
}

// Result: Ticket is assigned to business_123
// business_123 can change status to in_progress or completed
// Only the creator (admin) can delete/close the ticket
```

## Status Transition Rules

### Automatic Status Changes
- When a ticket is assigned (from pending), status automatically changes to `in_progress`

### Manual Status Changes
- **Creator**: Can change to any status
- **Assignee**: Can only change to `in_progress` or `completed`
- **Others**: Cannot change status

## Error Handling

### Common Error Messages

```javascript
// Invalid assignment type
{
  "message": "Invalid assignedToType. Must be 1 (assign to business) or 2 (assign to me)",
  "code": "00400"
}

// Permission denied for status change
{
  "message": "As an assignee, you can only change status to in_progress or completed",
  "code": "00403"
}

// Permission denied for deletion
{
  "message": "Query ticket not found or access denied. Only the creator can delete tickets.",
  "code": "00404"
}
```

## Security Considerations

1. **Authentication Required**: All endpoints require proper authentication
2. **Authorization**: Users can only modify tickets they created or are assigned to
3. **Input Validation**: All IDs are validated as ObjectIds
4. **Business Ownership**: Business users can only access their own businesses
5. **Admin Permissions**: Admins have broader access but still follow assignment rules
6. **Automatic Assignment**: Backend automatically handles assignment logic for security

## Migration Notes

### Existing Tickets
- Existing tickets will continue to work with the current system
- New assignment logic only applies to newly created/updated tickets
- Status permissions are enforced for all tickets

### Database Schema
- No changes to existing database schema
- New fields (`assignedToType`, `assignedToModel`) are optional
- Backward compatibility maintained

### Frontend Changes
- **No more `assignedTo` field required**
- **Only send `assignedToType: "1"` or `"2"`**
- **Backend automatically sets the correct `assignedTo` ID**

## Testing Scenarios

1. **Test assignment type 1**: Verify that type "1" auto-assigns to business
2. **Test assignment type 2**: Verify that type "2" auto-assigns to current user
3. **Test status permissions**: Verify assignee can only change to allowed statuses
4. **Test creator permissions**: Verify creator can change to any status
5. **Test deletion permissions**: Verify only creator can delete tickets
6. **Test close permissions**: Verify only creator can close tickets
7. **Test automatic assignment**: Verify backend sets correct assignedTo ID
8. **Test no assignedTo field**: Verify frontend doesn't need to send assignedTo

## Frontend Implementation

### Simple Form Example
```javascript
const handleSubmit = async (formData) => {
  const ticketData = {
    title: formData.title,
    businessId: formData.businessId,
    description: formData.description,
    assignedToType: formData.assignedToType // Only this field needed!
    // assignedTo is automatically set by backend
  };
  
  const response = await fetch('/api/business/query-tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData)
  });
};
```

### Assignment Type Selection
```javascript
// Radio buttons or dropdown for assignment
<select name="assignedToType">
  <option value="">No Assignment</option>
  <option value="1">Assign to Business</option>
  <option value="2">Assign to Me</option>
</select>
```

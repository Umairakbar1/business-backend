# Brand Logo & Legal Documents API Documentation

## Overview
This API provides endpoints for managing brand logos and legal documents. Both can be accessed publicly without authentication, while admin operations require authentication.

## Brand Logo API

### Public Endpoints (No Authentication Required)

#### Get Brand Logo
```http
GET /api/brand-logo
```

**Response:**
```json
{
  "success": true,
  "message": "Brand logo retrieved successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Brand Logo",
    "description": "Company brand logo",
    "logo": {
      "url": "https://res.cloudinary.com/.../brand-logo.png",
      "public_id": "business-app/brand-logo/...",
      "width": 800,
      "height": 600,
      "format": "png",
      "bytes": 45000
    },
    "version": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Admin Endpoints (Authentication Required)

#### Upload/Update Brand Logo
```http
POST /api/admin/brand-logo/upload
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

Form Data:
- file: [image file] (field name can be 'file' or 'image')
- name: "Brand Logo" (optional)
- description: "Company brand logo" (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Brand logo uploaded successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Brand Logo",
    "description": "Company brand logo",
    "logo": {
      "url": "https://res.cloudinary.com/.../brand-logo.png",
      "public_id": "business-app/brand-logo/...",
      "width": 800,
      "height": 600,
      "format": "png",
      "bytes": 45000
    },
    "uploadedBy": "64f8a1b2c3d4e5f6a7b8c9d0",
    "version": 2,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Delete Brand Logo
```http
DELETE /api/admin/brand-logo
Authorization: Bearer <admin_token>
```

## Legal Documents API

### Public Endpoints (No Authentication Required)

#### Get All Legal Documents
```http
GET /api/legal-documents
```

**Response:**
```json
{
  "success": true,
  "message": "Legal documents retrieved successfully",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Privacy Policy",
      "type": "privacy_policy",
      "description": "Our privacy policy",
      "content": "<h1>Privacy Policy</h1><p>This is our privacy policy...</p>",
      "version": 1,
      "isActive": true,
      "isPublic": true,
      "lastUpdated": "2024-01-15T10:30:00.000Z",
      "documentFile": {
        "url": "https://res.cloudinary.com/.../privacy-policy.pdf",
        "public_id": "business-app/legal-documents/...",
        "filename": "privacy-policy.pdf",
        "size": 150000,
        "format": "pdf"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Get Legal Document by Type
```http
GET /api/legal-documents/privacy_policy
```

**Response:**
```json
{
  "success": true,
  "message": "Legal document retrieved successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Privacy Policy",
    "type": "privacy_policy",
    "description": "Our privacy policy",
    "content": "<h1>Privacy Policy</h1><p>This is our privacy policy...</p>",
    "version": 1,
    "isActive": true,
    "isPublic": true,
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "documentFile": {
      "url": "https://res.cloudinary.com/.../privacy-policy.pdf",
      "public_id": "business-app/legal-documents/...",
      "filename": "privacy-policy.pdf",
      "size": 150000,
      "format": "pdf"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Admin Endpoints (Authentication Required)

#### Create/Update Legal Document
```http
POST /api/admin/legal-documents
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

Form Data:
- file: [document file] (optional, field name can be 'file' or 'document')
- title: "Privacy Policy"
- type: "privacy_policy"
- description: "Our privacy policy" (optional)
- content: "<h1>Privacy Policy</h1><p>This is our privacy policy...</p>"
- isPublic: "true" (optional, default: true)
```

**Document Types:**
- `privacy_policy`
- `terms_of_service`
- `terms_and_conditions`
- `refund_policy`
- `shipping_policy`
- `return_policy`
- `disclaimer`
- `cookie_policy`
- `other`

**Response:**
```json
{
  "success": true,
  "message": "Legal document created successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Privacy Policy",
    "type": "privacy_policy",
    "description": "Our privacy policy",
    "content": "<h1>Privacy Policy</h1><p>This is our privacy policy...</p>",
    "version": 1,
    "isActive": true,
    "isPublic": true,
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "uploadedBy": "64f8a1b2c3d4e5f6a7b8c9d0",
    "documentFile": {
      "url": "https://res.cloudinary.com/.../privacy-policy.pdf",
      "public_id": "business-app/legal-documents/...",
      "filename": "privacy-policy.pdf",
      "size": 150000,
      "format": "pdf"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get All Legal Documents (Admin View)
```http
GET /api/admin/legal-documents/admin
Authorization: Bearer <admin_token>
```

#### Update Legal Document
```http
PUT /api/admin/legal-documents/:id
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

Form Data:
- file: [document file] (optional, field name can be 'file' or 'document')
- title: "Updated Privacy Policy" (optional)
- description: "Updated privacy policy" (optional)
- content: "<h1>Updated Privacy Policy</h1><p>This is our updated privacy policy...</p>" (optional)
- isPublic: "true" (optional)
```

#### Delete Legal Document
```http
DELETE /api/admin/legal-documents/:id
Authorization: Bearer <admin_token>
```

## Error Responses

### File Upload Errors
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB",
  "code": "00400"
}
```

### Not Found Errors
```json
{
  "success": false,
  "message": "Legal document not found",
  "code": "00404"
}
```

### Authentication Errors
```json
{
  "success": false,
  "message": "Access denied. Admin token required",
  "code": "00401"
}
```

## Usage Examples

### Frontend JavaScript Examples

#### Get Brand Logo
```javascript
const getBrandLogo = async () => {
  try {
    const response = await fetch('/api/brand-logo');
    const data = await response.json();
    
    if (data.success) {
      const logoUrl = data.data.logo.url;
      document.getElementById('brand-logo').src = logoUrl;
    }
  } catch (error) {
    console.error('Error fetching brand logo:', error);
  }
};
```

#### Get Legal Documents
```javascript
const getLegalDocuments = async () => {
  try {
    const response = await fetch('/api/legal-documents');
    const data = await response.json();
    
    if (data.success) {
      data.data.forEach(doc => {
        console.log(`${doc.title}: ${doc.type}`);
      });
    }
  } catch (error) {
    console.error('Error fetching legal documents:', error);
  }
};
```

#### Upload Brand Logo (Admin)
```javascript
const uploadBrandLogo = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', 'Brand Logo');
    formData.append('description', 'Company brand logo');
    
    const response = await fetch('/api/admin/brand-logo/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Brand logo uploaded successfully');
    }
  } catch (error) {
    console.error('Error uploading brand logo:', error);
  }
};
```

#### Create Legal Document (Admin)
```javascript
const createLegalDocument = async (file, documentData) => {
  try {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('title', documentData.title);
    formData.append('type', documentData.type);
    formData.append('description', documentData.description);
    formData.append('content', documentData.content);
    formData.append('isPublic', documentData.isPublic);
    
    const response = await fetch('/api/admin/legal-documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Legal document created successfully');
    }
  } catch (error) {
    console.error('Error creating legal document:', error);
  }
};
```

## Notes

1. **File Upload**: Both APIs support flexible field names ('file', 'image', 'document') for better frontend compatibility.

2. **Public Access**: Brand logo and legal documents are accessible publicly without authentication.

3. **Version Control**: Both systems maintain version history automatically.

4. **File Storage**: All files are stored in Cloudinary with proper organization:
   - Brand logos: `business-app/brand-logo/`
   - Legal documents: `business-app/legal-documents/`

5. **Soft Delete**: Legal documents use soft delete (isActive: false) instead of hard delete.

6. **Document Types**: Legal documents support multiple predefined types for better organization.

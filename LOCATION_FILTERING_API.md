# Location-Based Business Filtering API Documentation

This document describes the location-based filtering capabilities for business listings.

## Base URL
```
GET /api/user/business/
```

## Enhanced Business Listings with Location Filtering

### Endpoint: `GET /business-listings`

**Description:** Get business listings with enhanced location filtering capabilities.

**Query Parameters:**

#### Location Parameters
- `lat` (number): User's latitude (required for distance-based filtering)
- `lng` (number): User's longitude (required for distance-based filtering)
- `location` (string): Text-based location search (city, address, state)

**Note:** Search radius is automatically set to 25km for optimal user experience.

## Default Search Radius

The system automatically uses a **25km search radius** for all location-based queries. This radius has been chosen because it:

- **Balances coverage and relevance** - Provides enough businesses to choose from without overwhelming results
- **Optimizes performance** - Smaller radius means faster queries and better user experience
- **Matches user expectations** - Most users search for businesses within reasonable driving/walking distance
- **Reduces API complexity** - No need to manage radius parameters on the frontend

If you need to adjust the search radius, you can modify the `DEFAULT_RADIUS` constant in the controller files.

#### Standard Parameters
- `rating` (number): Minimum rating filter
- `sortBy` (string): Sorting options: `rating`, `reviews`, `name`, `distance`
- `claimed` (boolean): Filter by claimed status
- `status` (string): Filter by business status
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Items per page (default: 10)

**Examples:**

#### 1. Find businesses within 25km of specific coordinates
```
GET /api/user/business/business-listings?lat=40.7128&lng=-74.0060
```

#### 2. Find businesses in a specific city with rating filter
```
GET /api/user/business/business-listings?location=New York&rating=4&sortBy=rating
```

#### 3. Find nearest businesses with distance sorting
```
GET /api/user/business/business-listings?lat=40.7128&lng=-74.0060&sortBy=distance&limit=20
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "business_id",
      "businessName": "Business Name",
      "email": "business@example.com",
      "phoneNumber": "+1234567890",
      "address": "123 Business St",
      "location": {
        "description": "Downtown Area",
        "lat": 40.7128,
        "lng": -74.0060,
        "type": "Point",
        "coordinates": [-74.0060, 40.7128]
      },
      "category": { /* category data */ },
      "subcategories": [ /* subcategory data */ ],
      "claimed": true,
      "status": "approved",
      "avgRating": 4.5,
      "reviewsCount": 25,
      "distance": 2.3, // Distance in km (only when coordinates provided)
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "hasNextPage": true,
    "location": {
      "userLat": 40.7128,
      "userLng": -74.0060,
      "radius": 25,
      "unit": "km"
    }
  }
}
```

## Optimized Coordinates-Based Search

### Endpoint: `GET /businesses-by-coordinates`

**Description:** Get businesses by coordinates with optimized geospatial queries using MongoDB's `$geoNear`.

**Query Parameters:**
- `lat` (number, required): User's latitude
- `lng` (number, required): User's longitude
- `category` (string): Filter by category ID
- `status` (string): Filter by business status (default: 'approved')
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Note:** Search radius is automatically set to 25km for optimal user experience.

**Example:**
```
GET /api/user/business/businesses-by-coordinates?lat=40.7128&lng=-74.0060&category=category_id&limit=50
```

**Response Format:**
```json
{
  "success": true,
  "data": [ /* business data with distance field */ ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "hasNextPage": false,
    "location": {
      "userLat": 40.7128,
      "userLng": -74.0060,
      "radius": 25,
      "unit": "km"
    }
  }
}
```

## Distance Calculation Methods

### 1. Haversine Formula (Business Listings)
Used in the main business listings endpoint for accurate distance calculation.

**Formula:**
```
distance = acos(
  sin(lat1/2)² + sin(lat2/2)² + 
  cos(lat1) × cos(lat2) × cos(lng1 - lng2)
) × Earth's radius (6371 km)
```

### 2. MongoDB $geoNear (Coordinates Endpoint)
Uses MongoDB's built-in geospatial calculations for optimal performance.

## Sorting Options

### Available Sort Types:
1. **`distance`** - Sort by nearest first (default when coordinates provided)
2. **`rating`** - Sort by highest rating first
3. **`reviews`** - Sort by most reviews first
4. **`name`** - Sort alphabetically by business name
5. **`_id`** - Sort by creation date (default when no coordinates)

### Automatic Distance Sorting:
When coordinates are provided, the system automatically sorts by distance unless another sort option is specified.

## Location Data Structure

### Business Location Schema:
```json
{
  "location": {
    "description": "Human-readable location description",
    "lat": 40.7128,
    "lng": -74.0060,
    "type": "Point",
    "coordinates": [-74.0060, 40.7128] // [longitude, latitude]
  }
}
```

### GeoJSON Compliance:
The location field follows GeoJSON Point specification:
- `type`: Always "Point"
- `coordinates`: Array of [longitude, latitude] (MongoDB standard)

## Performance Optimizations

### 1. Geospatial Indexes
- **2dsphere index** on `location` field for accurate geospatial queries
- **Compound index** on `location.lat` and `location.lng` for fallback queries

### 2. Query Optimization
- Uses `$geoNear` for efficient distance-based sorting
- Automatic coordinate population via pre-save middleware
- Pagination support for large result sets

### 3. Caching Considerations
- Distance calculations are performed at query time
- Consider implementing Redis caching for frequently accessed coordinates

## Error Handling

### Common Error Responses:

#### Invalid Coordinates
```json
{
  "success": false,
  "message": "Valid latitude, longitude, and radius are required"
}
```

#### No Results
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "hasNextPage": false
  }
}
```

## Usage Examples

### Frontend Implementation:

#### 1. Get User's Current Location
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    fetchBusinessesByLocation(latitude, longitude);
  },
  (error) => {
    console.error('Location access denied:', error);
    // Fallback to text-based search
    searchByCity('New York');
  }
);
```

#### 2. Search by Coordinates
```javascript
const searchByCoordinates = async (lat, lng) => {
  const response = await fetch(
    `/api/user/business/businesses-by-coordinates?lat=${lat}&lng=${lng}`
  );
  const data = await response.json();
  return data;
};
```

#### 3. Search by City/Address
```javascript
const searchByLocation = async (location) => {
  const response = await fetch(
    `/api/user/business/business-listings?location=${encodeURIComponent(location)}`
  );
  const data = await response.json();
  return data;
};
```

## Best Practices

### 1. Coordinate Validation
- Always validate latitude (-90 to 90) and longitude (-180 to 180)
- Search radius is automatically set to 25km for optimal performance and user experience

### 2. Performance
- Use the coordinates endpoint for location-based searches
- Implement pagination for large result sets
- Consider caching frequently accessed coordinates

### 3. User Experience
- Provide fallback to text-based search when GPS is unavailable
- Show distance information in user-friendly format
- Implement progressive loading for large result sets

## Migration Notes

### Existing Data:
- Existing businesses with `lat`/`lng` will automatically get `coordinates` field
- Pre-save middleware ensures new/updated businesses have proper GeoJSON format

### Index Creation:
- Geospatial indexes are created automatically when the model is loaded
- Existing queries will continue to work with enhanced performance

# Search Suggestions API Documentation

## Overview
The Search Suggestions API provides intelligent autocomplete suggestions for businesses, categories, and subcategories based on user input. This endpoint is designed to enhance user experience by providing real-time search suggestions as users type.

## Endpoint
```
GET /api/user/business/search-suggestions
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | ✅ Yes | - | Search query (minimum 1 character) |
| `limit` | number | ❌ No | 10 | Maximum number of results (max 20) |

## Request Examples

### Basic Search
```bash
GET /api/user/business/search-suggestions?q=restaurant
```

### Search with Custom Limit
```bash
GET /api/user/business/search-suggestions?q=tech&limit=15
```

### Search for Specific Terms
```bash
GET /api/user/business/search-suggestions?q=coffee&limit=5
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "business",
      "displayName": "Coffee Corner",
      "businessName": "Coffee Corner",
      "description": "Best coffee in town",
      "logo": {
        "url": "https://example.com/logo.jpg",
        "public_id": "logo_123"
      },
      "location": {
        "description": "123 Main St, City",
        "lat": 40.7128,
        "lng": -74.0060
      },
      "city": "New York",
      "state": "NY",
      "category": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Food & Beverage",
        "slug": "food-beverage"
      },
      "searchScore": 75
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "type": "category",
      "displayName": "Food & Beverage",
      "title": "Food & Beverage",
      "description": "Restaurants, cafes, and food services",
      "image": {
        "url": "https://example.com/category.jpg",
        "public_id": "category_123"
      },
      "slug": "food-beverage",
      "color": "#FF6B6B",
      "searchScore": 100
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "type": "subcategory",
      "displayName": "Coffee Shops",
      "title": "Coffee Shops",
      "description": "Specialty coffee and tea shops",
      "image": {
        "url": "https://example.com/subcategory.jpg",
        "public_id": "subcategory_123"
      },
      "slug": "coffee-shops",
      "parentCategory": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Food & Beverage",
        "slug": "food-beverage"
      },
      "searchScore": 50
    }
  ],
  "meta": {
    "total": 3,
    "businesses": 1,
    "categories": 1,
    "subcategories": 1,
    "searchQuery": "coffee"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Search query is required"
}
```

## Response Fields

### Data Array Items

#### Business Type
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Business unique identifier |
| `type` | string | Always "business" |
| `displayName` | string | Business name for display |
| `businessName` | string | Full business name |
| `description` | string | Business description |
| `logo` | object | Business logo information |
| `location` | object | Business location details |
| `city` | string | Business city |
| `state` | string | Business state |
| `category` | object | Associated category info |
| `searchScore` | number | Relevance score (0-100) |

#### Category Type
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Category unique identifier |
| `type` | string | Always "category" |
| `displayName` | string | Category title for display |
| `title` | string | Full category title |
| `description` | string | Category description |
| `image` | object | Category image information |
| `slug` | string | Category URL slug |
| `color` | string | Category theme color |
| `searchScore` | number | Relevance score (0-100) |

#### Subcategory Type
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Subcategory unique identifier |
| `type` | string | Always "subcategory" |
| `displayName` | string | Subcategory title for display |
| `title` | string | Full subcategory title |
| `description` | string | Subcategory description |
| `image` | object | Subcategory image information |
| `slug` | string | Subcategory URL slug |
| `parentCategory` | object | Parent category information |
| `searchScore` | number | Relevance score (0-100) |

### Meta Information
| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of suggestions |
| `businesses` | number | Number of business suggestions |
| `categories` | number | Number of category suggestions |
| `subcategories` | number | Number of subcategory suggestions |
| `searchQuery` | string | Original search query |

## Search Algorithm

### Scoring System
The API uses a sophisticated scoring system to rank results by relevance:

1. **Exact Match (100 points)**: Perfect match with search query
2. **Starts With (50 points)**: Query matches the beginning of the term
3. **Contains (25 points)**: Query appears anywhere in the term
4. **Description Match (10 points)**: Query found in description
5. **Location Match (5 points)**: Query found in city/state/location

### Result Distribution
- **Businesses**: Up to 50% of total results
- **Categories**: Up to 50% of total results  
- **Subcategories**: Up to 33% of total results

Results are sorted by search score (highest first) and then alphabetically.

## Usage Examples

### Frontend Implementation

#### React Component
```jsx
import { useState, useEffect } from 'react';

const SearchSuggestions = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/user/business/search-suggestions?q=${encodeURIComponent(searchQuery)}&limit=10`
      );
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.data);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(query);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search businesses, categories..."
        className="search-input"
      />
      
      {isLoading && <div className="loading">Loading...</div>}
      
      {suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((item) => (
            <div 
              key={`${item.type}-${item._id}`} 
              className="suggestion-item"
              onClick={() => handleSuggestionClick(item)}
            >
              <div className="suggestion-header">
                <span className={`type-badge ${item.type}`}>
                  {item.type.toUpperCase()}
                </span>
                <span className="name">{item.displayName}</span>
              </div>
              
              {item.type === 'business' && item.category && (
                <div className="suggestion-details">
                  <span className="category">{item.category.title}</span>
                  {item.city && <span className="location">{item.city}</span>}
                </div>
              )}
              
              {item.type === 'subcategory' && item.parentCategory && (
                <div className="suggestion-details">
                  <span className="parent-category">{item.parentCategory.title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;
```

#### Vanilla JavaScript
```javascript
class SearchSuggestions {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.suggestions = [];
    this.isLoading = false;
    this.init();
  }

  init() {
    this.createSearchInput();
    this.bindEvents();
  }

  createSearchInput() {
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Search businesses, categories...';
    this.input.className = 'search-input';
    
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'suggestions-container';
    
    this.container.appendChild(this.input);
    this.container.appendChild(this.suggestionsContainer);
  }

  bindEvents() {
    let timeoutId;
    this.input.addEventListener('input', (e) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.fetchSuggestions(e.target.value);
      }, 300);
    });
  }

  async fetchSuggestions(query) {
    if (!query.trim()) {
      this.clearSuggestions();
      return;
    }

    this.setLoading(true);
    try {
      const response = await fetch(
        `/api/user/business/search-suggestions?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await response.json();
      
      if (data.success) {
        this.suggestions = data.data;
        this.renderSuggestions();
      } else {
        this.clearSuggestions();
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      this.clearSuggestions();
    } finally {
      this.setLoading(false);
    }
  }

  renderSuggestions() {
    this.suggestionsContainer.innerHTML = '';
    
    this.suggestions.forEach(item => {
      const suggestionEl = this.createSuggestionElement(item);
      this.suggestionsContainer.appendChild(suggestionEl);
    });
  }

  createSuggestionElement(item) {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.innerHTML = `
      <div class="suggestion-header">
        <span class="type-badge ${item.type}">${item.type.toUpperCase()}</span>
        <span class="name">${item.displayName}</span>
      </div>
      ${this.getSuggestionDetails(item)}
    `;
    
    div.addEventListener('click', () => this.handleSuggestionClick(item));
    return div;
  }

  getSuggestionDetails(item) {
    if (item.type === 'business' && item.category) {
      return `<div class="suggestion-details">
        <span class="category">${item.category.title}</span>
        ${item.city ? `<span class="location">${item.city}</span>` : ''}
      </div>`;
    }
    
    if (item.type === 'subcategory' && item.parentCategory) {
      return `<div class="suggestion-details">
        <span class="parent-category">${item.parentCategory.title}</span>
      </div>`;
    }
    
    return '';
  }

  handleSuggestionClick(item) {
    // Handle suggestion selection based on type
    switch (item.type) {
      case 'business':
        window.location.href = `/business/${item._id}`;
        break;
      case 'category':
        window.location.href = `/category/${item.slug}`;
        break;
      case 'subcategory':
        window.location.href = `/subcategory/${item.slug}`;
        break;
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (loading) {
      this.input.classList.add('loading');
    } else {
      this.input.classList.remove('loading');
    }
  }

  clearSuggestions() {
    this.suggestions = [];
    this.suggestionsContainer.innerHTML = '';
  }
}

// Usage
const searchSuggestions = new SearchSuggestions('search-container');
```

## Error Handling

### Common Error Scenarios

1. **Missing Query Parameter**
   ```json
   {
     "success": false,
     "message": "Search query is required"
   }
   ```

2. **Server Error**
   ```json
   {
     "success": false,
     "message": "Failed to fetch search suggestions",
     "error": "Database connection error"
   }
   ```

3. **No Results Found**
   ```json
   {
     "success": true,
     "data": [],
     "meta": {
       "total": 0,
       "businesses": 0,
       "categories": 0,
       "subcategories": 0,
       "searchQuery": "nonexistent"
     }
   }
   ```

## Performance Considerations

- **Debouncing**: Implement client-side debouncing (300-500ms) to avoid excessive API calls
- **Caching**: Consider implementing Redis caching for frequent search queries
- **Pagination**: Use the limit parameter to control result size
- **Indexing**: Ensure proper database indexes on searchable fields

## Security

- **Input Validation**: All search queries are sanitized and validated
- **Rate Limiting**: Consider implementing rate limiting for production use
- **SQL Injection**: Uses MongoDB aggregation pipeline (no SQL injection risk)

## Testing

Use the provided test file `test-search-suggestions.js` to test the API:

```bash
node test-search-suggestions.js
```

## Support

For questions or issues with this API endpoint, please refer to the backend development team or create an issue in the project repository.

// Test file for the new search suggestions API endpoint
// This demonstrates how to use the getSearchSuggestions function

const BASE_URL = 'http://localhost:5000/api'; // Adjust port as needed

// Test search suggestions
async function testSearchSuggestions() {
  try {
    console.log('🔍 Testing Search Suggestions API...\n');
    
    // Test 1: Search for businesses and categories
    console.log('📝 Test 1: Search for "restaurant"');
    const response1 = await fetch(`${BASE_URL}/user/business/search-suggestions?q=restaurant&limit=10`);
    const data1 = await response1.json();
    
    if (data1.success) {
      console.log('✅ Success! Found suggestions:', data1.meta);
      console.log('📊 Sample suggestions:');
      data1.data.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. [${item.type.toUpperCase()}] ${item.displayName}`);
        if (item.type === 'business' && item.category) {
          console.log(`     Category: ${item.category.title}`);
        }
        if (item.type === 'subcategory' && item.parentCategory) {
          console.log(`     Parent: ${item.parentCategory.title}`);
        }
      });
    } else {
      console.log('❌ Error:', data1.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Search for categories
    console.log('📝 Test 2: Search for "tech"');
    const response2 = await fetch(`${BASE_URL}/user/business/search-suggestions?q=tech&limit=5`);
    const data2 = await response2.json();
    
    if (data2.success) {
      console.log('✅ Success! Found suggestions:', data2.meta);
      console.log('📊 Sample suggestions:');
      data2.data.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. [${item.type.toUpperCase()}] ${item.displayName}`);
      });
    } else {
      console.log('❌ Error:', data2.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Search with no results
    console.log('📝 Test 3: Search for "xyz123nonexistent"');
    const response3 = await fetch(`${BASE_URL}/user/business/search-suggestions?q=xyz123nonexistent&limit=5`);
    const data3 = await response3.json();
    
    if (data3.success) {
      console.log('✅ Success! Found suggestions:', data3.meta);
      if (data3.data.length === 0) {
        console.log('📊 No suggestions found (as expected)');
      }
    } else {
      console.log('❌ Error:', data3.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 4: Invalid request (no query)
    console.log('📝 Test 4: Invalid request (no query parameter)');
    const response4 = await fetch(`${BASE_URL}/user/business/search-suggestions`);
    const data4 = await response4.json();
    
    if (!data4.success) {
      console.log('✅ Correctly handled invalid request:', data4.message);
    } else {
      console.log('❌ Should have failed for missing query');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Test the API
testSearchSuggestions();

// Example usage in frontend:
/*
// In your React component:
const [suggestions, setSuggestions] = useState([]);
const [isLoading, setIsLoading] = useState(false);

const fetchSuggestions = async (searchQuery) => {
  if (!searchQuery.trim()) {
    setSuggestions([]);
    return;
  }
  
  setIsLoading(true);
  try {
    const response = await fetch(`/api/user/business/search-suggestions?q=${encodeURIComponent(searchQuery)}&limit=10`);
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

// Use in input onChange:
<input 
  onChange={(e) => fetchSuggestions(e.target.value)}
  placeholder="Search businesses, categories..."
/>

// Display suggestions:
{suggestions.map((item) => (
  <div key={`${item.type}-${item._id}`} className="suggestion-item">
    <span className="type-badge">{item.type}</span>
    <span className="name">{item.displayName}</span>
    {item.type === 'business' && item.category && (
      <span className="category">{item.category.title}</span>
    )}
  </div>
))}
*/

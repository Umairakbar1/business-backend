import Business from '../../models/business/business.js';
import Review from '../../models/admin/review.js';
import { successResponseHelper } from '../../helpers/utilityHelper.js';
import { errorResponseHelper } from '../../helpers/utilityHelper.js';

// Generate Review Embed Link for a Business
export const generateReviewEmbedLink = async (req, res) => {
  try {
    const { businessId } = req.body;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
        return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
    }

    // Generate embed token if not present
    if (!business.reviewEmbedToken) {
      business.reviewEmbedToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await business.save();
    }

    const baseUrl = process.env.SITE_URL || 'https://mybusinessads.site';
    const embedUrl = `${baseUrl}/api/embed/reviews/${business._id}/${business.reviewEmbedToken}`;
    
    // Generate HTML embed code
    const html = `
<!-- Business Reviews Embed Widget -->
<div id="business-reviews-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/api/embed/reviews/${business._id}/${business.reviewEmbedToken}/widget.js';
  s.async=true;d.getElementById('business-reviews-${business._id}').appendChild(s);
})();
</script>`;

    successResponseHelper(res, { 
      success: true, 
      data: {
        businessId: business._id,
        businessName: business.businessName,
        embedUrl,
        embedToken: business.reviewEmbedToken,
        html,
        widgetUrl: `${baseUrl}/api/embed/reviews/${business._id}/${business.reviewEmbedToken}/widget.js`
      }
    });
  } catch (error) {
    errorResponseHelper(res, { 
      message: 'Failed to generate review embed link', 
      code: '00500' 
    });
  }
};

// Get Reviews Data via Embed (No Authorization Required)
export const getEmbedReviews = async (req, res) => {
  try {
    const { businessId, embedToken } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Find business by ID and embed token
    const business = await Business.findOne({ 
      _id: businessId, 
      reviewEmbedToken: embedToken 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found or invalid embed token', code: '00404' });
    }

    // Build filter for approved reviews only
    const filter = { 
      businessId, 
      status: 'approved' 
    };
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get reviews with pagination
    const reviews = await Review.find(filter)
      .populate('userId', 'name email profilePhoto')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Review.countDocuments(filter);
    
    // Calculate average rating
    const ratingStats = await Review.aggregate([
      { $match: { businessId, status: 'approved' } },
      { 
        $group: { 
          _id: null, 
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        } 
      }
    ]);

    const stats = ratingStats[0] || { averageRating: 0, totalReviews: 0, ratingDistribution: [] };
    
    // Calculate rating distribution
    const ratingCounts = {};
    for (let i = 1; i <= 5; i++) {
      ratingCounts[i] = stats.ratingDistribution.filter(r => r === i).length;
    }

    successResponseHelper(res, { 
      data: {
        business: {
          _id: business._id,
          businessName: business.businessName,
          logo: business.logo,
          category: business.category
        },
        reviews,
        stats: {
          averageRating: Math.round(stats.averageRating * 10) / 10,
          totalReviews: stats.totalReviews,
          ratingDistribution: ratingCounts
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// Serve Widget JavaScript (No Authorization Required)
export const serveReviewWidget = async (req, res) => {
  try {
    const { businessId, embedToken } = req.params;
    
    // Verify business and embed token
    const business = await Business.findOne({ 
      _id: businessId, 
      reviewEmbedToken: embedToken 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found or invalid embed token', code: '00404' });
    }

    const baseUrl = process.env.SITE_URL || 'https://mybusinessads.site';
    
    // Generate widget JavaScript
    const widgetJS = `
(function() {
  'use strict';
  
  // Widget configuration
  const config = {
    businessId: '${business._id}',
    embedToken: '${embedToken}',
    apiUrl: '${baseUrl}/api/embed/reviews/${business._id}/${embedToken}',
    containerId: 'business-reviews-${business._id}'
  };
  
  // Widget styles
  const styles = \`
    .business-reviews-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .business-reviews-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .business-reviews-title {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    .business-reviews-stats {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
    }
    .business-reviews-rating {
      font-size: 36px;
      font-weight: bold;
      color: #f59e0b;
    }
    .business-reviews-count {
      color: #666;
    }
    .business-reviews-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .business-review-item {
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #f9fafb;
    }
    .business-review-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .business-review-author {
      font-weight: 600;
      color: #333;
    }
    .business-review-rating {
      color: #f59e0b;
      font-weight: bold;
    }
    .business-review-comment {
      color: #4b5563;
      line-height: 1.5;
    }
    .business-reviews-pagination {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 20px;
    }
    .business-reviews-page-btn {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      background: #fff;
      border-radius: 4px;
      cursor: pointer;
    }
    .business-reviews-page-btn:hover {
      background: #f3f4f6;
    }
    .business-reviews-page-btn.active {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;
    }
  \`;
  
  // Inject styles
  if (!document.getElementById('business-reviews-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'business-reviews-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
  
  // Load reviews data
  async function loadReviews(page = 1) {
    try {
      const response = await fetch(\`\${config.apiUrl}?page=\${page}&limit=5\`);
      const data = await response.json();
      
      if (data.success) {
        renderReviews(data.data);
      } else {
        console.error('Failed to load reviews:', data.message);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }
  
  // Render reviews
  function renderReviews(data) {
    const container = document.getElementById(config.containerId);
    if (!container) return;
    
    const { business, reviews, stats, pagination } = data;
    
    container.innerHTML = \`
      <div class="business-reviews-widget">
        <div class="business-reviews-header">
          <div class="business-reviews-title">\${business.businessName}</div>
          <div class="business-reviews-stats">
            <div class="business-reviews-rating">\${stats.averageRating}★</div>
            <div class="business-reviews-count">\${stats.totalReviews} reviews</div>
          </div>
        </div>
        
        <div class="business-reviews-list">
          \${reviews.map(review => \`
            <div class="business-review-item">
              <div class="business-review-header">
                <div class="business-review-author">\${review.userId?.name || 'Anonymous'}</div>
                <div class="business-review-rating">\${'★'.repeat(review.rating)}\${'☆'.repeat(5-review.rating)}</div>
              </div>
              <div class="business-review-comment">\${review.comment}</div>
            </div>
          \`).join('')}
        </div>
        
        \${pagination.totalPages > 1 ? \`
          <div class="business-reviews-pagination">
            \${pagination.page > 1 ? \`<button class="business-reviews-page-btn" onclick="loadReviews(\${pagination.page - 1})">Previous</button>\` : ''}
            <span class="business-reviews-page-btn active">Page \${pagination.page} of \${pagination.totalPages}</span>
            \${pagination.page < pagination.totalPages ? \`<button class="business-reviews-page-btn" onclick="loadReviews(\${pagination.page + 1})">Next</button>\` : ''}
          </div>
        \` : ''}
      </div>
    \`;
  }
  
  // Initialize widget
  loadReviews();
  
  // Make loadReviews globally available for pagination
  window.loadReviews = loadReviews;
})();`;

    res.setHeader('Content-Type', 'application/javascript');
    res.send(widgetJS);
  } catch (error) {
      errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// Regenerate Review Embed Token
export const regenerateReviewEmbedToken = async (req, res) => {
  try {
    const { businessId } = req.body;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
    }

    // Generate new embed token
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    business.reviewEmbedToken = newToken;
    await business.save();

    successResponseHelper(res, { 
      message: 'Review embed token regenerated successfully',
      data: {
        businessId: business._id,
        newToken
      }
    });
  } catch (error) {
    errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 
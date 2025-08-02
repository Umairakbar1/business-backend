import Business from '../../models/business/business.js';
import BusinessSubscription from '../../models/admin/businessSubsciption.js';
import Review from '../../models/admin/review.js';
import mongoose from 'mongoose';

// Generate Review Embed Link
export const generateReviewEmbedLink = async (req, res) => {
  try {
    const { businessId, type = 'reviews' } = req.body;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found or access denied' 
      });
    }

    // Check if business has review embed feature
    if (!business.features?.includes('review_embed')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Review embed feature not available for your current plan' 
      });
    }

    // Generate embed token if not present
    if (!business.embedToken) {
      business.embedToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await business.save();
    }

    const baseUrl = process.env.SITE_URL || 'https://yourdomain.com';
    const embedUrl = `${baseUrl}/embed/review/${business._id}/${business.embedToken}`;
    
    // Generate different HTML codes based on type
    let html = '';
    let css = '';
    let js = '';

    switch (type) {
      case 'reviews':
        html = `
<!-- Review Embed Widget -->
<div id="mybiz-review-embed-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/review-widget.js?bid=${business._id}&token=${business.embedToken}&type=reviews';
  s.async=true;d.getElementById('mybiz-review-embed-${business._id}').appendChild(s);
})();
</script>`;
        break;
      
      case 'review-form':
        html = `
<!-- Review Form Embed Widget -->
<div id="mybiz-review-form-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/review-widget.js?bid=${business._id}&token=${business.embedToken}&type=form';
  s.async=true;d.getElementById('mybiz-review-form-${business._id}').appendChild(s);
})();
</script>`;
        break;
      
      case 'review-stats':
        html = `
<!-- Review Stats Embed Widget -->
<div id="mybiz-review-stats-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/review-widget.js?bid=${business._id}&token=${business.embedToken}&type=stats';
  s.async=true;d.getElementById('mybiz-review-stats-${business._id}').appendChild(s);
})();
</script>`;
        break;
      
      default:
        html = `
<!-- Review Embed Widget -->
<div id="mybiz-review-embed-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/review-widget.js?bid=${business._id}&token=${business.embedToken}&type=reviews';
  s.async=true;d.getElementById('mybiz-review-embed-${business._id}').appendChild(s);
})();
</script>`;
    }

    res.json({ 
      success: true, 
      data: {
        embedUrl,
        html,
        css,
        js,
        businessId: business._id,
        businessName: business.businessName,
        type,
        embedToken: business.embedToken
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate review embed link', 
      error: error.message 
    });
  }
};

// Generate Business Subscription Embed Link
export const generateSubscriptionEmbedLink = async (req, res) => {
  try {
    const { businessId, type = 'subscription' } = req.body;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found or access denied' 
      });
    }

    // Check if business has subscription embed feature
    if (!business.features?.includes('subscription_embed')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Subscription embed feature not available for your current plan' 
      });
    }

    // Generate subscription embed token if not present
    if (!business.subscriptionEmbedToken) {
      business.subscriptionEmbedToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await business.save();
    }

    const baseUrl = process.env.SITE_URL || 'https://yourdomain.com';
    const embedUrl = `${baseUrl}/embed/subscription/${business._id}/${business.subscriptionEmbedToken}`;
    
    let html = '';
    switch (type) {
      case 'subscription':
        html = `
<!-- Subscription Embed Widget -->
<div id="mybiz-subscription-embed-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/subscription-widget.js?bid=${business._id}&token=${business.subscriptionEmbedToken}&type=subscription';
  s.async=true;d.getElementById('mybiz-subscription-embed-${business._id}').appendChild(s);
})();
</script>`;
        break;
      
      case 'pricing':
        html = `
<!-- Pricing Plans Embed Widget -->
<div id="mybiz-pricing-embed-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/subscription-widget.js?bid=${business._id}&token=${business.subscriptionEmbedToken}&type=pricing';
  s.async=true;d.getElementById('mybiz-pricing-embed-${business._id}').appendChild(s);
})();
</script>`;
        break;
    }

    res.json({ 
      success: true, 
      data: {
        embedUrl,
        html,
        businessId: business._id,
        businessName: business.businessName,
        type,
        embedToken: business.subscriptionEmbedToken
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate subscription embed link', 
      error: error.message 
    });
  }
};

// Generate Boost Plans Embed Link
export const generateBoostEmbedLink = async (req, res) => {
  try {
    const { businessId, type = 'boost' } = req.body;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found or access denied' 
      });
    }

    // Check if business has boost embed feature
    if (!business.features?.includes('boost_embed')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Boost embed feature not available for your current plan' 
      });
    }

    // Generate boost embed token if not present
    if (!business.boostEmbedToken) {
      business.boostEmbedToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await business.save();
    }

    const baseUrl = process.env.SITE_URL || 'https://yourdomain.com';
    const embedUrl = `${baseUrl}/embed/boost/${business._id}/${business.boostEmbedToken}`;
    
    let html = '';
    switch (type) {
      case 'boost':
        html = `
<!-- Boost Plans Embed Widget -->
<div id="mybiz-boost-embed-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/boost-widget.js?bid=${business._id}&token=${business.boostEmbedToken}&type=boost';
  s.async=true;d.getElementById('mybiz-boost-embed-${business._id}').appendChild(s);
})();
</script>`;
        break;
      
      case 'boost-form':
        html = `
<!-- Boost Form Embed Widget -->
<div id="mybiz-boost-form-${business._id}"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/embed/boost-widget.js?bid=${business._id}&token=${business.boostEmbedToken}&type=form';
  s.async=true;d.getElementById('mybiz-boost-form-${business._id}').appendChild(s);
})();
</script>`;
        break;
    }

    res.json({ 
      success: true, 
      data: {
        embedUrl,
        html,
        businessId: business._id,
        businessName: business.businessName,
        type,
        embedToken: business.boostEmbedToken
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate boost embed link', 
      error: error.message 
    });
  }
};

// Get All Embed Links for a Business
export const getBusinessEmbedLinks = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found or access denied' 
      });
    }

    const baseUrl = process.env.SITE_URL || 'https://yourdomain.com';
    
    const embedLinks = {
      reviews: business.features?.includes('review_embed') ? {
        embedUrl: `${baseUrl}/embed/review/${business._id}/${business.embedToken}`,
        embedToken: business.embedToken,
        available: true
      } : { available: false },
      
      subscription: business.features?.includes('subscription_embed') ? {
        embedUrl: `${baseUrl}/embed/subscription/${business._id}/${business.subscriptionEmbedToken}`,
        embedToken: business.subscriptionEmbedToken,
        available: true
      } : { available: false },
      
      boost: business.features?.includes('boost_embed') ? {
        embedUrl: `${baseUrl}/embed/boost/${business._id}/${business.boostEmbedToken}`,
        embedToken: business.boostEmbedToken,
        available: true
      } : { available: false }
    };

    res.json({ 
      success: true, 
      data: {
        businessId: business._id,
        businessName: business.businessName,
        plan: business.plan,
        features: business.features,
        embedLinks
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get embed links', 
      error: error.message 
    });
  }
};

// Regenerate Embed Token
export const regenerateEmbedToken = async (req, res) => {
  try {
    const { businessId, type } = req.body;
    
    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: req.businessOwner._id 
    });
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found or access denied' 
      });
    }

    let newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    switch (type) {
      case 'reviews':
        if (!business.features?.includes('review_embed')) {
          return res.status(403).json({ 
            success: false, 
            message: 'Review embed feature not available' 
          });
        }
        business.embedToken = newToken;
        break;
      
      case 'subscription':
        if (!business.features?.includes('subscription_embed')) {
          return res.status(403).json({ 
            success: false, 
            message: 'Subscription embed feature not available' 
          });
        }
        business.subscriptionEmbedToken = newToken;
        break;
      
      case 'boost':
        if (!business.features?.includes('boost_embed')) {
          return res.status(403).json({ 
            success: false, 
            message: 'Boost embed feature not available' 
          });
        }
        business.boostEmbedToken = newToken;
        break;
      
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid embed type' 
        });
    }

    await business.save();

    res.json({ 
      success: true, 
      message: 'Embed token regenerated successfully',
      data: {
        businessId: business._id,
        type,
        newToken
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to regenerate embed token', 
      error: error.message 
    });
  }
};

// Validate Embed Token
export const validateEmbedToken = async (req, res) => {
  try {
    const { businessId, token, type } = req.params;
    
    const business = await Business.findById(businessId);
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    let isValid = false;
    let embedData = null;
    
    switch (type) {
      case 'reviews':
        isValid = business.embedToken === token;
        if (isValid) {
          embedData = {
            businessId: business._id,
            businessName: business.businessName,
            type: 'reviews',
            features: business.features
          };
        }
        break;
      
      case 'subscription':
        isValid = business.subscriptionEmbedToken === token;
        if (isValid) {
          embedData = {
            businessId: business._id,
            businessName: business.businessName,
            type: 'subscription',
            features: business.features
          };
        }
        break;
      
      case 'boost':
        isValid = business.boostEmbedToken === token;
        if (isValid) {
          embedData = {
            businessId: business._id,
            businessName: business.businessName,
            type: 'boost',
            features: business.features
          };
        }
        break;
      
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid embed type' 
        });
    }

    res.json({ 
      success: true, 
      data: {
        isValid,
        embedData
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to validate embed token', 
      error: error.message 
    });
  }
}; 
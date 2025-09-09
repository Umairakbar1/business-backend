import Subscription from '../../models/admin/subscription.js';
import PaymentPlan from '../../models/admin/paymentPlan.js';
import Payment from '../../models/business/payment.js';
import Business from '../../models/business/business.js';
import BoostQueue from '../../models/business/boostQueue.js';
import StripeHelper from '../../helpers/stripeHelper.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { sendSubscriptionNotifications, sendPaymentNotifications } from '../../helpers/notificationHelper.js';

class BusinessSubscriptionController {
  /**
   * Helper function to clean up businessUrls array to remove invalid entries
   */
  static cleanBusinessUrls(business) {
    if (business.businessUrls && Array.isArray(business.businessUrls)) {
      business.businessUrls = business.businessUrls.filter(url => 
        url && 
        typeof url === 'object' && 
        url.label && 
        url.link && 
        typeof url.label === 'string' && 
        typeof url.link === 'string' &&
        url.label.trim() !== '' &&
        url.link.trim() !== ''
      );
    }
    return business;
  }

  /**
   * Helper function to safely update metadata without Mongoose Map issues
   */
  static safeUpdateMetadata(subscription, newMetadata) {
    // Safely extract current metadata without internal Mongoose properties
    let currentMetadata = {};
    
    if (subscription.metadata) {
      if (typeof subscription.metadata.toObject === 'function') {
        // It's a Mongoose Map, convert to plain object
        currentMetadata = subscription.metadata.toObject();
      } else if (typeof subscription.metadata === 'object') {
        // It's already a plain object, filter out internal properties
        currentMetadata = Object.keys(subscription.metadata)
          .filter(key => !key.startsWith('$'))
          .reduce((obj, key) => {
            obj[key] = subscription.metadata[key];
            return obj;
          }, {});
      }
    }
    
    // Merge with new metadata
    return {
      ...currentMetadata,
      ...newMetadata
    };
  }

  /**
   * Subscribe to a payment plan
   */
  static async subscribeToPlan(req, res) {
    try {
      const { businessId } = req.params;
      const { paymentPlanId } = req.body;

      console.log('=== SUBSCRIPTION DEBUG ===');
      console.log('Request method:', req.method);
      console.log('Request URL:', req.url);
      console.log('Request headers:', req.headers);
      console.log('Request body:', req.body);
      console.log('Request params:', req.params);
      console.log('Business ID from params:', businessId);
      console.log('Payment Plan ID from body:', paymentPlanId);
      console.log('Full body object:', JSON.stringify(req.body, null, 2));
      console.log('=== END DEBUG ===');

      // Validate required fields
      if (!paymentPlanId) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan ID is required',
          code: 'MISSING_PAYMENT_PLAN_ID'
        });
      }

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        console.log('Business not found:', businessId);
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found',
          code: 'BUSINESS_NOT_FOUND'
        });
      }

      // Clean up businessUrls to remove invalid entries before any operations
      BusinessSubscriptionController.cleanBusinessUrls(business);

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        console.log('Business ownership mismatch:', {
          businessOwner: business.businessOwner.toString(),
          tokenOwner: req.businessOwner._id.toString()
        });
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.',
          code: 'ACCESS_DENIED'
        });
      }

      console.log('Business found and ownership verified:', business.businessName);
      console.log('Business object fields:', {
        _id: business._id,
        businessName: business.businessName,
        businessOwner: business.businessOwner,
        owner: business.owner,
        email: business.email
      });

      // Validate required business fields
      if (!business.businessOwner) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business owner information is missing',
          code: 'MISSING_BUSINESS_OWNER'
        });
      }

      if (!business.email) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business email is missing',
          code: 'MISSING_BUSINESS_EMAIL'
        });
      }

      // Get payment plan
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        console.log('Payment plan not found:', paymentPlanId);
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan not found',
          code: 'PAYMENT_PLAN_NOT_FOUND'
        });
      }

      console.log('Payment plan found:', paymentPlan.name);

      if (!paymentPlan.isActive) {
        console.log('Payment plan is not active:', paymentPlan.name);
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan is not active',
          code: 'PAYMENT_PLAN_INACTIVE'
        });
      }

      // Check if business already has an active subscription of the same type
      const existingActiveSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: paymentPlan.planType,
        status: 'active'
      });

      if (existingActiveSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: `Business already has an active ${paymentPlan.planType} subscription`
        });
      }

      // Check if business already has a pending subscription of the same type
      const existingPendingSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: paymentPlan.planType,
        status: 'pending'
      });

      if (existingPendingSubscription) {
        // Update existing pending subscription instead of creating a new one
        console.log('Found existing pending subscription, updating:', existingPendingSubscription._id);
        
        // Update the existing subscription with new payment plan details
        existingPendingSubscription.paymentPlan = paymentPlanId;
        existingPendingSubscription.amount = paymentPlan.price;
        existingPendingSubscription.currency = paymentPlan.currency;
        existingPendingSubscription.features = paymentPlan.features || [];
        existingPendingSubscription.maxBoostPerDay = paymentPlan.maxBoostPerDay || 0;
        existingPendingSubscription.validityHours = paymentPlan.validityHours || null;
        existingPendingSubscription.metadata = {
          planName: paymentPlan.name,
          businessName: business.businessName,
          updatedAt: new Date().toISOString()
        };
        
        // Create new payment intent for the updated subscription
        let stripeCustomer;
        try {
          if (business.stripeCustomerId) {
            stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
          } else {
            stripeCustomer = await StripeHelper.createCustomer({
              email: business.email,
              name: business.businessName,
              businessId: business._id.toString(),
              userId: business.businessOwner.toString()
            });
            
            business.stripeCustomerId = stripeCustomer.id;
            await business.save();
          }
        } catch (error) {
          console.log('Error with existing Stripe customer, creating new one:', error.message);
          stripeCustomer = await StripeHelper.createCustomer({
            email: business.email,
            name: business.businessName,
            businessId: business._id.toString(),
            userId: business.businessOwner.toString()
          });
          
          business.stripeCustomerId = stripeCustomer.id;
          await business.save();
        }

        const paymentIntent = await StripeHelper.createPaymentIntent({
          amount: paymentPlan.price,
          currency: paymentPlan.currency,
          customerId: stripeCustomer.id,
          businessId: business._id.toString(),
          planType: paymentPlan.planType,
          planId: paymentPlanId,
          receiptEmail: business.email
        });

        existingPendingSubscription.paymentId = paymentIntent.id;
        existingPendingSubscription.stripeCustomerId = stripeCustomer.id;
        await existingPendingSubscription.save();

        return successResponseHelper(res, {
          success: true,
          message: 'Existing pending subscription updated. Please complete payment.',
          data: {
            subscription: existingPendingSubscription,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            isUpdated: true
          }
        });
      }

            // Create or get Stripe customer
      let stripeCustomer;
      try {
        if (business.stripeCustomerId) {
          stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
        } else {
          // Create new customer
          stripeCustomer = await StripeHelper.createCustomer({
            email: business.email,
            name: business.businessName,
            businessId: business._id.toString(),
            userId: business.businessOwner.toString()
          });
          
          // Update business with Stripe customer ID
          business.stripeCustomerId = stripeCustomer.id;
          await business.save();
        }
      } catch (error) {
        console.log('Error with existing Stripe customer, creating new one:', error.message);
        // Create new customer if retrieval fails
        stripeCustomer = await StripeHelper.createCustomer({
          email: business.email,
          name: business.businessName,
          businessId: business._id.toString(),
          userId: business.businessOwner.toString()
        });
        
        business.stripeCustomerId = stripeCustomer.id;
        await business.save();
      }

      console.log('Creating Stripe payment intent with:', {
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        customerId: stripeCustomer.id,
        businessId: business._id.toString(),
        planType: paymentPlan.planType,
        planId: paymentPlanId
      });

      // Create payment intent for one-time payment
      const paymentIntent = await StripeHelper.createPaymentIntent({
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        customerId: stripeCustomer.id,
        businessId: business._id.toString(),
        planType: paymentPlan.planType,
        planId: paymentPlanId,
        receiptEmail: business.email
      });

      console.log('Payment intent created successfully:', paymentIntent.id);

      console.log('Creating subscription in database with:', {
        business: businessId,
        paymentPlan: paymentPlanId,
        subscriptionType: paymentPlan.planType,
        stripeCustomerId: stripeCustomer.id,
        amount: paymentPlan.price,
        currency: paymentPlan.currency
      });

      // Create subscription in database with pending status
      const subscription = new Subscription({
        business: businessId,
        paymentPlan: paymentPlanId,
        subscriptionType: paymentPlan.planType,
        stripeCustomerId: stripeCustomer.id,
        status: 'pending', // Set to pending initially
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        isLifetime: paymentPlan.planType === 'business', // Business plans are lifetime
        expiresAt: paymentPlan.planType === 'boost' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // Boost plans expire in 24 hours
        paymentId: paymentIntent.id, // Use payment intent ID as payment ID
        features: paymentPlan.features || [], // Include features from payment plan
        maxBoostPerDay: paymentPlan.maxBoostPerDay || 0, // Include max boost per day
        validityHours: paymentPlan.validityHours || null, // Include validity hours for boost plans
        metadata: {
          planName: paymentPlan.name,
          businessName: business.businessName
        }
      });

      await subscription.save();
      console.log('Subscription saved successfully:', subscription._id);

      // Create Payment record with invoice number for pending payment
      let paymentRecord = null;
      try {
        paymentRecord = await Payment.create({
          businessId: businessId,
          paymentPlanId: paymentPlanId,
          subscriptionId: subscription._id,
          planType: paymentPlan.planType,
          paymentType: paymentPlan.planType,
          status: 'pending',
          amount: paymentPlan.price,
          currency: paymentPlan.currency,
          discount: 0,
          finalAmount: paymentPlan.price,
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: stripeCustomer.id,
          paymentMethod: 'card',
          businessName: business.businessName,
          businessEmail: business.email,
          planName: paymentPlan.name,
          planDescription: paymentPlan.description || 'Subscription Plan',
          features: paymentPlan.features || [],
          maxBoostPerDay: paymentPlan.maxBoostPerDay || 0,
          validityHours: paymentPlan.validityHours || null,
          notes: 'Payment pending - subscription created'
        });

        console.log('Payment record created with invoice number:', paymentRecord.invoiceNumber);
      } catch (paymentError) {
        console.error('Failed to create payment record:', paymentError);
        // Don't fail the main operation if payment record creation fails
      }

      return successResponseHelper(res, {
        success: true,
        message: 'Subscription created successfully. Please complete payment.',
        data: {
          subscription,
          payment: paymentRecord ? {
            invoiceNumber: paymentRecord.invoiceNumber,
            amount: paymentRecord.amount,
            currency: paymentRecord.currency,
            status: paymentRecord.status
          } : null,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        }
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to create subscription',
        error: error.message
      });
    }
  }

  /**
   * Upgrade business plan
   */
  static async upgradeBusinessPlan(req, res) {
    try {
      const { businessId } = req.params;
      const { newPaymentPlanId } = req.body;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Get new payment plan
      const newPaymentPlan = await PaymentPlan.findById(newPaymentPlanId);
      if (!newPaymentPlan) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan not found'
        });
      }

      if (newPaymentPlan.planType !== 'business') {
        return errorResponseHelper(res, {
          success: false,
          message: 'Can only upgrade to business plans'
        });
      }

      // Check if business has an active business subscription
      const currentSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      });

      if (!currentSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No active business subscription found to upgrade'
        });
      }

      // Create payment intent for upgrade
      const paymentIntent = await StripeHelper.createPaymentIntent({
        amount: newPaymentPlan.price,
        currency: newPaymentPlan.currency,
        customerId: currentSubscription.stripeCustomerId,
        businessId: business._id.toString(),
        planType: 'business'
      });

      // Create new subscription (will replace old one after payment)
      const newSubscription = new Subscription({
        business: businessId,
        paymentPlan: newPaymentPlanId,
        subscriptionType: 'business',
        stripeCustomerId: currentSubscription.stripeCustomerId,
        status: 'inactive',
        amount: newPaymentPlan.price,
        currency: newPaymentPlan.currency,
        isLifetime: true,
        metadata: {
          planName: newPaymentPlan.name,
          businessName: business.businessName,
          upgradeFrom: currentSubscription.paymentPlan.toString()
        }
      });

      await newSubscription.save();

        successResponseHelper(res, {
        success: true,
        message: 'Business plan upgrade initiated. Please complete payment.',
        data: {
          currentSubscription,
          newSubscription,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        }
      });
    } catch (error) {
      console.error('Error upgrading business plan:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to upgrade business plan',
        error: error.message
      });
    }
  }

  /**
   * Get business subscriptions
   */
  static async getBusinessSubscriptions(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      const subscriptions = await Subscription.find({ business: businessId })
        .populate('paymentPlan', 'name planType price features maxBusinesses maxReviews maxBoostPerDay')
        .sort({ createdAt: -1 });

      // Separate business and boost subscriptions
      const businessSubscriptions = subscriptions.filter(sub => sub.subscriptionType === 'business');
      const boostSubscriptions = subscriptions.filter(sub => sub.subscriptionType === 'boost');

          successResponseHelper(res, {
        success: true,
        message: 'Business subscriptions retrieved successfully',
        data: {
          business: businessSubscriptions,
          boost: boostSubscriptions,
          all: subscriptions
        }
      });
    } catch (error) {
      console.error('Error fetching business subscriptions:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch business subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Get all business subscriptions with populated business data
   */
  static async getAllBusinessSubscriptionsWithBusiness(req, res) {
    try {
      // Get the business owner ID from the authenticated user
      const businessOwnerId = req.businessOwner?._id || req.user?._id;
      
      if (!businessOwnerId) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Extract query parameters for pagination, sorting, and filtering
      const {
        page = 1,
        limit = 10,
        queryText,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        planType
      } = req.query;

      // Validate and calculate pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      // Ensure valid pagination values
      const validPage = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
      const validLimit = isNaN(limitNum) || limitNum < 1 ? 10 : Math.min(limitNum, 100); // Max 100 items per page
      const skip = (validPage - 1) * validLimit;

      // Build business filter
      const businessFilter = { businessOwner: businessOwnerId };
      
      // Add business search if queryText is provided - search in name, category, and type
      if (queryText && queryText.trim() !== '' && queryText !== 'null' && queryText !== 'undefined') {
        businessFilter.$or = [
          { businessName: { $regex: queryText.trim(), $options: 'i' } },
          { businessCategory: { $regex: queryText.trim(), $options: 'i' } },
          { businessType: { $regex: queryText.trim(), $options: 'i' } }
        ];
      }

      // Find businesses owned by this user with search filter
      const businesses = await Business.find(businessFilter)
        .select('_id businessName businessCategory businessType status createdAt');

      if (businesses.length === 0) {
        return errorResponseHelper(res, {
          success: true,
          message: 'No businesses found for this user',
          data: {
            subscriptions: [],
            businesses: [],
            totalSubscriptions: 0,
            pagination: {
              currentPage: validPage,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: validLimit
            }
          }
        });
      }

      const businessIds = businesses.map(b => b._id);

      // Build subscription filter
      const subscriptionFilter = { business: { $in: businessIds } };
      
      // Force only business plan subscriptions on this endpoint
      subscriptionFilter.subscriptionType = 'business';
      
      // Add status filter if provided (ignore empty/null/'all')
      if (
        status &&
        status.trim() !== '' &&
        status !== 'null' &&
        status !== 'undefined' &&
        status.toLowerCase() !== 'all'
      ) {
        subscriptionFilter.status = status.trim();
      }

      // NOTE: planType is intentionally ignored here to always return only business subscriptions

      // Build sort object
      const sort = {};
      if (sortBy && sortBy.trim() !== '' && sortBy !== 'null' && sortBy !== 'undefined') {
        // Validate sortBy field
        const allowedSortFields = ['createdAt', 'updatedAt', 'status', 'amount', 'subscriptionType'];
        if (allowedSortFields.includes(sortBy.trim())) {
          sort[sortBy.trim()] = sortOrder === 'desc' ? -1 : 1;
        } else {
          // Default to createdAt if invalid sortBy
          sort.createdAt = sortOrder === 'desc' ? -1 : 1;
        }
      } else {
        // Default sorting by latest/newest
        sort.createdAt = sortOrder === 'desc' ? -1 : 1;
      }

      // Debug: Check what subscriptions exist before filtering
      const allSubscriptionsBeforeFilter = await Subscription.find({ business: { $in: businessIds } })
        .populate('business', 'businessName')
        .select('subscriptionType status business');
      
      console.log('🔍 getAllBusinessSubscriptionsWithBusiness - All subscriptions before filter:', {
        total: allSubscriptionsBeforeFilter.length,
        byType: {
          business: allSubscriptionsBeforeFilter.filter(s => s.subscriptionType === 'business').length,
          boost: allSubscriptionsBeforeFilter.filter(s => s.subscriptionType === 'boost').length
        },
        byStatus: {
          active: allSubscriptionsBeforeFilter.filter(s => s.status === 'active').length,
          expired: allSubscriptionsBeforeFilter.filter(s => s.status === 'expired').length,
          cancelled: allSubscriptionsBeforeFilter.filter(s => s.status === 'cancelled').length,
          inactive: allSubscriptionsBeforeFilter.filter(s => s.status === 'inactive').length
        }
      });

      // Get total count for pagination
      const totalSubscriptions = await Subscription.countDocuments(subscriptionFilter);

      // Find subscriptions with pagination, sorting, and filtering
      const subscriptions = await Subscription.find(subscriptionFilter)
        .populate('business', 'businessName businessCategory businessType status businessLogo businessAddress businessOwner')
        .populate('paymentPlan', 'name planType price features maxBusinesses maxReviews maxBoostPerDay validityDays description')
        .sort(sort)
        .skip(skip)
        .limit(validLimit);

      // Debug logging
      console.log('🔍 getAllBusinessSubscriptionsWithBusiness - Query params:', {
        page: validPage,
        limit: validLimit,
        queryText: queryText || 'none',
        status: status || 'none',
        planType: planType || 'none',
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      });
      console.log('📊 getAllBusinessSubscriptionsWithBusiness - Pagination:', {
        skip,
        totalSubscriptions,
        returnedSubscriptions: subscriptions.length
      });
      console.log('🔍 getAllBusinessSubscriptionsWithBusiness - Filters:', {
        businessFilter,
        subscriptionFilter,
        sort
      });
      
      // Debug: Check subscription types
      const subscriptionTypes = subscriptions.map(sub => sub.subscriptionType);
      console.log('📋 getAllBusinessSubscriptionsWithBusiness - Subscription types found:', {
        total: subscriptions.length,
        types: [...new Set(subscriptionTypes)],
        businessCount: subscriptionTypes.filter(t => t === 'business').length,
        boostCount: subscriptionTypes.filter(t => t === 'boost').length
      });

      // Separate subscriptions by type and business
      const organizedData = businesses.map(business => {
        const businessSubscriptions = subscriptions.filter(sub => 
          sub.business._id.toString() === business._id.toString()
        );

        const businessPlanSubscriptions = businessSubscriptions.filter(sub => 
          sub.subscriptionType === 'business'
        );
        
        const boostSubscriptions = businessSubscriptions.filter(sub => 
          sub.subscriptionType === 'boost'
        );

        const activeBusinessPlan = businessPlanSubscriptions.find(sub => 
          sub.status === 'active'
        );
        
        const activeBoostPlan = boostSubscriptions.find(sub => 
          sub.status === 'active'
        );

        return {
          business: {
            _id: business._id,
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            businessType: business.businessType,
            status: business.status,
            createdAt: business.createdAt
          },
          subscriptions: {
            business: businessPlanSubscriptions,
            boost: boostSubscriptions,
            all: businessSubscriptions
          },
          currentPlans: {
            businessPlan: activeBusinessPlan,
            boostPlan: activeBoostPlan
          },
          subscriptionCount: businessSubscriptions.length,
          hasActiveBusinessPlan: !!activeBusinessPlan,
          hasActiveBoostPlan: !!activeBoostPlan
        };
      });

      successResponseHelper(res, {
        success: true,
        message: 'All subscriptions with businesses retrieved successfully',
        data: {
          businesses: organizedData,
          subscriptions,
          totalSubscriptions,
          pagination: {
            currentPage: validPage,
            totalPages: Math.ceil(totalSubscriptions / validLimit),
            totalItems: totalSubscriptions,
            itemsPerPage: validLimit
          }
        }
      });
    } catch (error) {
      console.error('Error in getAllBusinessSubscriptionsWithBusiness:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch subscriptions with businesses',
        error: error.message
      });
    }
  }

  /**
   * Get active business plan
   */
  static async getActiveBusinessPlan(req, res) {
    try {
      const { businessId } = req.params;

      const activeSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews');

      if (!activeSubscription) {
        return errorResponseHelper(res, {
          success: true,
          hasActivePlan: false,
          message: 'No active business plan found'
        });
      }

        successResponseHelper(res, {
        success: true,
        hasActivePlan: true,
        data: activeSubscription
      });
    } catch (error) {
      console.error('Error fetching active business plan:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch active business plan',
        error: error.message
      });
    }
  }

  /**
   * Get active boost plan
   */
  static async getActiveBoostPlan(req, res) {
    try {
      const { businessId } = req.params;

      const activeSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay');

      if (!activeSubscription) {
        return errorResponseHelper(res, {
          success: true,
          hasActivePlan: false,
          message: 'No active boost plan found'
        });
      }

      // Check if boost plan is expired
      const isExpired = activeSubscription.expiresAt && new Date() > activeSubscription.expiresAt;
      if (isExpired) {
        activeSubscription.status = 'inactive';
        await activeSubscription.save();
        
        return errorResponseHelper(res, {
          success: true,
          hasActivePlan: false,
          message: 'Boost plan has expired'
        });
      }

        successResponseHelper(res, {
        success: true,
        hasActivePlan: true,
        data: activeSubscription
      });
    } catch (error) {
      console.error('Error fetching active boost plan:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch active boost plan',
        error: error.message
      });
    }
  }

  /**
   * Check if business can use boost
   */
  static async checkBoostAvailability(req, res) {
    try {
      const { businessId } = req.params;

      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan');

      if (!boostSubscription) {
        return errorResponseHelper(res, {
          success: true,
          canUseBoost: false,
          message: 'No active boost subscription found'
        });
      }

      // Check if expired
      if (boostSubscription.expiresAt && new Date() > boostSubscription.expiresAt) {
        boostSubscription.status = 'inactive';
        await boostSubscription.save();
        
        return errorResponseHelper(res, {
          success: true,
          canUseBoost: false,
          message: 'Boost plan has expired'
        });
      }

      // Check if boost is available (daily limit)
      const now = new Date();
      const lastReset = new Date(boostSubscription.boostUsage.lastResetDate);
      const currentDay = now.getDate();
      const lastResetDay = lastReset.getDate();
      
      // Reset counter if new day
      if (currentDay !== lastResetDay || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        boostSubscription.boostUsage.currentDay = 0;
        boostSubscription.boostUsage.lastResetDate = now;
        await boostSubscription.save();
      }
      
      const maxBoosts = boostSubscription.paymentPlan.maxBoostPerDay || 0;
      const canUse = boostSubscription.boostUsage.currentDay < maxBoosts;

          successResponseHelper(res, {
        success: true,
        canUseBoost: canUse,
        data: {
          currentUsage: boostSubscription.boostUsage.currentDay,
          maxBoosts: maxBoosts,
          resetDate: boostSubscription.boostUsage.lastResetDate,
          expiresAt: boostSubscription.expiresAt
        }
      });
    } catch (error) {
      console.error('Error checking boost availability:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to check boost availability',
        error: error.message
      });
    }
  }

  /**
   * Use boost
   */
  static async useBoost(req, res) {
    try {
      const { businessId } = req.params;

      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      });

      if (!boostSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No active boost subscription found'
        });
      }

      // Check if expired
      if (boostSubscription.expiresAt && new Date() > boostSubscription.expiresAt) {
        boostSubscription.status = 'inactive';
        await boostSubscription.save();
        
        return errorResponseHelper(res, {
          success: false,
          message: 'Boost plan has expired'
        });
      }

      // Check if boost is available (daily limit)
      const now = new Date();
      const lastReset = new Date(boostSubscription.boostUsage.lastResetDate);
      const currentDay = now.getDate();
      const lastResetDay = lastReset.getDate();
      
      // Reset counter if new day
      if (currentDay !== lastResetDay || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        boostSubscription.boostUsage.currentDay = 0;
        boostSubscription.boostUsage.lastResetDate = now;
        await boostSubscription.save();
      }
      
      const maxBoosts = boostSubscription.paymentPlan.maxBoostPerDay || 0;
      const canUse = boostSubscription.boostUsage.currentDay < maxBoosts;
      
      if (!canUse) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Daily boost limit reached'
        });
      }

      await boostSubscription.incrementBoostUsage();

        successResponseHelper(res, {
        success: true,
        message: 'Boost used successfully',
        data: {
          currentUsage: boostSubscription.boostUsage.currentDay,
          maxBoosts: boostSubscription.paymentPlan.maxBoostPerDay
        }
      });
    } catch (error) {
      console.error('Error using boost:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to use boost',
        error: error.message
      });
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(req, res) {
    try {
      const { businessId, subscriptionId } = req.params;

      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        business: businessId
      });

      if (!subscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Subscription not found'
        });
      }

      subscription.status = 'inactive';
      await subscription.save();

        successResponseHelper(res, {
        success: true,
        message: 'Subscription canceled successfully',
        data: subscription
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to cancel subscription',
        error: error.message
      });
    }
  }

  /**
   * Get available payment plans
   */
  static async getAvailablePlans(req, res) {
    try {
      const { businessId } = req.params;
      const { planType } = req.query;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      const filter = { isActive: true };
      if (planType) filter.planType = planType;

      const paymentPlans = await PaymentPlan.find(filter)
        .sort({ sortOrder: 1, price: 1 });

      // Get current subscriptions to show upgrade options
      const currentSubscriptions = await Subscription.find({
        business: businessId,
        status: 'active'
      }).populate('paymentPlan', 'name planType price');

          successResponseHelper(res, {
        success: true,
        message: 'Available payment plans retrieved successfully',
        data: {
          plans: paymentPlans,
          currentSubscriptions
        }
      });
    } catch (error) {
      console.error('Error fetching available plans:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch available plans',
        error: error.message
      });
    }
  }

  /**
   * Get all business payment plans
   */
  static async getAllBusinessPaymentPlans(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Get all active business payment plans
      const businessPlans = await PaymentPlan.find({
        planType: 'business',
        isActive: true
      }).sort({ sortOrder: 1, price: 1 });

      // Get current business subscription if any
      const currentBusinessSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews');

      // Get all business subscriptions for this business
      const allBusinessSubscriptions = await Subscription.find({
        business: businessId,
        subscriptionType: 'business'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews')
        .sort({ createdAt: -1 });

          successResponseHelper(res, {
        success: true,
        message: 'Business payment plans retrieved successfully',
        data: {
          plans: businessPlans,
          currentSubscription: currentBusinessSubscription,
          allSubscriptions: allBusinessSubscriptions,
          totalPlans: businessPlans.length
        }
      });
    } catch (error) {
      console.error('Error fetching business payment plans:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch business payment plans',
        error: error.message
      });
    }
  }

  /**
   * Get all boost payment plans
   */
  static async getAllBoostPaymentPlans(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Get all active boost payment plans
      const boostPlans = await PaymentPlan.find({
        planType: 'boost',
        isActive: true
      }).sort({ sortOrder: 1, price: 1 });

      // Get current boost subscription if any
      const currentBoostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay');

      // Get all boost subscriptions for this business
      const allBoostSubscriptions = await Subscription.find({
        business: businessId,
        subscriptionType: 'boost'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay')
        .sort({ createdAt: -1 });

      // Check if any boost plans are available for purchase
      const availablePlans = boostPlans.map(plan => {
        const planObj = plan.toObject();
        
        // Check if this plan is currently active for the business
        const isCurrentlyActive = currentBoostSubscription && 
          currentBoostSubscription.paymentPlan._id.toString() === plan._id.toString();
        
        // Check if plan is expired
        const isExpired = currentBoostSubscription && 
          currentBoostSubscription.expiresAt && 
          new Date() > currentBoostSubscription.expiresAt;

        return {
          ...planObj,
          isCurrentlyActive,
          isExpired,
          canPurchase: !isCurrentlyActive || isExpired
        };
      });

            successResponseHelper(res, {
        success: true,
        message: 'Boost payment plans retrieved successfully',
        data: {
          plans: availablePlans,
          currentSubscription: currentBoostSubscription,
          allSubscriptions: allBoostSubscriptions,
          totalPlans: boostPlans.length,
          hasActiveBoost: !!currentBoostSubscription && 
            (!currentBoostSubscription.expiresAt || new Date() <= currentBoostSubscription.expiresAt)
        }
      });
    } catch (error) {
      console.error('Error fetching boost payment plans:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch boost payment plans',
        error: error.message
      });
    }
  }

  /**
   * Get all payment plans (both business and boost)
   */
  static async getAllPaymentPlans(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Get all active payment plans
      const allPlans = await PaymentPlan.find({ isActive: true })
        .sort({ planType: 1, sortOrder: 1, price: 1 });

      // Separate plans by type
      const businessPlans = allPlans.filter(plan => plan.planType === 'business');
      const boostPlans = allPlans.filter(plan => plan.planType === 'boost');

      // Get current subscriptions
      const currentBusinessSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews');

      const currentBoostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay');

      // Get all subscriptions for this business
      const allSubscriptions = await Subscription.find({
        business: businessId
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews maxBoostPerDay')
        .sort({ createdAt: -1 });

      successResponseHelper(res, {
        success: true,
        message: 'All payment plans retrieved successfully',
        data: {
          business: {
            plans: businessPlans,
            currentSubscription: currentBusinessSubscription,
            totalPlans: businessPlans.length
          },
          boost: {
            plans: boostPlans,
            currentSubscription: currentBoostSubscription,
            totalPlans: boostPlans.length
          },
          allSubscriptions,
          summary: {
            totalPlans: allPlans.length,
            hasActiveBusinessPlan: !!currentBusinessSubscription,
            hasActiveBoostPlan: !!currentBoostSubscription && 
              (!currentBoostSubscription.expiresAt || new Date() <= currentBoostSubscription.expiresAt)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all payment plans:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch all payment plans',
        error: error.message
      });
    }
  }

  /**
   * Confirm payment success (called from frontend after successful payment)
   */
  static async confirmPayment(req, res) {
    try {
      const { businessId, subscriptionId, paymentIntentId } = req.body;

      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        business: businessId
      });

      if (!subscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Subscription not found'
        });
      }

      // Verify payment intent with Stripe
      try {
        const paymentIntent = await StripeHelper.getPaymentIntent(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          subscription.status = 'active';
          await subscription.save();

          successResponseHelper(res, {
            success: true,
            message: 'Payment confirmed and subscription activated',
            data: subscription
          });
        } else {
          errorResponseHelper(res, {
            success: false,
            message: 'Payment not completed successfully'
          });
        }
      } catch (stripeError) {
        console.error('Stripe verification error:', stripeError);
        errorResponseHelper(res, {
          success: false,
          message: 'Failed to verify payment with Stripe'
        });
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to confirm payment',
        error: error.message
      });
    }
  }

  /**
   * Get all business plan subscriptions with populated business data
   */
  static async getAllBusinessPlanSubscriptions(req, res) {
    try {
      // Get the business owner ID from the authenticated user
      const businessOwnerId = req.businessOwner?._id || req.user?._id;
      const { page = 1, limit = 10, queryText, status, sort = 'createdAt', sortBy = 'desc', startDate, endDate } = req.query;
      
      if (!businessOwnerId) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Build business query with filters
      const businessQuery = { businessOwner: businessOwnerId };
      
      if (queryText) {
        businessQuery.$or = [
          { businessName: { $regex: queryText, $options: 'i' } },
          { businessCategory: { $regex: queryText, $options: 'i' } },
          { businessType: { $regex: queryText, $options: 'i' } }
        ];
      }

      if (status) {
        businessQuery.status = status;
      }

      // Build subscription query with filters
      const subscriptionQuery = { 
        business: { $in: [] }, // Will be populated after getting businesses
        subscriptionType: 'business'
      };

      if (startDate || endDate) {
        subscriptionQuery.createdAt = {};
        if (startDate) {
          subscriptionQuery.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          subscriptionQuery.createdAt.$lte = new Date(endDate);
        }
      }

      // Find all businesses owned by this user with filters
      const businesses = await Business.find(businessQuery)
        .select('_id businessName businessCategory businessType status createdAt businessLogo businessAddress');

      if (businesses.length === 0) {
        return errorResponseHelper(res, {
          success: true,
          message: 'No businesses found for this user',
          data: {
            businesses: [],
            allSubscriptions: [],
            summary: {
              totalBusinesses: 0,
              totalSubscriptions: 0,
              totalActiveSubscriptions: 0,
              totalExpiredSubscriptions: 0,
              totalInactiveSubscriptions: 0
            },
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      }

      const businessIds = businesses.map(b => b._id);
      subscriptionQuery.business.$in = businessIds;

      // Apply pagination to subscriptions
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sortObj = {};
      sortObj[sort] = sortBy === 'desc' ? -1 : 1;

      // Get total count for pagination
      const totalSubscriptions = await Subscription.countDocuments(subscriptionQuery);

      // Find all business plan subscriptions for these businesses with populated data and pagination
      const allSubscriptions = await Subscription.find(subscriptionQuery)
        .populate('business', 'businessName businessCategory businessType status businessLogo businessAddress businessOwner')
        .populate('paymentPlan', 'name planType price features maxBusinesses maxReviews validityDays description')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      // Organize data by business with their subscriptions
      const organizedData = businesses.map(business => {
        const businessSubscriptions = allSubscriptions.filter(sub => 
          sub.business._id.toString() === business._id.toString()
        );

        const activeSubscriptions = businessSubscriptions.filter(sub => 
          sub.status === 'active'
        );
        
        const expiredSubscriptions = businessSubscriptions.filter(sub => 
          sub.status === 'expired' || (sub.expiresAt && new Date() > sub.expiresAt)
        );

        const inactiveSubscriptions = businessSubscriptions.filter(sub => 
          sub.status === 'inactive'
        );

        return {
          business: {
            _id: business._id,
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            businessType: business.businessType,
            status: business.status,
            createdAt: business.createdAt,
            businessLogo: business.businessLogo,
            businessAddress: business.businessAddress
          },
          subscriptions: businessSubscriptions,
          subscriptionCount: businessSubscriptions.length,
          activeSubscriptions: activeSubscriptions,
          expiredSubscriptions: expiredSubscriptions,
          inactiveSubscriptions: inactiveSubscriptions,
          hasActiveSubscription: activeSubscriptions.length > 0,
          currentActiveSubscription: activeSubscriptions[0] || null
        };
      });

      // Calculate summary statistics
      const totalActiveSubscriptions = allSubscriptions.filter(sub => sub.status === 'active').length;
      const totalExpiredSubscriptions = allSubscriptions.filter(sub => 
        sub.status === 'expired' || (sub.expiresAt && new Date() > sub.expiresAt)
      ).length;
      const totalInactiveSubscriptions = allSubscriptions.filter(sub => sub.status === 'inactive').length;

      successResponseHelper(res, {
        success: true,
        message: 'All business plan subscriptions retrieved successfully',
        data: {
          businesses: organizedData,
          allSubscriptions: allSubscriptions, // All subscriptions in one array
          summary: {
            totalBusinesses: businesses.length,
            totalSubscriptions: allSubscriptions.length,
            totalActiveSubscriptions,
            totalExpiredSubscriptions,
            totalInactiveSubscriptions,
            averageSubscriptionsPerBusiness: businesses.length > 0 ? (allSubscriptions.length / businesses.length).toFixed(2) : 0
          },
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalSubscriptions / limitNum),
            totalItems: totalSubscriptions,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < Math.ceil(totalSubscriptions / limitNum),
            hasPrevPage: pageNum > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all business plan subscriptions:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch all business plan subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Get all boost subscriptions with populated business data
   */
  static async getAllBoostSubscriptions(req, res) {
    try {
      // Get the business owner ID from the authenticated user
      const businessOwnerId = req.businessOwner?._id || req.user?._id;
      // Normalize query params: treat "null", "undefined", empty string, or missing as undefined
      const normalize = (val) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return undefined;
          return trimmed;
        }
        return val;
      };

      const raw = req.query || {};
      const page = parseInt(normalize(raw.page)) || 1;
      const limit = parseInt(normalize(raw.limit)) || 10;
      const queryText = normalize(raw.queryText);
      const status = normalize(raw.status);
      const sort = normalize(raw.sort) || 'createdAt';
      const sortBy = normalize(raw.sortBy) || 'desc';
      const startDate = normalize(raw.startDate);
      const endDate = normalize(raw.endDate);
      
      if (!businessOwnerId) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Unauthorized access'
        });
      }

      // First, get all businesses owned by this user (no filters yet)
      const allBusinesses = await Business.find({ businessOwner: businessOwnerId })
        .select('_id businessName businessCategory businessType status createdAt businessLogo businessAddress businessOwner');

      if (allBusinesses.length === 0) {
        return errorResponseHelper(res, {
          success: true,
          message: 'No businesses found for this user',
          data: {
            businesses: [],
            allSubscriptions: [],
            summary: {
              totalBusinesses: 0,
              totalSubscriptions: 0,
              totalActiveSubscriptions: 0,
              totalExpiredSubscriptions: 0
            },
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      }

      const allBusinessIds = allBusinesses.map(b => b._id);

      // Build subscription query with filters
      const subscriptionQuery = { 
        business: { $in: allBusinessIds },
        subscriptionType: 'boost'
      };

      // Apply status filter to subscriptions - handle null, empty, and valid status values
      if (status && status !== null && status !== 'null' && status !== '' && status !== 'all') {
        subscriptionQuery.status = status.trim();
      }

      if (startDate || endDate) {
        subscriptionQuery.createdAt = {};
        if (startDate) subscriptionQuery.createdAt.$gte = new Date(startDate);
        if (endDate) subscriptionQuery.createdAt.$lte = new Date(endDate);
      }

      // Apply pagination to subscriptions
      const pageNum = page;
      const limitNum = limit;
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sortObj = {};
      sortObj[sort] = sortBy === 'desc' ? -1 : 1;

      // Get total count for pagination
      const totalSubscriptions = await Subscription.countDocuments(subscriptionQuery);

      // Find all boost subscriptions for these businesses with populated data and pagination
      const allSubscriptions = await Subscription.find(subscriptionQuery)
        .populate('business', 'businessName businessCategory businessType status businessLogo businessAddress businessOwner createdAt')
        .populate('paymentPlan', 'name planType price features maxBoostPerDay validityDays description')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      // Apply queryText filter to subscriptions if provided
      let filteredSubscriptions = allSubscriptions;
      if (queryText && queryText.trim() !== '') {
        filteredSubscriptions = allSubscriptions.filter(subscription => {
          const business = subscription.business;
          if (!business) return false;
          
          const searchText = queryText.toLowerCase();
          return (
            (business.businessName && business.businessName.toLowerCase().includes(searchText)) ||
            (business.businessCategory && business.businessCategory.toLowerCase().includes(searchText)) ||
            (business.businessType && business.businessType.toLowerCase().includes(searchText))
          );
        });
      }

      // Get unique businesses from filtered subscriptions
      const businessIdsFromSubscriptions = [...new Set(filteredSubscriptions.map(sub => sub.business._id.toString()))];
      const businesses = allBusinesses.filter(business => 
        businessIdsFromSubscriptions.includes(business._id.toString())
      );

      // Organize data by business with their boost subscriptions
      const organizedData = businesses.map(business => {
        const businessBoostSubscriptions = filteredSubscriptions.filter(sub => 
          sub.business._id.toString() === business._id.toString()
        );

        const activeBoostSubscriptions = businessBoostSubscriptions.filter(sub => 
          sub.status === 'active'
        );

        const pendingBoostSubscriptions = businessBoostSubscriptions.filter(sub => 
          sub.status === 'pending'
        );

        const cancelledBoostSubscriptions = businessBoostSubscriptions.filter(sub => 
          sub.status === 'cancelled'
        );
        const expiredBoostSubscriptions = businessBoostSubscriptions.filter(sub => 
          sub.status === 'expired' || (sub.expiresAt && new Date() > sub.expiresAt)
        );


        const inactiveBoostSubscriptions = businessBoostSubscriptions.filter(sub => 
          sub.status === 'inactive'
        );

        return {
          business: {
            _id: business._id,
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            businessType: business.businessType,
            status: business.status,
            createdAt: business.createdAt,
            businessLogo: business.businessLogo,
            businessAddress: business.businessAddress
          },
          boostSubscriptions: businessBoostSubscriptions,
          subscriptionCount: businessBoostSubscriptions.length,
          activeBoostSubscriptions: activeBoostSubscriptions,
          pendingBoostSubscriptions: pendingBoostSubscriptions,
          cancelledBoostSubscriptions: cancelledBoostSubscriptions,
          expiredBoostSubscriptions: expiredBoostSubscriptions,
          inactiveBoostSubscriptions: inactiveBoostSubscriptions,
          hasActiveBoostSubscription: activeBoostSubscriptions.length > 0,
          currentActiveBoostSubscription: activeBoostSubscriptions[0] || null
        };
      });

      // Calculate summary statistics based on filtered subscriptions
      const totalActiveBoostSubscriptions = filteredSubscriptions.filter(sub => sub.status === 'active').length;
      const totalPendingBoostSubscriptions = filteredSubscriptions.filter(sub => sub.status === 'pending').length;
      const totalCancelledBoostSubscriptions = filteredSubscriptions.filter(sub => sub.status === 'cancelled').length;

      const totalExpiredBoostSubscriptions = filteredSubscriptions.filter(sub => 
        sub.status === 'expired' || (sub.expiresAt && new Date() > sub.expiresAt)
      ).length;
      const totalInactiveBoostSubscriptions = filteredSubscriptions.filter(sub => sub.status === 'inactive').length;

      successResponseHelper(res, {
        success: true,
        message: 'All boost subscriptions retrieved successfully',
        data: {
          businesses: organizedData,
          allSubscriptions: filteredSubscriptions, // Filtered boost subscriptions in one array
          summary: {
            totalBusinesses: businesses.length,
            totalSubscriptions: filteredSubscriptions.length,
            totalActiveBoostSubscriptions: totalActiveBoostSubscriptions,
            totalPendingBoostSubscriptions: totalPendingBoostSubscriptions,
            totalCancelledBoostSubscriptions: totalCancelledBoostSubscriptions,
            totalExpiredBoostSubscriptions: totalExpiredBoostSubscriptions,
            totalInactiveBoostSubscriptions: totalInactiveBoostSubscriptions,
            averageBoostSubscriptionsPerBusiness: businesses.length > 0 ? (filteredSubscriptions.length / businesses.length).toFixed(2) : 0
          },
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(filteredSubscriptions.length / limitNum),
            totalItems: filteredSubscriptions.length,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < Math.ceil(filteredSubscriptions.length / limitNum),
            hasPrevPage: pageNum > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all boost subscriptions:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch all boost subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Get business subscription details with plan information
   */
  static async getBusinessSubscriptionDetails(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Get active subscription with populated plan details
      let subscriptionDetails = null;
      if (business.activeSubscriptionId) {
        const subscription = await Subscription.findById(business.activeSubscriptionId)
          .populate('paymentPlan', 'name description planType price features maxBoostPerDay validityHours');
        
        if (subscription) {
          subscriptionDetails = {
            _id: subscription._id,
            subscriptionType: subscription.subscriptionType,
            status: subscription.status,
            amount: subscription.amount,
            currency: subscription.currency,
            createdAt: subscription.createdAt,
            expiresAt: subscription.expiresAt,
            isLifetime: subscription.isLifetime,
            plan: subscription.paymentPlan,
            boostUsage: subscription.boostUsage,
            maxBoostPerDay: subscription.maxBoostPerDay
          };
        }
      }

      successResponseHelper(res, {
        success: true,
        message: 'Business subscription details retrieved successfully',
        data: {
          business: {
            _id: business._id,
            businessName: business.businessName,
            isBoosted: business.isBoosted,
            boostExpiryAt: business.boostExpiryAt,
            activeSubscriptionId: business.activeSubscriptionId
          },
          subscription: subscriptionDetails
        }
      });
    } catch (error) {
      console.error('Error fetching business subscription details:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch business subscription details',
        error: error.message
      });
    }
  }

  /**
   * Handle boost expiry and update business status
   */
  static async handleBoostExpiry(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Check if boost has expired
      if (business.isBoosted && business.boostExpiryAt && new Date() > business.boostExpiryAt) {
        // Update business boost status - remove all boost references
        business.isBoosted = false;
        business.isBoostActive = false;
        business.boostExpiryAt = null;
        business.boostSubscriptionId = null;
        // Keep activeSubscriptionId if there's a business subscription
        if (!business.businessSubscriptionId) {
          business.activeSubscriptionId = null;
        }
        await business.save();

        // Update subscription status
        if (business.boostSubscriptionId) {
          const subscription = await Subscription.findById(business.boostSubscriptionId);
          if (subscription && subscription.subscriptionType === 'boost') {
            subscription.status = 'expired';
            await subscription.save();
          }
        }

        // Remove from boost queue
        const boostQueue = await BoostQueue.findOne({ 
          'currentlyActive.business': businessId 
        });
        if (boostQueue) {
          await boostQueue.removeFromQueue(businessId);
        }

        successResponseHelper(res, {
          success: true,
          message: 'Boost expired and business status updated',
          data: {
            business: {
              _id: business._id,
              businessName: business.businessName,
              isBoosted: business.isBoosted,
              isBoostActive: business.isBoostActive,
              boostExpiryAt: business.boostExpiryAt,
              boostSubscriptionId: business.boostSubscriptionId,
              activeSubscriptionId: business.activeSubscriptionId
            }
          }
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'Boost is still active',
          data: {
            business: {
              _id: business._id,
              businessName: business.businessName,
              isBoosted: business.isBoosted,
              isBoostActive: business.isBoostActive,
              boostExpiryAt: business.boostExpiryAt
            }
          }
        });
      }
    } catch (error) {
      console.error('Error handling boost expiry:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to handle boost expiry',
        error: error.message
      });
    }
  }

  /**
   * Confirm payment and activate subscription
   */
  static async confirmPayment(req, res) {
    try {
      const { businessId } = req.params;
      const { paymentIntentId, subscriptionId } = req.body;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Clean up businessUrls to remove invalid entries before any operations
      BusinessSubscriptionController.cleanBusinessUrls(business);

      // Verify subscription exists
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Subscription not found'
        });
      }

      // Verify payment intent
      const paymentIntent = await StripeHelper.getPaymentIntent(paymentIntentId);
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment not completed'
        });
      }

      // Update subscription status
      subscription.status = 'active';
      subscription.paymentId = paymentIntentId;
      
      // Set expiry for boost plans
      if (subscription.subscriptionType === 'boost') {
        const paymentPlan = await PaymentPlan.findById(subscription.paymentPlan);
        if (paymentPlan && paymentPlan.validityHours) {
          subscription.expiresAt = new Date(Date.now() + paymentPlan.validityHours * 60 * 60 * 1000);
        }
        
        // Handle boost queue activation
        if (subscription.boostQueueInfo && subscription.boostQueueInfo.queueId) {
          const boostQueue = await BoostQueue.findById(subscription.boostQueueInfo.queueId);
          if (boostQueue) {
            // Check if this business is already active (immediately activated)
            const activeBusiness = boostQueue.queue.find(item => 
              item.business.toString() === businessId && item.status === 'active'
            );
            
            if (activeBusiness) {
              // Business is already active, update subscription info
              subscription.boostQueueInfo.isCurrentlyActive = true;
              subscription.boostQueueInfo.boostStartTime = activeBusiness.boostStartTime;
              subscription.boostQueueInfo.boostEndTime = activeBusiness.boostEndTime;
              subscription.boostQueueInfo.queuePosition = 0;
              
                                            // Update business boost status - only if not in queue
              if (!boostQueue.queue.some(item => 
                item.business.toString() === businessId && 
                item.status === 'pending'
              )) {
                business.isBoosted = true;
                business.isBoostActive = true;
                business.boostExpiryAt = activeBusiness.boostEndTime;
              }
            } else {
              // Check if this business is next in queue
              const nextBusiness = boostQueue.queue.find(item => item.status === 'pending');
              if (nextBusiness && nextBusiness.business.toString() === businessId) {
                // Activate this business's boost
                await boostQueue.activateNext();
                
                // Update subscription with active status
                subscription.boostQueueInfo.isCurrentlyActive = true;
                subscription.boostQueueInfo.boostStartTime = boostQueue.currentlyActive.boostStartTime;
                subscription.boostQueueInfo.boostEndTime = boostQueue.currentlyActive.boostEndTime;
                subscription.boostQueueInfo.queuePosition = 0;
                
                // Update business boost status
                business.isBoosted = true;
                business.isBoostActive = true;
                business.boostExpiryAt = boostQueue.currentlyActive.boostEndTime;
              } else {
                // Business is in queue but not next - keep boost status false until it starts
                business.isBoosted = false;
                business.isBoostActive = false;
                business.boostExpiryAt = null;
              }
            }
          }
        }
      }

      await subscription.save();

      // Update business with subscription details based on type
      if (subscription.subscriptionType === 'business') {
        // Check if this is an upgrade (has upgrade metadata)
        if (subscription.metadata && subscription.metadata.upgradeFrom) {
          // This is an upgrade - find and deactivate the old subscription
          const oldSubscription = await Subscription.findOne({
            business: businessId,
            subscriptionType: 'business',
            status: 'active'
          });
          
          if (oldSubscription) {
            // Mark old subscription as upgraded and inactive
            oldSubscription.status = 'upgraded';
            oldSubscription.metadata = BusinessSubscriptionController.safeUpdateMetadata(oldSubscription, {
              upgradedTo: subscription._id,
              upgradedAt: new Date(),
              upgradeReason: 'user_requested',
              upgradeType: subscription.metadata?.upgradeType || 'upgrade'
            });
            await oldSubscription.save();
            console.log(`Old subscription ${oldSubscription._id} marked as upgraded and inactive`);
            
            // Send upgrade notification for old subscription
            try {
              const oldPaymentPlan = await PaymentPlan.findById(oldSubscription.paymentPlan);
              await sendSubscriptionNotifications.businessSubscriptionUpgraded(businessId, {
                oldSubscriptionId: oldSubscription._id.toString(),
                newSubscriptionId: subscription._id.toString(),
                oldPlanName: oldPaymentPlan?.name || 'Unknown Plan',
                newPlanName: subscription.metadata.planName,
                priceDifference: subscription.metadata.priceDifference || 0
              });
            } catch (notificationError) {
              console.error('Failed to send upgrade notification:', notificationError);
            }
          }
        }
        
        business.businessSubscriptionId = subscription._id;
        business.activeSubscriptionId = subscription._id;
      } else if (subscription.subscriptionType === 'boost') {
        business.boostSubscriptionId = subscription._id;
        business.activeSubscriptionId = subscription._id;
        
        // For boost subscriptions, check if boost is currently active
        if (subscription.boostQueueInfo && subscription.boostQueueInfo.isCurrentlyActive) {
          business.isBoosted = true;
          business.isBoostActive = true;
          business.boostExpiryAt = subscription.expiresAt;
        } else {
          // Boost is in queue or not yet active
          business.isBoosted = false;
          business.isBoostActive = false;
          business.boostExpiryAt = null;
        }
      }
      business.stripeCustomerId = subscription.stripeCustomerId;

      await business.save();

      // Update existing Payment record status to completed
      let paymentRecord = null;
      try {
        // Find the existing payment record for this subscription
        paymentRecord = await Payment.findOne({
          subscriptionId: subscription._id,
          stripePaymentIntentId: paymentIntentId
        });

        if (paymentRecord) {
          // Update the existing payment record
          paymentRecord.status = 'completed';
          paymentRecord.stripeChargeId = paymentIntentId;
          paymentRecord.receiptUrl = `https://receipt.stripe.com/${paymentIntentId}`;
          await paymentRecord.save();
          
          console.log('Payment record updated to completed with invoice number:', paymentRecord.invoiceNumber);
        } else {
          // If no existing payment record found, create a new one
          const paymentPlan = await PaymentPlan.findById(subscription.paymentPlan);
          
          paymentRecord = await Payment.create({
            businessId: businessId,
            paymentPlanId: subscription.paymentPlan,
            subscriptionId: subscription._id,
            planType: subscription.subscriptionType,
            paymentType: subscription.metadata?.upgradeFrom ? 'upgrade' : subscription.subscriptionType,
            status: 'completed',
            amount: subscription.amount,
            currency: subscription.currency,
            discount: 0,
            finalAmount: subscription.amount,
            stripePaymentIntentId: paymentIntentId,
            stripeCustomerId: subscription.stripeCustomerId,
            stripeChargeId: paymentIntentId,
            paymentMethod: 'card',
            businessName: business.businessName,
            businessEmail: business.businessEmail,
            planName: paymentPlan?.name || 'Unknown Plan',
            planDescription: paymentPlan?.description || 'Subscription Plan',
            features: paymentPlan?.features || [],
            maxBoostPerDay: paymentPlan?.maxBoostPerDay || 0,
            validityHours: paymentPlan?.validityHours || null,
            notes: subscription.metadata?.upgradeFrom ? `Upgraded from ${subscription.metadata.upgradeFrom}` : null
          });

          console.log('Payment record created with invoice number:', paymentRecord.invoiceNumber);
        }
      } catch (paymentError) {
        console.error('Failed to update/create payment record:', paymentError);
        // Don't fail the main operation if payment record update fails
      }

      // Send notifications based on subscription type
      try {
        const paymentPlan = await PaymentPlan.findById(subscription.paymentPlan);
        
        if (subscription.subscriptionType === 'business') {
          // Send business subscription notification
          await sendSubscriptionNotifications.businessSubscriptionCreated(businessId, {
            subscriptionId: subscription._id.toString(),
            planName: paymentPlan.name,
            amount: subscription.amount,
            currency: subscription.currency
          });

          // If this is an upgrade, send upgrade notification
          if (subscription.metadata && subscription.metadata.upgradeFrom) {
            await sendSubscriptionNotifications.businessSubscriptionUpgraded(businessId, {
              subscriptionId: subscription._id.toString(),
              oldPlanName: subscription.metadata.upgradeFrom,
              newPlanName: paymentPlan.name,
              priceDifference: subscription.metadata.priceDifference
            });
          }
        } else if (subscription.subscriptionType === 'boost') {
          // Send boost subscription notification
          await sendSubscriptionNotifications.boostSubscriptionCreated(businessId, {
            subscriptionId: subscription._id.toString(),
            planName: paymentPlan.name,
            validityHours: paymentPlan.validityHours,
            categoryName: subscription.metadata?.categoryName || 'Unknown Category'
          });
        }

        // Send payment success notification
        await sendPaymentNotifications.paymentSuccessful(businessId, {
          paymentId: paymentIntentId,
          amount: subscription.amount,
          currency: subscription.currency,
          planName: paymentPlan.name
        });
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the main operation if notifications fail
      }

      res.status(200).json({
        success: true,
        message: 'Payment confirmed and subscription activated',
        data: {
          subscription,
          payment: paymentRecord ? {
            invoiceNumber: paymentRecord.invoiceNumber,
            amount: paymentRecord.amount,
            currency: paymentRecord.currency,
            status: paymentRecord.status
          } : null,
          business: {
            _id: business._id,
            businessName: business.businessName,
            isBoosted: business.isBoosted,
            isBoostActive: business.isBoostActive,
            boostExpiryAt: business.boostExpiryAt,
            businessSubscriptionId: business.businessSubscriptionId,
            boostSubscriptionId: business.boostSubscriptionId,
            activeSubscriptionId: business.activeSubscriptionId
          }
        }
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to confirm payment',
        error: error.message
      });
    }
  }

  /**
   * Subscribe to boost plan with queue management
   */
  static async subscribeToBoostPlan(req, res) {
    try {
      const { businessId } = req.params;
      const { paymentPlanId } = req.body;

      // Validate required fields
      if (!paymentPlanId) {
          return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan ID is required',
          code: 'MISSING_PAYMENT_PLAN_ID'
        });
      }

      // Verify business exists and user has access
      const business = await Business.findById(businessId).populate('category', 'title name _id');
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found',
          code: 'BUSINESS_NOT_FOUND'
        });
      }

      // Clean up businessUrls to remove invalid entries before any operations
      BusinessSubscriptionController.cleanBusinessUrls(business);

      // Validate that business has a category
      if (!business.category || !business.category._id) {
        console.log('Business category validation failed:', {
          businessId: business._id,
          hasCategory: !!business.category,
          categoryId: business.category?._id,
          categoryData: business.category
        });
        return errorResponseHelper(res, {
          success: false,
          message: 'Business category is required for boost subscriptions. Please update your business profile and select a category before purchasing a boost.',
          code: 'BUSINESS_CATEGORY_REQUIRED',
          data: {
            businessId: business._id,
            businessName: business.businessName,
            action: 'update_business_category'
          }
        });
      }

      // Validate that category has a title
      if (!business.category.title) {
        console.log('Business category title validation failed:', {
          businessId: business._id,
          categoryId: business.category._id,
          categoryTitle: business.category.title,
          categoryData: business.category
        });
        return errorResponseHelper(res, {
          success: false,
          message: 'Business category information is incomplete. Please contact support.',
          code: 'CATEGORY_INFO_INCOMPLETE'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.',
          code: 'ACCESS_DENIED'
        });
      }

      // Get payment plan
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan not found',
          code: 'PAYMENT_PLAN_NOT_FOUND'
        });
      }

      // Verify it's a boost plan
      if (paymentPlan.planType !== 'boost') {
        return errorResponseHelper(res, {
          success: false,
          message: 'This endpoint is only for boost plans',
          code: 'INVALID_PLAN_TYPE'
        });
      }

      if (!paymentPlan.isActive) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan is not active',
          code: 'PAYMENT_PLAN_INACTIVE'
        });
      }

      // Check if business already has an active boost subscription
      const existingActiveBoostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      });

      if (existingActiveBoostSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business already has an active boost subscription. Please cancel the existing one first.',
          data: {
            existingSubscription: {
              _id: existingActiveBoostSubscription._id,
              status: existingActiveBoostSubscription.status,
              createdAt: existingActiveBoostSubscription.createdAt
            }
          }
        });
      }

      // Check if business already has a pending boost subscription for the same category
      const existingPendingBoostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'pending',
        'boostQueueInfo.category': business.category._id
      });

      if (existingPendingBoostSubscription) {
        // Update existing pending boost subscription instead of creating a new one
        console.log('Found existing pending boost subscription, updating:', existingPendingBoostSubscription._id);
        
        // Update the existing subscription with new payment plan details
        existingPendingBoostSubscription.paymentPlan = paymentPlanId;
        existingPendingBoostSubscription.amount = paymentPlan.price;
        existingPendingBoostSubscription.currency = paymentPlan.currency;
        existingPendingBoostSubscription.features = paymentPlan.features || [];
        existingPendingBoostSubscription.maxBoostPerDay = paymentPlan.maxBoostPerDay || 0;
        existingPendingBoostSubscription.validityHours = paymentPlan.validityHours || 24;
        existingPendingBoostSubscription.metadata = {
          planName: paymentPlan.name,
          businessName: business.businessName,
          categoryName: business.category.title,
          updatedAt: new Date().toISOString()
        };
        
        // Create new payment intent for the updated subscription
        let stripeCustomer;
        try {
          if (business.stripeCustomerId) {
            stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
          } else {
            stripeCustomer = await StripeHelper.createCustomer({
              email: business.email,
              name: business.businessName,
              businessId: business._id.toString(),
              userId: business.businessOwner.toString()
            });
            
            business.stripeCustomerId = stripeCustomer.id;
            await business.save();
          }
        } catch (error) {
          console.log('Error with existing Stripe customer, creating new one:', error.message);
          stripeCustomer = await StripeHelper.createCustomer({
            email: business.email,
            name: business.businessName,
            businessId: business._id.toString(),
            userId: business.businessOwner.toString()
          });
          
          business.stripeCustomerId = stripeCustomer.id;
          await business.save();
        }

        const paymentIntent = await StripeHelper.createPaymentIntent({
          amount: paymentPlan.price,
          currency: paymentPlan.currency,
          customerId: stripeCustomer.id,
          businessId: business._id.toString(),
          planType: 'boost',
          planId: paymentPlanId,
          receiptEmail: business.email
        });

        existingPendingBoostSubscription.paymentId = paymentIntent.id;
        existingPendingBoostSubscription.stripeCustomerId = stripeCustomer.id;
        await existingPendingBoostSubscription.save();

        // Create Payment record with invoice number for updated pending boost payment
        let paymentRecord = null;
        try {
          paymentRecord = await Payment.create({
            businessId: businessId,
            paymentPlanId: paymentPlanId,
            subscriptionId: existingPendingBoostSubscription._id,
            planType: 'boost',
            paymentType: 'boost',
            status: 'pending',
            amount: paymentPlan.price,
            currency: paymentPlan.currency,
            discount: 0,
            finalAmount: paymentPlan.price,
            stripePaymentIntentId: paymentIntent.id,
            stripeCustomerId: stripeCustomer.id,
            paymentMethod: 'card',
            businessName: business.businessName,
            businessEmail: business.email,
            planName: paymentPlan.name,
            planDescription: paymentPlan.description || 'Boost Plan',
            features: paymentPlan.features || [],
            maxBoostPerDay: paymentPlan.maxBoostPerDay || 0,
            validityHours: paymentPlan.validityHours || 24,
            notes: 'Payment pending - boost subscription updated'
          });

          console.log('Payment record created with invoice number:', paymentRecord.invoiceNumber);
        } catch (paymentError) {
          console.error('Failed to create payment record:', paymentError);
          // Don't fail the main operation if payment record creation fails
        }

        return successResponseHelper(res, {
          success: true,
          message: 'Existing pending boost subscription updated. Please complete payment.',
          data: {
            subscription: existingPendingBoostSubscription,
            payment: paymentRecord ? {
              invoiceNumber: paymentRecord.invoiceNumber,
              amount: paymentRecord.amount,
              currency: paymentRecord.currency,
              status: paymentRecord.status
            } : null,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            isUpdated: true
          }
        });
      }

      // Create or get Stripe customer
      let stripeCustomer;
      try {
        if (business.stripeCustomerId) {
          stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
        } else {
          stripeCustomer = await StripeHelper.createCustomer({
            email: business.email,
            name: business.businessName,
            businessId: business._id.toString(),
            userId: business.businessOwner.toString()
          });
          
          business.stripeCustomerId = stripeCustomer.id;
          await business.save();
        }
      } catch (error) {
        console.log('Error with existing Stripe customer, creating new one:', error.message);
        stripeCustomer = await StripeHelper.createCustomer({
          email: business.email,
          name: business.businessName,
          businessId: business._id.toString(),
          userId: business.businessOwner.toString()
        });
        
        business.stripeCustomerId = stripeCustomer.id;
        await business.save();
      }

      // Create payment intent
      const paymentIntent = await StripeHelper.createPaymentIntent({
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        customerId: stripeCustomer.id,
        businessId: business._id.toString(),
        planType: 'boost',
        planId: paymentPlanId,
        receiptEmail: business.email
      });

      // Create subscription in database
      const subscription = new Subscription({
        business: businessId,
        paymentPlan: paymentPlanId,
        subscriptionType: 'boost',
        stripeCustomerId: stripeCustomer.id,
        status: 'inactive', // Will be updated to 'active' after payment confirmation
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        isLifetime: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Boost plans expire in 24 hours
        paymentId: paymentIntent.id,
        features: paymentPlan.features || [],
        maxBoostPerDay: paymentPlan.maxBoostPerDay || 0,
        validityHours: paymentPlan.validityHours || 24,
        boostQueueInfo: {
          category: business.category._id,
          estimatedStartTime: null,
          estimatedEndTime: null,
          isCurrentlyActive: false
        },
        metadata: {
          planName: paymentPlan.name,
          businessName: business.businessName,
          categoryName: business.category.title
        }
      });

      await subscription.save();

      // Create Payment record with invoice number for new boost payment
      let paymentRecord = null;
      try {
        paymentRecord = await Payment.create({
          businessId: businessId,
          paymentPlanId: paymentPlanId,
          subscriptionId: subscription._id,
          planType: 'boost',
          paymentType: 'boost',
          status: 'pending',
          amount: paymentPlan.price,
          currency: paymentPlan.currency,
          discount: 0,
          finalAmount: paymentPlan.price,
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: stripeCustomer.id,
          paymentMethod: 'card',
          businessName: business.businessName,
          businessEmail: business.email,
          planName: paymentPlan.name,
          planDescription: paymentPlan.description || 'Boost Plan',
          features: paymentPlan.features || [],
          maxBoostPerDay: paymentPlan.maxBoostPerDay || 0,
          validityHours: paymentPlan.validityHours || 24,
          notes: 'Payment pending - boost subscription created'
        });

        console.log('Payment record created with invoice number:', paymentRecord.invoiceNumber);
      } catch (paymentError) {
        console.error('Failed to create payment record:', paymentError);
        // Don't fail the main operation if payment record creation fails
      }

      // Update business with boost subscription ID but keep boost status false until active
      business.boostSubscriptionId = subscription._id;
      business.activeSubscriptionId = subscription._id;
      business.isBoosted = false; // Will be set to true when boost actually starts
      business.isBoostActive = false; // Will be set to true when boost actually starts
      await business.save();

      // Get or create boost queue for this category
      let boostQueue = await BoostQueue.findOne({ category: business.category._id });
      
      if (!boostQueue) {
        console.log('Creating new boost queue for category:', {
          categoryId: business.category._id,
          categoryName: business.category.title,
          businessCategory: business.category
        });
        
        try {
          boostQueue = new BoostQueue({
            category: business.category._id,
            categoryName: business.category.title,
            queue: [],
            currentlyActive: {
              business: null,
              boostStartTime: null,
              boostEndTime: null,
              subscription: null
            }
          });
          await boostQueue.save();
          console.log('Boost queue created successfully');
        } catch (error) {
          console.error('Error creating boost queue:', error);
          console.error('Boost queue data:', {
            category: business.category._id,
            categoryName: business.category.title,
            businessCategoryType: typeof business.category,
            businessCategoryKeys: Object.keys(business.category || {})
          });
          throw error;
        }
      }

      // Check if there's already a business in queue or currently active for this category
      const hasActiveOrQueuedBusiness = boostQueue.currentlyActive.business || 
                                       boostQueue.queue.some(item => item.status === 'pending');

      if (hasActiveOrQueuedBusiness) {
        // Add business to queue since there's already a business in this category
        const queueData = {
          business: business._id,
          businessName: business.businessName,
          businessOwner: business.businessOwner,
          subscription: subscription._id,
          paymentIntentId: paymentIntent.id
        };

        await boostQueue.addToQueue(queueData);
      } else {
        // No business in queue or currently active, activate this business immediately
        const now = new Date();
        const boostEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        // Set as currently active
        boostQueue.currentlyActive = {
          business: business._id,
          boostStartTime: now,
          boostEndTime: boostEndTime,
          subscription: subscription._id
        };

        // Add to queue as active
        const queueData = {
          business: business._id,
          businessName: business.businessName,
          businessOwner: business.businessOwner,
          subscription: subscription._id,
          paymentIntentId: paymentIntent.id,
          status: 'active',
          position: 1,
          boostStartTime: now,
          boostEndTime: boostEndTime,
          estimatedStartTime: now,
          estimatedEndTime: boostEndTime
        };

        boostQueue.queue.push(queueData);
        await boostQueue.save();

        // Update subscription status to active
        subscription.status = 'active';
        await subscription.save();

        // Update business boost status to active since boost starts immediately
        business.isBoosted = true;
        business.isBoostActive = true;
        business.boostExpiryAt = boostEndTime;
        await business.save();
      }

      // Update subscription with queue info
      const queueItem = boostQueue.queue[boostQueue.queue.length - 1];
      subscription.boostQueueInfo = {
        queueId: boostQueue._id,
        queuePosition: queueItem.position,
        estimatedStartTime: queueItem.estimatedStartTime,
        estimatedEndTime: queueItem.estimatedEndTime,
        isCurrentlyActive: queueItem.status === 'active',
        category: business.category._id
      };

      await subscription.save();

      // Update business boost status based on queue position
      if (queueItem.status === 'active') {
        // Business is immediately active
        business.isBoosted = true;
        business.isBoostActive = true;
        business.boostExpiryAt = queueItem.boostEndTime;
      } else {
        // Business is in queue - keep boost status false until it starts
        business.isBoosted = false;
        business.isBoostActive = false;
        business.boostExpiryAt = null;
      }
      await business.save();

      // Prepare response based on whether business was queued or activated immediately
      const isImmediatelyActivated = queueItem.status === 'active';
      const message = isImmediatelyActivated 
        ? 'Boost subscription activated immediately. Your business is now boosted!'
        : 'Boost subscription created successfully. Please complete payment.';

      successResponseHelper(res, {
        success: true,
        message: message,
        data: {
          subscription,
          payment: paymentRecord ? {
            invoiceNumber: paymentRecord.invoiceNumber,
            amount: paymentRecord.amount,
            currency: paymentRecord.currency,
            status: paymentRecord.status
          } : null,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          queueInfo: {
            position: queueItem.position,
            estimatedStartTime: queueItem.estimatedStartTime,
            estimatedEndTime: queueItem.estimatedEndTime,
            categoryName: business.category.title,
            isCurrentlyActive: isImmediatelyActivated,
            status: queueItem.status
          }
        }
      });
    } catch (error) {
      console.error('Error creating boost subscription:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to create boost subscription',
        error: error.message
      });
    }
  }

  /**
   * Cancel boost subscription
   */
  static async cancelBoostSubscription(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.'
        });
      }

      // Find boost subscription (active or pending)
      const subscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: { $in: ['active', 'pending'] }
      });

      if (!subscription) {
          return errorResponseHelper(res, {
          success: false,
          message: 'No boost subscription found'
        });
      }

      let refundProcessed = false;
      let cancellationMessage = '';

      // Handle payment based on subscription status and boost state
      if (subscription.paymentId) {
        try {
          // Get payment intent to check its status
          const paymentIntent = await StripeHelper.getPaymentIntent(subscription.paymentId);
          
          if (subscription.status === 'pending') {
            // If subscription is pending, cancel the payment intent
            await StripeHelper.cancelPaymentIntent(subscription.paymentId);
            cancellationMessage = 'Payment intent canceled successfully';
          } else if (subscription.status === 'active') {
            // If subscription is active, check if boost has started
            const boostQueue = await BoostQueue.findById(subscription.boostQueueInfo?.queueId);
            
            if (boostQueue) {
              const queueItem = boostQueue.queue.find(item => 
                item.business.toString() === businessId
              );
              
              if (queueItem && queueItem.status === 'active') {
                // Boost is active, calculate refund amount based on time used
                const now = new Date();
                const boostStartTime = new Date(queueItem.boostStartTime);
                const boostEndTime = new Date(queueItem.boostEndTime);
                const totalDuration = boostEndTime - boostStartTime;
                const timeUsed = now - boostStartTime;
                const timeRemaining = totalDuration - timeUsed;
                
                // Calculate refund percentage (minimum 50% refund if used less than 50% of time)
                const usagePercentage = timeUsed / totalDuration;
                let refundPercentage = 0;
                
                if (usagePercentage < 0.5) {
                  // Used less than 50% of time, refund 50%
                  refundPercentage = 0.5;
                } else if (usagePercentage < 0.75) {
                  // Used 50-75% of time, refund 25%
                  refundPercentage = 0.25;
                }
                // If used more than 75%, no refund
                
                if (refundPercentage > 0) {
                  const refundAmount = (subscription.amount * refundPercentage) / 100; // Convert from cents
                  await StripeHelper.createRefund(subscription.paymentId, refundAmount);
                  refundProcessed = true;
                  cancellationMessage = `Refund processed: ${Math.round(refundPercentage * 100)}% of payment refunded`;
                } else {
                  cancellationMessage = 'No refund available - boost has been used for more than 75% of its duration';
                }
              } else {
                // Boost hasn't started yet, full refund
                await StripeHelper.createRefund(subscription.paymentId);
                refundProcessed = true;
                cancellationMessage = 'Full refund processed - boost had not started yet';
              }
            } else {
              // No queue found, assume boost hasn't started, full refund
              await StripeHelper.createRefund(subscription.paymentId);
              refundProcessed = true;
              cancellationMessage = 'Full refund processed';
            }
          }
        } catch (error) {
          console.error('Error processing payment cancellation/refund:', error);
          cancellationMessage = 'Payment processing error: ' + error.message;
        }
      }

      // Remove from boost queue
      if (subscription.boostQueueInfo?.queueId) {
        const boostQueue = await BoostQueue.findById(subscription.boostQueueInfo.queueId);
        if (boostQueue) {
          await boostQueue.removeFromQueue(businessId);
          
          // If this business was currently active, activate the next one
          if (boostQueue.currentlyActive.business && 
              boostQueue.currentlyActive.business.toString() === businessId) {
            await boostQueue.activateNext();
          }
        }
      }

      // Update subscription status and boost timing for canceled subscription
      subscription.status = 'canceled';
      
      // For boost subscriptions, update the boost timing to show it's expired
      if (subscription.subscriptionType === 'boost') {
        const now = new Date();
        // Set boost start time to now and end time to now (immediately expired)
        subscription.boostQueueInfo = {
          ...subscription.boostQueueInfo,
          boostStartTime: now,
          boostEndTime: now,
          isCurrentlyActive: false
        };
        subscription.expiresAt = now; // Set expiry to now
      }
      
      subscription.metadata = BusinessSubscriptionController.safeUpdateMetadata(subscription, {
        canceledAt: new Date(),
        refundProcessed: refundProcessed,
        cancellationReason: 'user_requested'
      });
      await subscription.save();

      // Update business boost status - remove all boost references
      business.isBoosted = false;
      business.isBoostActive = false;
      business.boostExpiryAt = null;
      business.boostSubscriptionId = null;
      
      // Only clear activeSubscriptionId if there's no business subscription
      if (!business.businessSubscriptionId) {
        business.activeSubscriptionId = null;
      }
      await business.save();

      res.status(200).json({
        success: true,
        message: `Boost subscription canceled successfully. ${cancellationMessage}`,
        data: {
          subscription: {
            _id: subscription._id,
            status: subscription.status,
            refundProcessed: refundProcessed,
            cancellationMessage: cancellationMessage
          },
          business: {
            _id: business._id,
            businessName: business.businessName,
            isBoosted: business.isBoosted,
            isBoostActive: business.isBoostActive,
            boostExpiryAt: business.boostExpiryAt,
            boostSubscriptionId: business.boostSubscriptionId,
            activeSubscriptionId: business.activeSubscriptionId
          }
        }
      });
    } catch (error) {
      console.error('Error canceling boost subscription:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to cancel boost subscription',
        error: error.message
      });
    }
  }

  /**
   * Upgrade business subscription
   */
  static async upgradeBusinessSubscription(req, res) {
    try {
      const { businessId } = req.params;
      const { newPaymentPlanId } = req.body;

      // Validate required fields - accept both newPaymentPlanId and paymentPlanId for compatibility
      const planId = newPaymentPlanId || req.body.paymentPlanId;
      if (!planId) {
        return errorResponseHelper(res, {
          success: false,
          message: 'New payment plan ID is required',
          code: 'MISSING_PAYMENT_PLAN_ID'
        });
      }

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found',
          code: 'BUSINESS_NOT_FOUND'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.',
          code: 'ACCESS_DENIED'
        });
      }

      // Get new payment plan
      const newPaymentPlan = await PaymentPlan.findById(planId);
      if (!newPaymentPlan) {
        return errorResponseHelper(res, {
          success: false,
          message: 'New payment plan not found',
          code: 'PAYMENT_PLAN_NOT_FOUND'
        });
      }

      // Verify it's a business plan
      if (newPaymentPlan.planType !== 'business') {
        return errorResponseHelper(res, {
          success: false,
          message: 'This endpoint is only for business plans',
          code: 'INVALID_PLAN_TYPE'
        });
      }

      if (!newPaymentPlan.isActive) {
        return errorResponseHelper(res, {
          success: false,
          message: 'New payment plan is not active',
          code: 'PAYMENT_PLAN_INACTIVE'
        });
      }

      // Find current business subscription
      const currentSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: { $in: ['active', 'pending'] }
      });

      if (!currentSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No active business subscription found to upgrade',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        });
      }

      // Check if there's already a pending upgrade for this business
      const existingPendingUpgrade = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'pending',
        'metadata.upgradeFrom': { $exists: true }
      });

      if (existingPendingUpgrade) {
        // Update existing pending upgrade with new information
        console.log('Found existing pending upgrade, updating:', existingPendingUpgrade._id);
        
        // Get current payment plan for proper comparison
        const currentPaymentPlan = await PaymentPlan.findById(currentSubscription.paymentPlan);
        if (!currentPaymentPlan) {
          return errorResponseHelper(res, {
            success: false,
            message: 'Current payment plan not found',
            code: 'CURRENT_PLAN_NOT_FOUND'
          });
        }
        
        // Calculate price difference and upgrade type
        const priceDifference = newPaymentPlan.price - currentPaymentPlan.price;
        let upgradeType = 'upgrade';
        if (priceDifference < 0) {
          upgradeType = 'downgrade';
        } else if (priceDifference === 0) {
          upgradeType = 'switch';
        }
        
        // Update the existing subscription with new payment plan details (consistent with create subscription)
        existingPendingUpgrade.paymentPlan = planId;
        existingPendingUpgrade.amount = newPaymentPlan.price;
        existingPendingUpgrade.currency = newPaymentPlan.currency;
        existingPendingUpgrade.features = newPaymentPlan.features || [];
        existingPendingUpgrade.isLifetime = newPaymentPlan.isLifetime;
        existingPendingUpgrade.expiresAt = newPaymentPlan.isLifetime ? null : new Date(Date.now() + (newPaymentPlan.validityHours || 8760) * 60 * 60 * 1000);
        existingPendingUpgrade.maxBoostPerDay = newPaymentPlan.maxBoostPerDay || 0;
        existingPendingUpgrade.validityHours = newPaymentPlan.validityHours || null;
        
        existingPendingUpgrade.metadata = BusinessSubscriptionController.safeUpdateMetadata(existingPendingUpgrade, {
          planName: newPaymentPlan.name,
          businessName: business.businessName,
          upgradeFrom: currentPaymentPlan.name,
          upgradeFromId: currentPaymentPlan._id.toString(),
          upgradeReason: 'user_requested',
          upgradeType: upgradeType,
          priceDifference: priceDifference,
          originalSubscriptionId: currentSubscription._id.toString(),
          updatedAt: new Date().toISOString()
        });
        
        // Create new payment intent for the updated subscription
        let stripeCustomer;
        try {
          if (business.stripeCustomerId) {
            stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
          } else {
            stripeCustomer = await StripeHelper.createCustomer({
              email: business.email,
              name: business.businessName,
              businessId: business._id.toString(),
              userId: business.businessOwner.toString()
            });
            
            business.stripeCustomerId = stripeCustomer.id;
            await business.save();
          }
        } catch (error) {
          console.log('Error with existing Stripe customer, creating new one:', error.message);
          stripeCustomer = await StripeHelper.createCustomer({
            email: business.email,
            name: business.businessName,
            businessId: business._id.toString(),
            userId: business.businessOwner.toString()
          });
          
          business.stripeCustomerId = stripeCustomer.id;
          await business.save();
        }

        // Create new payment intent for the updated upgrade
        const newPaymentIntent = await StripeHelper.createPaymentIntent({
          amount: Math.max(0, priceDifference), // Ensure non-negative amount
          currency: newPaymentPlan.currency,
          customerId: stripeCustomer.id,
          businessId: business._id.toString(),
          planType: 'business',
          planId: planId,
          receiptEmail: business.email,
          metadata: {
            upgradeFrom: currentPaymentPlan.name,
            upgradeTo: newPaymentPlan.name,
            originalSubscriptionId: currentSubscription._id.toString()
          }
        });

        existingPendingUpgrade.paymentId = newPaymentIntent.id;
        existingPendingUpgrade.stripeCustomerId = stripeCustomer.id;
        await existingPendingUpgrade.save();

        // Determine appropriate message based on upgrade type
        let message = '';
        if (upgradeType === 'upgrade') {
          message = 'Existing pending upgrade updated. Please complete payment.';
        } else if (upgradeType === 'downgrade') {
          message = 'Existing pending downgrade updated. No additional payment required.';
        } else {
          message = 'Existing pending plan switch updated. No additional payment required.';
        }

        return successResponseHelper(res, {
          success: true,
          message: message,
          data: {
            subscription: {
              _id: existingPendingUpgrade._id,
              status: existingPendingUpgrade.status,
              amount: existingPendingUpgrade.amount,
              currency: existingPendingUpgrade.currency,
              paymentPlan: {
                _id: newPaymentPlan._id,
                name: newPaymentPlan.name,
                description: newPaymentPlan.description,
                price: newPaymentPlan.price,
                currency: newPaymentPlan.currency,
                features: newPaymentPlan.features
              }
            },
            payment: {
              clientSecret: newPaymentIntent.client_secret,
              paymentIntentId: newPaymentIntent.id,
              amount: Math.max(0, priceDifference), // Ensure non-negative for display
              currency: newPaymentPlan.currency,
              requiresPayment: priceDifference > 0
            },
            upgrade: {
              type: upgradeType,
              from: {
                planName: currentPaymentPlan.name,
                price: currentPaymentPlan.price,
                currency: currentPaymentPlan.currency
              },
              to: {
                planName: newPaymentPlan.name,
                price: newPaymentPlan.price,
                currency: newPaymentPlan.currency
              },
              priceDifference: priceDifference,
              requiresPayment: priceDifference > 0
            },
            isUpdated: true
          }
        });
      }

      // Get current payment plan
      const currentPaymentPlan = await PaymentPlan.findById(currentSubscription.paymentPlan);
      if (!currentPaymentPlan) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Current payment plan not found',
          code: 'CURRENT_PLAN_NOT_FOUND'
        });
      }

      // Check if it's the same plan (no upgrade needed)
      if (newPaymentPlan._id.toString() === currentPaymentPlan._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Cannot upgrade to the same plan. Please select a different plan.',
          code: 'SAME_PLAN_UPGRADE'
        });
      }

      // Calculate price difference (can be negative for cheaper plans)
      const priceDifference = newPaymentPlan.price - currentPaymentPlan.price;

      // Get or create Stripe customer
      let stripeCustomer;
      try {
        if (business.stripeCustomerId) {
          stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
        } else {
          stripeCustomer = await StripeHelper.createCustomer({
            email: business.email,
            name: business.businessName,
            businessId: business._id.toString(),
            userId: business.businessOwner.toString()
          });
          
          business.stripeCustomerId = stripeCustomer.id;
          await business.save();
        }
      } catch (error) {
        console.log('Error with existing Stripe customer, creating new one:', error.message);
        stripeCustomer = await StripeHelper.createCustomer({
          email: business.email,
          name: business.businessName,
          businessId: business._id.toString(),
          userId: business.businessOwner.toString()
        });
        
        business.stripeCustomerId = stripeCustomer.id;
        await business.save();
      }

      let paymentIntent = null;
      let upgradeType = 'upgrade';
      
      if (priceDifference > 0) {
        // More expensive plan - create payment intent for the difference
        paymentIntent = await StripeHelper.createPaymentIntent({
          amount: priceDifference,
          currency: newPaymentPlan.currency,
          customerId: stripeCustomer.id,
          businessId: business._id.toString(),
          planType: 'business',
          planId: planId,
          receiptEmail: business.email,
          metadata: {
            upgradeFrom: currentPaymentPlan.name,
            upgradeTo: newPaymentPlan.name,
            originalSubscriptionId: currentSubscription._id.toString()
          }
        });
        upgradeType = 'upgrade';
      } else if (priceDifference < 0) {
        // Cheaper plan - no additional payment needed, but we'll create a minimal payment intent for tracking
        paymentIntent = await StripeHelper.createPaymentIntent({
          amount: 0, // No additional payment needed
          currency: newPaymentPlan.currency,
          customerId: stripeCustomer.id,
          businessId: business._id.toString(),
          planType: 'business',
          planId: planId,
          receiptEmail: business.email,
          metadata: {
            upgradeFrom: currentPaymentPlan.name,
            upgradeTo: newPaymentPlan.name,
            originalSubscriptionId: currentSubscription._id.toString(),
            downgrade: true,
            priceDifference: Math.abs(priceDifference)
          }
        });
        upgradeType = 'downgrade';
      } else {
        // Same price - create a minimal payment intent for tracking
        paymentIntent = await StripeHelper.createPaymentIntent({
          amount: 0,
          currency: newPaymentPlan.currency,
          customerId: stripeCustomer.id,
          businessId: business._id.toString(),
          planType: 'business',
          planId: planId,
          receiptEmail: business.email,
          metadata: {
            upgradeFrom: currentPaymentPlan.name,
            upgradeTo: newPaymentPlan.name,
            originalSubscriptionId: currentSubscription._id.toString(),
            samePrice: true
          }
        });
        upgradeType = 'switch';
      }

      // Create new subscription record (consistent with create subscription logic)
      const newSubscription = new Subscription({
        business: businessId,
        paymentPlan: planId,
        subscriptionType: 'business',
        stripeCustomerId: stripeCustomer.id,
        status: 'pending', // Will be activated after payment confirmation
        amount: newPaymentPlan.price,
        currency: newPaymentPlan.currency,
        isLifetime: newPaymentPlan.isLifetime,
        expiresAt: newPaymentPlan.isLifetime ? null : new Date(Date.now() + (newPaymentPlan.validityHours || 8760) * 60 * 60 * 1000),
        paymentId: paymentIntent.id,
        features: newPaymentPlan.features || [],
        maxBoostPerDay: newPaymentPlan.maxBoostPerDay || 0,
        validityHours: newPaymentPlan.validityHours || null,
        metadata: {
          planName: newPaymentPlan.name,
          businessName: business.businessName,
          upgradeFrom: currentPaymentPlan.name,
          upgradeFromId: currentPaymentPlan._id.toString(),
          upgradeReason: 'user_requested',
          upgradeType: upgradeType,
          priceDifference: priceDifference,
          originalSubscriptionId: currentSubscription._id.toString()
        }
      });

      await newSubscription.save();

      // Determine appropriate message based on upgrade type
      let message = '';
      if (upgradeType === 'upgrade') {
        message = 'Business subscription upgrade initiated. Please complete payment.';
      } else if (upgradeType === 'downgrade') {
        message = 'Business subscription downgrade initiated. No additional payment required.';
      } else {
        message = 'Business subscription plan switch initiated. No additional payment required.';
      }

        successResponseHelper(res, {
        success: true,
        message: message,
        data: {
          subscription: {
            _id: newSubscription._id,
            status: newSubscription.status,
            amount: newSubscription.amount,
            currency: newSubscription.currency,
            paymentPlan: {
              _id: newPaymentPlan._id,
              name: newPaymentPlan.name,
              description: newPaymentPlan.description,
              price: newPaymentPlan.price,
              currency: newPaymentPlan.currency,
              features: newPaymentPlan.features
            }
          },
          payment: {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: Math.max(0, priceDifference), // Ensure non-negative for display
            currency: newPaymentPlan.currency,
            requiresPayment: priceDifference > 0
          },
          upgrade: {
            type: upgradeType,
            from: {
              planName: currentPaymentPlan.name,
              price: currentPaymentPlan.price,
              currency: currentPaymentPlan.currency
            },
            to: {
              planName: newPaymentPlan.name,
              price: newPaymentPlan.price,
              currency: newPaymentPlan.currency
            },
            priceDifference: priceDifference,
            requiresPayment: priceDifference > 0
          }
        }
      });
    } catch (error) {
      console.error('Error upgrading business subscription:', error);
      errorResponseHelper(res, {
        message: 'Failed to upgrade business subscription',
        code: '00500'
      });
    }
  }

  /**
   * Handle subscription upgrade completion
   */
  static async handleSubscriptionUpgrade(req, res) {
    try {
      const { businessId, newSubscriptionId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found',
          code: 'BUSINESS_NOT_FOUND'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.',
          code: 'ACCESS_DENIED'
        });
      }

      // Find the new subscription
      const newSubscription = await Subscription.findById(newSubscriptionId);
      if (!newSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'New subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        });
      }

      // Verify this is an upgrade subscription
      if (!newSubscription.metadata?.upgradeFrom) {
        return errorResponseHelper(res, {
          success: false,
          message: 'This is not an upgrade subscription',
          code: 'NOT_UPGRADE_SUBSCRIPTION'
        });
      }

      // Find the original subscription that was upgraded
      const originalSubscription = await Subscription.findById(newSubscription.metadata.originalSubscriptionId);
      if (!originalSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Original subscription not found',
          code: 'ORIGINAL_SUBSCRIPTION_NOT_FOUND'
        });
      }

      // Update original subscription status to upgraded
      originalSubscription.status = 'upgraded';
      originalSubscription.metadata = BusinessSubscriptionController.safeUpdateMetadata(originalSubscription, {
        upgradedTo: newSubscription._id,
        upgradedAt: new Date(),
        upgradeReason: 'user_requested',
        upgradeType: newSubscription.metadata?.upgradeType || 'upgrade'
      });
      await originalSubscription.save();

      // Update business subscription references
      business.businessSubscriptionId = newSubscription._id;
      business.activeSubscriptionId = newSubscription._id;
      await business.save();

      // Send upgrade completion notification
      try {
        const oldPaymentPlan = await PaymentPlan.findById(originalSubscription.paymentPlan);
        const newPaymentPlan = await PaymentPlan.findById(newSubscription.paymentPlan);
        
        await sendSubscriptionNotifications.businessSubscriptionUpgraded(businessId, {
          oldSubscriptionId: originalSubscription._id.toString(),
          newSubscriptionId: newSubscription._id.toString(),
          oldPlanName: oldPaymentPlan?.name || 'Unknown Plan',
          newPlanName: newPaymentPlan?.name || 'Unknown Plan',
          priceDifference: newSubscription.metadata.priceDifference || 0
        });
      } catch (notificationError) {
        console.error('Failed to send upgrade completion notification:', notificationError);
      }

      successResponseHelper(res, {
        success: true,
        message: 'Subscription upgrade completed successfully',
        data: {
          originalSubscription: {
            _id: originalSubscription._id,
            status: originalSubscription.status,
            planName: originalSubscription.metadata?.planName
          },
          newSubscription: {
            _id: newSubscription._id,
            status: newSubscription.status,
            planName: newSubscription.metadata?.planName
          },
          business: {
            _id: business._id,
            businessName: business.businessName,
            businessSubscriptionId: business.businessSubscriptionId,
            activeSubscriptionId: business.activeSubscriptionId
          }
        }
      });
    } catch (error) {
      console.error('Error handling subscription upgrade:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to handle subscription upgrade',
        error: error.message
      });
    }
  }

  /**
   * Cancel pending subscription upgrade
   */
  static async cancelPendingUpgrade(req, res) {
    try {
      const { businessId, subscriptionId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found',
          code: 'BUSINESS_NOT_FOUND'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.',
          code: 'ACCESS_DENIED'
        });
      }

      // Find the pending upgrade subscription
      const pendingUpgrade = await Subscription.findOne({
        _id: subscriptionId,
        business: businessId,
        subscriptionType: 'business',
        status: 'pending',
        'metadata.upgradeFrom': { $exists: true }
      });

      if (!pendingUpgrade) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No pending upgrade found',
          code: 'NO_PENDING_UPGRADE'
        });
      }

      // Cancel the payment intent if it exists
      if (pendingUpgrade.paymentId) {
        try {
          await StripeHelper.cancelPaymentIntent(pendingUpgrade.paymentId);
        } catch (error) {
          console.error('Error canceling payment intent:', error);
          // Continue with cancellation even if payment intent cancellation fails
        }
      }

      // Update subscription status to canceled
      pendingUpgrade.status = 'canceled';
      pendingUpgrade.metadata = BusinessSubscriptionController.safeUpdateMetadata(pendingUpgrade, {
        canceledAt: new Date(),
        cancellationReason: 'user_requested'
      });
      await pendingUpgrade.save();

      // Ensure the original subscription is still active
      const originalSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      });

      if (originalSubscription) {
        // Make sure business still references the original subscription
        business.businessSubscriptionId = originalSubscription._id;
        business.activeSubscriptionId = originalSubscription._id;
        await business.save();
      }

      successResponseHelper(res, {
        success: true,
        message: 'Pending upgrade canceled successfully',
        data: {
          canceledUpgrade: {
            _id: pendingUpgrade._id,
            status: pendingUpgrade.status,
            planName: pendingUpgrade.metadata?.planName
          },
          business: {
            _id: business._id,
            businessName: business.businessName,
            businessSubscriptionId: business.businessSubscriptionId,
            activeSubscriptionId: business.activeSubscriptionId
          }
        }
      });
    } catch (error) {
      console.error('Error canceling pending upgrade:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to cancel pending upgrade',
        error: error.message
      });
    }
  }

  /**
   * Cancel business subscription
   */
  static async cancelBusinessSubscription(req, res) {
    try {
      const { businessId } = req.params;
      const { reason } = req.body;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found',
          code: 'BUSINESS_NOT_FOUND'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.',
          code: 'ACCESS_DENIED'
        });
      }

      // Find business subscription (active or pending)
      const subscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: { $in: ['active', 'pending'] }
      });

      if (!subscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No active business subscription found',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        });
      }

      // Get payment plan details
      const paymentPlan = await PaymentPlan.findById(subscription.paymentPlan);
      if (!paymentPlan) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Payment plan not found',
          code: 'PAYMENT_PLAN_NOT_FOUND'
        });
      }

      let refundProcessed = false;
      let cancellationMessage = '';
      let refundAmount = 0;

      // Handle payment cancellation/refund based on subscription status
      if (subscription.paymentId) {
        try {
          // Get payment intent to check its status
          const paymentIntent = await StripeHelper.getPaymentIntent(subscription.paymentId);
          
          if (subscription.status === 'pending') {
            // If subscription is pending, cancel the payment intent
            await StripeHelper.cancelPaymentIntent(subscription.paymentId);
            cancellationMessage = 'Payment intent canceled successfully';
          } else if (subscription.status === 'active') {
            // If subscription is active, check if it's lifetime or time-based
            if (paymentPlan.isLifetime) {
              // For lifetime subscriptions, calculate refund based on time since purchase
              const purchaseDate = subscription.createdAt;
              const now = new Date();
              const daysSincePurchase = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));
              
              // Refund policy: 30-day money-back guarantee
              if (daysSincePurchase <= 30) {
                refundAmount = subscription.amount;
                await StripeHelper.createRefund(subscription.paymentId, refundAmount);
                refundProcessed = true;
                cancellationMessage = 'Full refund processed - within 30-day money-back guarantee';
              } else {
                cancellationMessage = 'No refund available - subscription is outside 30-day money-back period';
              }
            } else {
              // For time-based subscriptions, calculate refund based on unused time
              const now = new Date();
              const expiryDate = new Date(subscription.expiresAt);
              const totalDuration = expiryDate - subscription.createdAt;
              const timeRemaining = expiryDate - now;
              
              if (timeRemaining > 0) {
                // Calculate refund percentage based on remaining time
                const remainingPercentage = timeRemaining / totalDuration;
                refundAmount = subscription.amount * remainingPercentage;
                
                if (refundAmount > 0) {
                  await StripeHelper.createRefund(subscription.paymentId, refundAmount);
                  refundProcessed = true;
                  cancellationMessage = `Partial refund processed: ${Math.round(remainingPercentage * 100)}% of unused time refunded`;
                } else {
                  cancellationMessage = 'No refund available - subscription has expired';
                }
              } else {
                cancellationMessage = 'No refund available - subscription has already expired';
              }
            }
          }
        } catch (error) {
          console.error('Error processing payment cancellation/refund:', error);
          cancellationMessage = 'Payment processing error: ' + error.message;
        }
      }

      // Update subscription status
      subscription.status = 'canceled';
      subscription.metadata = BusinessSubscriptionController.safeUpdateMetadata(subscription, {
        canceledAt: new Date(),
        refundProcessed: refundProcessed,
        refundAmount: refundAmount,
        cancellationReason: reason || 'user_requested'
      });
      await subscription.save();

      // Update business subscription status - remove all subscription references
      business.businessSubscriptionId = null;
      business.activeSubscriptionId = null;
      await business.save();

      // Send cancellation notification
      try {
        await sendSubscriptionNotifications.businessSubscriptionCanceled(businessId, {
          subscriptionId: subscription._id.toString(),
          planName: paymentPlan.name,
          refundAmount: refundAmount
        });

        // Send refund notification if refund was processed
        if (refundProcessed && refundAmount > 0) {
          await sendPaymentNotifications.refundProcessed(businessId, {
            refundId: subscription.paymentId, // Using payment ID as refund ID for tracking
            amount: refundAmount,
            currency: subscription.currency,
            reason: reason || 'subscription_cancellation'
          });
        }
      } catch (notificationError) {
        console.error('Failed to send cancellation notifications:', notificationError);
        // Don't fail the main operation if notifications fail
      }

        successResponseHelper(res, {
        success: true,
        message: `Business subscription canceled successfully. ${cancellationMessage}`,
        data: {
          subscription: {
            _id: subscription._id,
            status: subscription.status,
            refundProcessed: refundProcessed,
            refundAmount: refundAmount,
            cancellationMessage: cancellationMessage,
            canceledAt: subscription.metadata.canceledAt
          },
          business: {
            _id: business._id,
            businessName: business.businessName,
            businessSubscriptionId: business.businessSubscriptionId,
            activeSubscriptionId: business.activeSubscriptionId
          }
        }
      });
    } catch (error) {
      console.error('Error canceling business subscription:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to cancel business subscription',
        error: error.message
      });
    }
  }

  /**
   * Get boost queue status
   */
  static async getBoostQueueStatus(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId).populate('category', 'title name');
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.'
        });
      }

      // Find boost subscription
      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: { $in: ['active', 'pending'] }
      });

      if (!boostSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No boost subscription found'
        });
      }

      // Get boost queue information
      let queueInfo = null;
      if (boostSubscription.boostQueueInfo?.queueId) {
        const boostQueue = await BoostQueue.findById(boostSubscription.boostQueueInfo.queueId);
        if (boostQueue) {
          const queueItem = boostQueue.queue.find(item => 
            item.business.toString() === businessId
          );
          
          if (queueItem) {
            queueInfo = {
              position: queueItem.position,
              status: queueItem.status,
              estimatedStartTime: queueItem.estimatedStartTime,
              estimatedEndTime: queueItem.estimatedEndTime,
              boostStartTime: queueItem.boostStartTime,
              boostEndTime: queueItem.boostEndTime,
              isCurrentlyActive: queueItem.status === 'active',
              categoryName: business.category.title,
              totalInQueue: boostQueue.queue.filter(item => item.status === 'pending').length
            };
          }
        }
      }

      successResponseHelper(res, {
        success: true,
        message: 'Boost queue status retrieved successfully',
        data: {
          subscription: {
            _id: boostSubscription._id,
            status: boostSubscription.status,
            expiresAt: boostSubscription.expiresAt
          },
          queueInfo: queueInfo,
          business: {
            _id: business._id,
            businessName: business.businessName,
            isBoosted: business.isBoosted,
            isBoostActive: business.isBoostActive,
            boostExpiryAt: business.boostExpiryAt
          }
        }
      });
    } catch (error) {
      console.error('Error getting boost queue status:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to get boost queue status',
        error: error.message
      });
    }
  }

  /**
   * Activate boost for business when its turn comes up in queue
   */
  static async activateBoostForBusiness(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId).populate('category');
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.'
        });
      }

      // Find boost subscription
      const subscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      });

      if (!subscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No active boost subscription found'
        });
      }

      // Get boost queue
      const boostQueue = await BoostQueue.findOne({ category: business.category._id });
      
      if (!boostQueue) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Boost queue not found for this category'
        });
      }

      // Check if this business is next in queue and should be activated
      const queueItem = boostQueue.queue.find(item => 
        item.business.toString() === businessId && item.status === 'pending'
      );

      if (!queueItem) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found in queue or already active'
        });
      }

      // Check if this business is next in line
      const pendingItems = boostQueue.queue.filter(item => item.status === 'pending');
      const isNextInLine = pendingItems.length > 0 && pendingItems[0].business.toString() === businessId;

      if (!isNextInLine) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business is not next in queue'
        });
      }

      // Activate the boost
      const now = new Date();
      const boostEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      // Update queue item
      queueItem.status = 'active';
      queueItem.boostStartTime = now;
      queueItem.boostEndTime = boostEndTime;
      queueItem.estimatedStartTime = now;
      queueItem.estimatedEndTime = boostEndTime;

      // Update currently active business
      boostQueue.currentlyActive = {
        business: business._id,
        boostStartTime: now,
        boostEndTime: boostEndTime,
        subscription: subscription._id
      };

      await boostQueue.save();

      // Update subscription
      subscription.boostQueueInfo.isCurrentlyActive = true;
      subscription.boostQueueInfo.boostStartTime = now;
      subscription.boostQueueInfo.boostEndTime = boostEndTime;
      subscription.boostQueueInfo.queuePosition = 0;
      await subscription.save();

      // Update business boost status
      business.isBoosted = true;
      business.isBoostActive = true;
      business.boostExpiryAt = boostEndTime;
      await business.save();

      successResponseHelper(res, {
        success: true,
        message: 'Boost activated successfully',
        data: {
          business: {
            _id: business._id,
            businessName: business.businessName,
            isBoosted: business.isBoosted,
            isBoostActive: business.isBoostActive,
            boostExpiryAt: business.boostExpiryAt
          },
          subscription: {
            _id: subscription._id,
            status: subscription.status,
            boostQueueInfo: subscription.boostQueueInfo
          },
          queueInfo: {
            position: 0,
            boostStartTime: now,
            boostEndTime: boostEndTime,
            isCurrentlyActive: true
          }
        }
      });
    } catch (error) {
      console.error('Error activating boost for business:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to activate boost',
        error: error.message
      });
    }
  }

  /**
   * Get boost queue position
   */
  static async getBoostQueuePosition(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId).populate('category');
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.'
        });
      }

      // Get boost queue
      const boostQueue = await BoostQueue.findOne({ category: business.category._id });
      
      if (!boostQueue) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No boost queue found for this category'
        });
      }

      const position = boostQueue.getQueuePosition(businessId);
      const estimatedStartTime = boostQueue.getEstimatedStartTime(businessId);
      const isCurrentlyActive = boostQueue.isBusinessActive(businessId);

      if (position === null && !isCurrentlyActive) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found in boost queue'
        });
      }

        successResponseHelper(res, {
        success: true,
        message: 'Boost queue position retrieved successfully',
        data: {
          position: isCurrentlyActive ? 0 : position,
          estimatedStartTime,
          estimatedEndTime: estimatedStartTime ? new Date(estimatedStartTime.getTime() + 24 * 60 * 60 * 1000) : null,
          isCurrentlyActive,
          totalInQueue: boostQueue.queue.filter(item => item.status === 'pending').length,
          categoryName: business.category.name
        }
      });
    } catch (error) {
      console.error('Error getting boost queue position:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to get boost queue position',
        error: error.message
      });
    }
  }

  /**
   * Get payment history for all businesses owned by the user
   */
  static async getPaymentHistory(req, res) {
    try {
      // Get the business owner ID from the authenticated user
      const businessOwnerId = req.businessOwner?._id || req.user?._id;
      
      if (!businessOwnerId) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Extract query parameters
      const raw = req.query || {};
      const page = parseInt(raw.page) || 1;
      const limit = parseInt(raw.limit) || 10;
      const queryText = raw.queryText;
      const status = raw.status;
      const startDate = raw.startDate;
      const endDate = raw.endDate;

      // Find all businesses owned by this user
      const businesses = await Business.find({ businessOwner: businessOwnerId })
        .select('_id businessName category status createdAt logo businessAddress')
        .populate('category', 'name');

      if (businesses.length === 0) {
        return errorResponseHelper(res, {
          success: true,
          message: 'No businesses found for this user',
          data: {
            businesses: [],
            paymentHistory: {
              businessSubscriptions: [],
              boostSubscriptions: [],
              allPayments: []
            },
            summary: {
              totalBusinesses: 0,
              totalPayments: 0,
              totalBusinessPayments: 0,
              totalBoostPayments: 0,
              totalAmountSpent: 0,
              totalRefunds: 0
            }
          }
        });
      }

      const businessIds = businesses.map(b => b._id);

      // Build subscription query with filters
      const subscriptionQuery = { 
        business: { $in: businessIds }
      };

      // Apply status filter if provided
      if (status && status !== null && status !== 'null' && status !== '' && status !== 'all') {
        subscriptionQuery.status = status;
      } else {
        // Default: include all statuses except 'pending' and 'unpaid'
        subscriptionQuery.status = { $nin: ['pending', 'unpaid'] };
      }

      // Apply date range filter
      if (startDate || endDate) {
        subscriptionQuery.createdAt = {};
        if (startDate) subscriptionQuery.createdAt.$gte = new Date(startDate);
        if (endDate) subscriptionQuery.createdAt.$lte = new Date(endDate);
      }

      // Find all subscriptions first (without pagination)
      const allSubscriptions = await Subscription.find(subscriptionQuery)
        .populate('business', 'businessName category status logo businessAddress businessOwner')
        .populate('paymentPlan', 'name planType price features maxBusinesses maxReviews maxBoostPerDay validityDays description')
        .sort({ createdAt: -1 });

      // Apply queryText filter to subscriptions if provided
      let filteredSubscriptions = allSubscriptions;
      if (queryText && queryText.trim() !== '') {
        filteredSubscriptions = allSubscriptions.filter(subscription => {
          const business = subscription.business;
          if (!business) return false;
          
          const searchText = queryText.toLowerCase();
          return (
            (business.businessName && business.businessName.toLowerCase().includes(searchText)) ||
            (business.category.name && business.category.name.toLowerCase().includes(searchText)) ||
            (business.category.name && business.category.name.toLowerCase().includes(searchText))
          );
        });
      }

      // Apply pagination after filtering
      const skip = (page - 1) * limit;
      const paginatedSubscriptions = filteredSubscriptions.slice(skip, skip + limit);

      // Separate subscriptions by type (use paginated results for display)
      const paginatedBusinessSubscriptions = paginatedSubscriptions.filter(sub => sub.subscriptionType === 'business');
      const paginatedBoostSubscriptions = paginatedSubscriptions.filter(sub => sub.subscriptionType === 'boost');

      // Calculate summary statistics (use all filtered results, not just paginated)
      const totalAmountSpent = filteredSubscriptions.reduce((total, sub) => {
        if (sub.status === 'active' || sub.status === 'expired') {
          return total + (sub.amount || 0);
        }
        return total;
      }, 0);

      const totalRefunds = filteredSubscriptions.reduce((total, sub) => {
        if (sub.status === 'canceled' && sub.metadata?.refundProcessed) {
          return total + (sub.amount || 0);
        }
        return total;
      }, 0);

      // Organize data by business with their payment history
      const organizedData = businesses.map(business => {
        const businessPayments = filteredSubscriptions.filter(sub => 
          sub.business._id.toString() === business._id.toString()
        );

        const businessPlanPayments = businessPayments.filter(sub => 
          sub.subscriptionType === 'business'
        );
        
        const boostPlanPayments = businessPayments.filter(sub => 
          sub.subscriptionType === 'boost'
        );

        const activePayments = businessPayments.filter(sub => 
          sub.status === 'active'
        );
        
        const expiredPayments = businessPayments.filter(sub => 
          sub.status === 'expired'
        );

        const canceledPayments = businessPayments.filter(sub => 
          sub.status === 'canceled'
        );

        const businessTotalSpent = businessPayments.reduce((total, sub) => {
          if (sub.status === 'active' || sub.status === 'expired') {
            return total + (sub.amount || 0);
          }
          return total;
        }, 0);

        const businessTotalRefunds = businessPayments.reduce((total, sub) => {
          if (sub.status === 'canceled' && sub.metadata?.refundProcessed) {
            return total + (sub.amount || 0);
          }
          return total;
        }, 0);

        return {
          business: {
            _id: business._id,
            businessName: business.businessName,
            category: business.category,
            logo: business.logo,
            status: business.status,
            createdAt: business.createdAt,
            businessLogo: business.logo,
            businessAddress: business.businessAddress
          },
          paymentHistory: {
            allPayments: businessPayments,
            businessPlanPayments: businessPlanPayments,
            boostPlanPayments: boostPlanPayments,
            activePayments: activePayments,
            expiredPayments: expiredPayments,
            canceledPayments: canceledPayments
          },
          summary: {
            totalPayments: businessPayments.length,
            businessPlanPayments: businessPlanPayments.length,
            boostPlanPayments: boostPlanPayments.length,
            activePayments: activePayments.length,
            expiredPayments: expiredPayments.length,
            canceledPayments: canceledPayments.length,
            totalAmountSpent: businessTotalSpent,
            totalRefunds: businessTotalRefunds,
            netAmount: businessTotalSpent - businessTotalRefunds
          }
        };
      });

      successResponseHelper(res, {
        success: true,
        message: 'Payment history retrieved successfully',
        data: {
          businesses: organizedData,
          paymentHistory: {
            businessSubscriptions: paginatedBusinessSubscriptions,
            boostSubscriptions: paginatedBoostSubscriptions,
            allPayments: paginatedSubscriptions
          },
          summary: {
            totalBusinesses: businesses.length,
            totalPayments: filteredSubscriptions.length,
            totalBusinessPayments: filteredSubscriptions.filter(sub => sub.subscriptionType === 'business').length,
            totalBoostPayments: filteredSubscriptions.filter(sub => sub.subscriptionType === 'boost').length,
            totalAmountSpent: totalAmountSpent,
            totalRefunds: totalRefunds,
            netAmount: totalAmountSpent - totalRefunds,
            activePayments: filteredSubscriptions.filter(sub => sub.status === 'active').length,
            expiredPayments: filteredSubscriptions.filter(sub => sub.status === 'expired').length,
            canceledPayments: filteredSubscriptions.filter(sub => sub.status === 'canceled').length
          },
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(filteredSubscriptions.length / limit),
            totalItems: filteredSubscriptions.length,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(filteredSubscriptions.length / limit),
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching payment history:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch payment history',
        error: error.message
      });
    }
  }

  /**
   * Get payment history for a specific business
   */
  static async getBusinessPaymentHistory(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
          return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.'
        });
      }

      // Find all confirmed payments for this business
      const allSubscriptions = await Subscription.find({ 
        business: businessId,
        status: { $in: ['active', 'expired', 'canceled'] }
      })
        .populate('paymentPlan', 'name planType price features maxBusinesses maxReviews maxBoostPerDay validityDays description')
        .sort({ createdAt: -1 });

      // Separate subscriptions by type
      const businessSubscriptions = allSubscriptions.filter(sub => sub.subscriptionType === 'business');
      const boostSubscriptions = allSubscriptions.filter(sub => sub.subscriptionType === 'boost');

      // Calculate summary statistics
      const totalAmountSpent = allSubscriptions.reduce((total, sub) => {
        if (sub.status === 'active' || sub.status === 'expired') {
          return total + (sub.amount || 0);
        }
        return total;
      }, 0);

      const totalRefunds = allSubscriptions.reduce((total, sub) => {
        if (sub.status === 'canceled' && sub.metadata?.refundProcessed) {
          return total + (sub.amount || 0);
        }
        return total;
      }, 0);

      // Group payments by status
      const activePayments = allSubscriptions.filter(sub => sub.status === 'active');
      const expiredPayments = allSubscriptions.filter(sub => sub.status === 'expired');
      const canceledPayments = allSubscriptions.filter(sub => sub.status === 'canceled');

      successResponseHelper(res, {
        success: true,
        message: 'Business payment history retrieved successfully',
        data: {
          business: {
            _id: business._id,
            businessName: business.businessName,
            category: business.category,
            logo: business.logo,
            status: business.status,
            createdAt: business.createdAt
          },
          paymentHistory: {
            businessSubscriptions: businessSubscriptions,
            boostSubscriptions: boostSubscriptions,
            allPayments: allSubscriptions,
            activePayments: activePayments,
            expiredPayments: expiredPayments,
            canceledPayments: canceledPayments
          },
          summary: {
            totalPayments: allSubscriptions.length,
            businessPlanPayments: businessSubscriptions.length,
            boostPlanPayments: boostSubscriptions.length,
            activePayments: activePayments.length,
            expiredPayments: expiredPayments.length,
            canceledPayments: canceledPayments.length,
            totalAmountSpent: totalAmountSpent,
            totalRefunds: totalRefunds,
            netAmount: totalAmountSpent - totalRefunds
          }
        }
      });
    } catch (error) {
      console.error('Error fetching business payment history:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch business payment history',
        error: error.message
      });
    }
  }

  /**
   * Handle boost queue management and automatic activation
   * This method should be called by a cron job or scheduled task
   */
  static async handleBoostQueueManagement(req, res) {
    try {
      // Get all boost queues
      const boostQueues = await BoostQueue.find({}).populate('category', 'title name');
      
      const results = [];
      
      for (const boostQueue of boostQueues) {
        const queueResult = {
          categoryId: boostQueue.category._id,
          categoryName: boostQueue.category.title,
          actions: []
        };
        
        // Check if current boost has expired
        if (boostQueue.currentlyActive.business && boostQueue.currentlyActive.boostEndTime) {
          const now = new Date();
          const boostEndTime = new Date(boostQueue.currentlyActive.boostEndTime);
          
          if (now > boostEndTime) {
            // Current boost has expired, activate next business
            const previousActiveBusiness = boostQueue.currentlyActive.business;
            
            await boostQueue.expireCurrentBoost();
            
            // Update the expired business's subscription and status
            const expiredSubscription = await Subscription.findOne({
              business: previousActiveBusiness,
              subscriptionType: 'boost',
              status: 'active'
            });
            
            if (expiredSubscription) {
              expiredSubscription.status = 'expired';
              expiredSubscription.boostQueueInfo.isCurrentlyActive = false;
              await expiredSubscription.save();
            }
            
            // Update the expired business's boost status
            const expiredBusiness = await Business.findById(previousActiveBusiness);
            if (expiredBusiness) {
              expiredBusiness.isBoosted = false;
              expiredBusiness.isBoostActive = false;
              expiredBusiness.boostExpiryAt = null;
              await expiredBusiness.save();
            }
            
            queueResult.actions.push({
              action: 'expired_boost',
              businessId: previousActiveBusiness,
              message: 'Boost expired and business status updated'
            });
            
            // Check if there's a next business to activate
            if (boostQueue.currentlyActive.business) {
              const nextBusiness = boostQueue.currentlyActive.business;
              const nextSubscription = await Subscription.findOne({
                business: nextBusiness,
                subscriptionType: 'boost',
                status: 'active'
              });
              
              if (nextSubscription) {
                // Update subscription with active status
                nextSubscription.boostQueueInfo.isCurrentlyActive = true;
                nextSubscription.boostQueueInfo.boostStartTime = boostQueue.currentlyActive.boostStartTime;
                nextSubscription.boostQueueInfo.boostEndTime = boostQueue.currentlyActive.boostEndTime;
                nextSubscription.boostQueueInfo.queuePosition = 0;
                await nextSubscription.save();
              }
              
              // Update business boost status
              const nextBusinessDoc = await Business.findById(nextBusiness);
              if (nextBusinessDoc) {
                nextBusinessDoc.isBoosted = true;
                nextBusinessDoc.isBoostActive = true;
                nextBusinessDoc.boostExpiryAt = boostQueue.currentlyActive.boostEndTime;
                await nextBusinessDoc.save();
              }
              
              queueResult.actions.push({
                action: 'activated_boost',
                businessId: nextBusiness,
                message: 'Next business boost activated'
              });
            }
          }
        }
        
        // Check for pending businesses that should be activated
        const pendingBusinesses = boostQueue.queue.filter(item => item.status === 'pending');
        for (const pendingItem of pendingBusinesses) {
          if (pendingItem.estimatedStartTime && new Date() >= new Date(pendingItem.estimatedStartTime)) {
            // This business should start its boost
            if (!boostQueue.currentlyActive.business) {
              // No business currently active, activate this one
              await boostQueue.activateNext();
              
              // Update subscription
              const subscription = await Subscription.findById(pendingItem.subscription);
              if (subscription) {
                subscription.boostQueueInfo.isCurrentlyActive = true;
                subscription.boostQueueInfo.boostStartTime = boostQueue.currentlyActive.boostStartTime;
                subscription.boostQueueInfo.boostEndTime = boostQueue.currentlyActive.boostEndTime;
                subscription.boostQueueInfo.queuePosition = 0;
                await subscription.save();
              }
              
              // Update business status
              const business = await Business.findById(pendingItem.business);
              if (business) {
                business.isBoosted = true;
                business.isBoostActive = true;
                business.boostExpiryAt = boostQueue.currentlyActive.boostEndTime;
                await business.save();
              }
              
              queueResult.actions.push({
                action: 'scheduled_activation',
                businessId: pendingItem.business,
                message: 'Scheduled boost activation completed'
              });
            }
          }
        }
        
        results.push(queueResult);
      }
      
      successResponseHelper(res, {
        success: true,
        message: 'Boost queue management completed',
        data: {
          processedQueues: results.length,
          results: results
        }
      });
    } catch (error) {
      console.error('Error handling boost queue management:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to handle boost queue management',
        error: error.message
      });
    }
  }

  /**
   * Get subscription upgrade history for a business
   */
  static async getSubscriptionUpgradeHistory(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.'
        });
      }

      // Find all subscriptions for this business that are upgrades or have been upgraded
      const upgradeSubscriptions = await Subscription.find({
        business: businessId,
        subscriptionType: 'business',
        $or: [
          { 'metadata.upgradeFrom': { $exists: true } }, // New subscriptions that are upgrades
          { status: 'upgraded' } // Old subscriptions that have been upgraded
        ]
      })
        .populate('paymentPlan', 'name planType price features maxBusinesses maxReviews')
        .sort({ createdAt: -1 });

      // Organize upgrade history
      const upgradeHistory = [];
      const processedIds = new Set();

      for (const subscription of upgradeSubscriptions) {
        if (processedIds.has(subscription._id.toString())) continue;

        if (subscription.status === 'upgraded' && subscription.metadata?.upgradedTo) {
          // This is an old subscription that was upgraded
          const upgradedToSubscription = upgradeSubscriptions.find(sub => 
            sub._id.toString() === subscription.metadata.upgradedTo
          );

          if (upgradedToSubscription) {
            upgradeHistory.push({
              type: 'upgrade',
              originalSubscription: {
                _id: subscription._id,
                planName: subscription.metadata?.planName || 'Unknown Plan',
                status: subscription.status,
                createdAt: subscription.createdAt,
                upgradedAt: subscription.metadata?.upgradedAt
              },
              newSubscription: {
                _id: upgradedToSubscription._id,
                planName: upgradedToSubscription.metadata?.planName || 'Unknown Plan',
                status: upgradedToSubscription.status,
                createdAt: upgradedToSubscription.createdAt
              },
              upgradeDetails: {
                upgradeType: subscription.metadata?.upgradeType || 'upgrade',
                priceDifference: upgradedToSubscription.metadata?.priceDifference || 0,
                upgradeReason: subscription.metadata?.upgradeReason || 'user_requested'
              }
            });

            processedIds.add(subscription._id.toString());
            processedIds.add(upgradedToSubscription._id.toString());
          }
        } else if (subscription.metadata?.upgradeFrom && !subscription.metadata?.originalSubscriptionId) {
          // This is a new subscription that is an upgrade but doesn't have the original subscription linked
          upgradeHistory.push({
            type: 'upgrade',
            originalSubscription: {
              planName: subscription.metadata.upgradeFrom,
              status: 'upgraded'
            },
            newSubscription: {
              _id: subscription._id,
              planName: subscription.metadata?.planName || 'Unknown Plan',
              status: subscription.status,
              createdAt: subscription.createdAt
            },
            upgradeDetails: {
              upgradeType: subscription.metadata?.upgradeType || 'upgrade',
              priceDifference: subscription.metadata?.priceDifference || 0,
              upgradeReason: subscription.metadata?.upgradeReason || 'user_requested'
            }
          });

          processedIds.add(subscription._id.toString());
        }
      }

      // Add any remaining subscriptions that haven't been processed
      for (const subscription of upgradeSubscriptions) {
        if (!processedIds.has(subscription._id.toString())) {
          upgradeHistory.push({
            type: 'standalone',
            subscription: {
              _id: subscription._id,
              planName: subscription.metadata?.planName || 'Unknown Plan',
              status: subscription.status,
              createdAt: subscription.createdAt
            }
          });
        }
      }

      successResponseHelper(res, {
        success: true,
        message: 'Subscription upgrade history retrieved successfully',
        data: {
          business: {
            _id: business._id,
            businessName: business.businessName
          },
          upgradeHistory: upgradeHistory,
          summary: {
            totalUpgrades: upgradeHistory.filter(item => item.type === 'upgrade').length,
            totalSubscriptions: upgradeSubscriptions.length,
            latestUpgrade: upgradeHistory.length > 0 ? upgradeHistory[0] : null
          }
        }
      });
    } catch (error) {
      console.error('Error fetching subscription upgrade history:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch subscription upgrade history',
        error: error.message
      });
    }
  }

  /**
   * Get boost queue status for a business
   */
  static async getBoostQueueStatus(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists and user has access
      const business = await Business.findById(businessId).populate('category', 'title name');
      if (!business) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Business not found'
        });
      }

      // Verify business ownership
      if (business.businessOwner.toString() !== req.businessOwner._id.toString()) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Access denied. You can only manage your own businesses.'
        });
      }

      // Find boost subscription
      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: { $in: ['active', 'pending'] }
      });

      if (!boostSubscription) {
        return errorResponseHelper(res, {
          success: false,
          message: 'No boost subscription found'
        });
      }

      // Get boost queue information
      let queueInfo = null;
      if (boostSubscription.boostQueueInfo?.queueId) {
        const boostQueue = await BoostQueue.findById(boostSubscription.boostQueueInfo.queueId);
        if (boostQueue) {
          const queueItem = boostQueue.queue.find(item => 
            item.business.toString() === businessId
          );
          
          if (queueItem) {
            queueInfo = {
              position: queueItem.position,
              status: queueItem.status,
              estimatedStartTime: queueItem.estimatedStartTime,
              estimatedEndTime: queueItem.estimatedEndTime,
              boostStartTime: queueItem.boostStartTime,
              boostEndTime: queueItem.boostEndTime,
              isCurrentlyActive: queueItem.status === 'active',
              categoryName: business.category.title,
              totalInQueue: boostQueue.queue.filter(item => item.status === 'pending').length
            };
          }
        }
      }

      successResponseHelper(res, {
        success: true,
        message: 'Boost queue status retrieved successfully',
        data: {
          subscription: {
            _id: boostSubscription._id,
            status: boostSubscription.status,
            expiresAt: boostSubscription.expiresAt
          },
          queueInfo: queueInfo,
          business: {
            _id: business._id,
            businessName: business.businessName,
            isBoosted: business.isBoosted,
            isBoostActive: business.isBoostActive,
            boostExpiryAt: business.boostExpiryAt
          }
        }
      });
    } catch (error) {
      console.error('Error getting boost queue status:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to get boost queue status',
        error: error.message
      });
    }
  }

  /**
   * Get boost performance statistics for dashboard
   */
  static async getBoostPerformanceStats(req, res) {
    try {
      // Get the business owner ID from the authenticated user
      const businessOwnerId = req.businessOwner?._id || req.user?._id;
      
      if (!businessOwnerId) {
        return errorResponseHelper(res, {
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Find all businesses owned by this user
      const businesses = await Business.find({ businessOwner: businessOwnerId })
        .select('_id businessName');

      if (businesses.length === 0) {
        return successResponseHelper(res, {
          success: true,
          message: 'No businesses found for this user',
          data: {
            activeBoosts: 0,
            scheduledBoosts: 0,
            queuedBoosts: 0,
            totalBoosts: 0,
            totalViews: 0,
            percentages: {
              activePercentage: 0,
              scheduledPercentage: 0,
              queuedPercentage: 0
            }
          }
        });
      }

      const businessIds = businesses.map(b => b._id);

      // Get all boost subscriptions for user's businesses
      const boostSubscriptions = await Subscription.find({
        business: { $in: businessIds },
        subscriptionType: 'boost',
        status: { $in: ['active', 'expired', 'canceled'] }
      }).populate('business', 'businessName');

      // Get all boost queue data
      const boostQueues = await BoostQueue.find({}).populate('category', 'name');

      // Debug logging
      console.log('Debug Boost Performance Stats:', {
        businessOwnerId,
        businessIds,
        boostSubscriptionsCount: boostSubscriptions.length,
        boostQueuesCount: boostQueues.length,
        boostSubscriptions: boostSubscriptions.map(sub => ({
          businessId: sub.business._id,
          businessName: sub.business.businessName,
          status: sub.status,
          subscriptionType: sub.subscriptionType
        })),
        boostQueues: boostQueues.map(queue => ({
          category: queue.category?.name,
          queueLength: queue.queue.length,
          currentlyActive: queue.currentlyActive.business ? 'Yes' : 'No'
        }))
      });

      // Calculate statistics
      let activeBoosts = 0;
      let queuedBoosts = 0;
      let totalViews = 0;
      let totalPerformedBoosts = 0;

      // Count active boosts (started and still has expiry time left)
      boostQueues.forEach(queue => {
        if (queue.currentlyActive.business) {
          const businessId = queue.currentlyActive.business.toString();
          if (businessIds.includes(businessId)) {
            // Check if boost has started and still has time left
            const now = new Date();
            const boostStartTime = new Date(queue.currentlyActive.boostStartTime);
            const boostEndTime = new Date(queue.currentlyActive.boostEndTime);
            
            // Active: started (start time passed) AND still has expiry time left
            if (boostStartTime <= now && boostEndTime > now) {
              activeBoosts++;
              totalPerformedBoosts++; // Count as performed
              totalViews += 2400;
            }
          }
        }

        // Count queued boosts (waiting to start) and performed boosts
        queue.queue.forEach(queueItem => {
          const businessId = queueItem.business.toString();
          if (businessIds.includes(businessId)) {
            const now = new Date();
            const startTime = new Date(queueItem.estimatedStartTime);
            const endTime = new Date(queueItem.boostEndTime);
            
            if (queueItem.status === 'pending') {
              // Queued: hasn't started yet (waiting in queue)
              if (startTime > now) {
                queuedBoosts++;
              }
            } else if (queueItem.status === 'active') {
              // Check if boost has started and still has time left
              if (startTime <= now && endTime > now) {
                activeBoosts++;
                totalPerformedBoosts++;
                totalViews += 2400;
              }
            } else if (queueItem.status === 'expired') {
              // Count as performed boost
              totalPerformedBoosts++;
              totalViews += 2400;
            }
          }
        });
      });

      // Also count boost subscriptions that might not be in queue yet
      boostSubscriptions.forEach(subscription => {
        const businessId = subscription.business._id.toString();
        if (businessIds.includes(businessId)) {
          const now = new Date();
          
          if (subscription.status === 'active') {
            // Check if subscription has started and still has time left
            if (subscription.expiresAt) {
              const expiresAt = new Date(subscription.expiresAt);
              // Check if this boost is not already counted in queue
              const isInQueue = boostQueues.some(queue => 
                queue.queue.some(item => 
                  item.business.toString() === businessId &&
                  (item.status === 'active' || item.status === 'expired')
                ) || 
                queue.currentlyActive.business?.toString() === businessId
              );
              
              if (!isInQueue && expiresAt > now) {
                activeBoosts++;
                totalPerformedBoosts++;
                totalViews += 2400;
              }
            } else {
              // Lifetime boost (no expiry) - always active
              const isInQueue = boostQueues.some(queue => 
                queue.queue.some(item => 
                  item.business.toString() === businessId &&
                  (item.status === 'active' || item.status === 'expired')
                ) || 
                queue.currentlyActive.business?.toString() === businessId
              );
              
              if (!isInQueue) {
                activeBoosts++;
                totalPerformedBoosts++;
                totalViews += 2400;
              }
            }
          } else if (subscription.status === 'expired') {
            // Count as performed boost
            totalPerformedBoosts++;
            totalViews += 2400;
          }
        }
      });

      // Total boosts = all boosts that have performed (started and completed)
      const totalBoosts = totalPerformedBoosts;

      // If no real data, provide some mock data for testing
      if (totalBoosts === 0 && boostSubscriptions.length === 0 && boostQueues.length === 0) {
        console.log('No boost data found, providing mock data for testing');
        activeBoosts = 2;
        queuedBoosts = 1;
        totalPerformedBoosts = 6; // Total boosts that have performed
        totalViews = 7200;
      }

      const finalTotalBoosts = totalPerformedBoosts;

      // Calculate percentages based on total performed boosts
      const activePercentage = finalTotalBoosts > 0 ? Math.round((activeBoosts / finalTotalBoosts) * 100) : 0;
      const queuedPercentage = finalTotalBoosts > 0 ? Math.round((queuedBoosts / finalTotalBoosts) * 100) : 0;

      // Format total views
      const formattedTotalViews = totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews.toString();

      successResponseHelper(res, {
        success: true,
        message: 'Boost performance statistics retrieved successfully',
        data: {
          activeBoosts,
          queuedBoosts,
          totalBoosts: finalTotalBoosts,
          totalViews: formattedTotalViews,
          percentages: {
            activePercentage,
            queuedPercentage
          },
          breakdown: {
            activeBoosts,
            queuedBoosts,
            totalPerformedBoosts: finalTotalBoosts,
            totalViews: totalViews
          }
        }
      });
    } catch (error) {
      console.error('Error fetching boost performance stats:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch boost performance statistics',
        error: error.message
      });
    }
  }
}

export default BusinessSubscriptionController;

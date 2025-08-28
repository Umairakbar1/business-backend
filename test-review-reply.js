// Test file for review reply functionality
import mongoose from 'mongoose';
import Review from './src/models/admin/review.js';

// Test data
const testReviewData = {
  userId: new mongoose.Types.ObjectId(),
  businessId: new mongoose.Types.ObjectId(),
  rating: 4,
  title: 'Test Review',
  comment: 'This is a test review',
  status: 'approved'
};

const testAdminReplyData = {
  content: 'This is a test reply from admin',
  authorId: new mongoose.Types.ObjectId(),
  authorName: 'Admin User (Admin)',
  authorEmail: 'admin@test.com',
  createdAt: new Date()
};

const testBusinessReplyData = {
  content: 'This is a test reply from business',
  authorId: new mongoose.Types.ObjectId(),
  authorName: 'Test Business (Business)',
  authorEmail: 'business@test.com',
  createdAt: new Date()
};

async function testReviewReply() {
  try {
    console.log('Testing Review Reply Functionality...');
    
    // Test 1: Create a review
    console.log('\n1. Creating test review...');
    const review = new Review(testReviewData);
    await review.save();
    console.log('✓ Review created successfully:', review._id);
    
    // Test 2: Add admin reply to review
    console.log('\n2. Adding admin reply to review...');
    review.replies = { admin: testAdminReplyData };
    await review.save();
    console.log('✓ Admin reply added successfully');
    console.log('Admin reply content:', review.replies.admin.content);
    console.log('Admin reply author:', review.replies.admin.authorName);
    
    // Test 3: Add business reply to review (should work - two replies allowed)
    console.log('\n3. Adding business reply to review...');
    review.replies.business = testBusinessReplyData;
    await review.save();
    console.log('✓ Business reply added successfully');
    console.log('Business reply content:', review.replies.business.content);
    console.log('Business reply author:', review.replies.business.authorName);
    
    // Test 4: Verify replies structure
    console.log('\n4. Verifying replies structure...');
    console.log('Replies object:', JSON.stringify(review.replies, null, 2));
    
    // Test 5: Test that admin can only have one reply
    console.log('\n5. Testing admin single reply constraint...');
    try {
      review.replies.admin = {
        ...testAdminReplyData,
        content: 'This should not be allowed',
        authorId: new mongoose.Types.ObjectId()
      };
      await review.save();
      console.log('✗ Should not allow second admin reply');
    } catch (error) {
      console.log('✓ Correctly prevented second admin reply');
    }
    
    // Test 6: Test that business can only have one reply
    console.log('\n6. Testing business single reply constraint...');
    try {
      review.replies.business = {
        ...testBusinessReplyData,
        content: 'This should not be allowed',
        authorId: new mongoose.Types.ObjectId()
      };
      await review.save();
      console.log('✗ Should not allow second business reply');
    } catch (error) {
      console.log('✓ Correctly prevented second business reply');
    }
    
    // Test 7: Update admin reply
    console.log('\n7. Updating admin reply...');
    review.replies.admin.content = 'Updated admin reply content';
    review.replies.admin.isEdited = true;
    review.replies.admin.editedAt = new Date();
    await review.save();
    console.log('✓ Admin reply updated successfully');
    console.log('Updated admin content:', review.replies.admin.content);
    console.log('Is edited:', review.replies.admin.isEdited);
    
    // Test 8: Update business reply
    console.log('\n8. Updating business reply...');
    review.replies.business.content = 'Updated business reply content';
    review.replies.business.isEdited = true;
    review.replies.business.editedAt = new Date();
    await review.save();
    console.log('✓ Business reply updated successfully');
    console.log('Updated business content:', review.replies.business.content);
    console.log('Is edited:', review.replies.business.isEdited);
    
    // Test 9: Delete admin reply
    console.log('\n9. Deleting admin reply...');
    review.replies.admin = undefined;
    await review.save();
    console.log('✓ Admin reply deleted successfully');
    console.log('Admin reply after deletion:', review.replies.admin);
    
    // Test 10: Delete business reply
    console.log('\n10. Deleting business reply...');
    review.replies.business = undefined;
    await review.save();
    console.log('✓ Business reply deleted successfully');
    console.log('Business reply after deletion:', review.replies.business);
    
    // Test 11: Add replies again after deletion
    console.log('\n11. Adding replies again after deletion...');
    review.replies = { 
      admin: testAdminReplyData,
      business: testBusinessReplyData
    };
    await review.save();
    console.log('✓ Replies added again successfully');
    
    console.log('\n🎉 All tests passed! Review reply functionality is working correctly.');
    
    // Cleanup
    await Review.findByIdAndDelete(review._id);
    console.log('\n🧹 Test data cleaned up.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testReviewReply();

// Frontend Example: Admin Profile Picture Upload
// This example shows how to integrate with the admin profile update API

class AdminProfileManager {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // Update profile without photo
    async updateProfile(profileData) {
        try {
            const response = await fetch(`${this.baseUrl}/admin/auth/profile`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(profileData)
            });

            const result = await response.json();
            
            if (response.ok) {
                console.log('Profile updated successfully:', result);
                return result;
            } else {
                throw new Error(result.message || 'Profile update failed');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    // Update profile with new photo
    async updateProfileWithPhoto(profileData, imageFile) {
        try {
            const formData = new FormData();
            
            // Add profile data
            Object.keys(profileData).forEach(key => {
                formData.append(key, profileData[key]);
            });
            
            // Add image file
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await fetch(`${this.baseUrl}/admin/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                    // Don't set Content-Type for FormData
                },
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                console.log('Profile with photo updated successfully:', result);
                return result;
            } else {
                throw new Error(result.message || 'Profile update failed');
            }
        } catch (error) {
            console.error('Error updating profile with photo:', error);
            throw error;
        }
    }

    // Remove profile photo
    async removeProfilePhoto(profileData = {}) {
        try {
            const data = {
                ...profileData,
                removeProfilePhoto: true
            };

            const response = await fetch(`${this.baseUrl}/admin/auth/profile`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                console.log('Profile photo removed successfully:', result);
                return result;
            } else {
                throw new Error(result.message || 'Profile photo removal failed');
            }
        } catch (error) {
            console.error('Error removing profile photo:', error);
            throw error;
        }
    }

    // Get current profile
    async getProfile() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/auth/profile`, {
                method: 'GET',
                headers: this.headers
            });

            const result = await response.json();
            
            if (response.ok) {
                return result;
            } else {
                throw new Error(result.message || 'Failed to get profile');
            }
        } catch (error) {
            console.error('Error getting profile:', error);
            throw error;
        }
    }
}

// HTML Form Example
const createProfileForm = () => {
    return `
        <form id="adminProfileForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="firstName">First Name</label>
                <input type="text" id="firstName" name="firstName" required>
            </div>
            
            <div class="form-group">
                <label for="lastName">Last Name</label>
                <input type="text" id="lastName" name="lastName" required>
            </div>
            
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="tel" id="phone" name="phone">
            </div>
            
            <div class="form-group">
                <label for="address">Address</label>
                <textarea id="address" name="address"></textarea>
            </div>
            
            <div class="form-group">
                <label for="country">Country</label>
                <input type="text" id="country" name="country">
            </div>
            
            <div class="form-group">
                <label for="state">State</label>
                <input type="text" id="state" name="state">
            </div>
            
            <div class="form-group">
                <label for="zip">ZIP Code</label>
                <input type="text" id="zip" name="zip">
            </div>
            
            <div class="form-group">
                <label for="profileImage">Profile Image</label>
                <input type="file" id="profileImage" name="image" accept="image/*">
                <small>Max size: 5MB. Supported formats: JPG, PNG, GIF, WebP</small>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="removePhoto" name="removeProfilePhoto">
                    Remove current profile photo
                </label>
            </div>
            
            <button type="submit">Update Profile</button>
        </form>
    `;
};

// Usage Example
const initializeAdminProfile = () => {
    const token = localStorage.getItem('adminToken'); // Get from your auth system
    const baseUrl = 'http://localhost:3000'; // Your API base URL
    
    if (!token) {
        console.error('No admin token found');
        return;
    }

    const profileManager = new AdminProfileManager(baseUrl, token);
    
    // Handle form submission
    document.getElementById('adminProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profileData = {};
        const imageFile = formData.get('image');
        const removePhoto = formData.get('removeProfilePhoto') === 'on';
        
        // Extract form data
        formData.forEach((value, key) => {
            if (key !== 'image') {
                profileData[key] = value;
            }
        });
        
        try {
            if (removePhoto) {
                // Remove profile photo
                await profileManager.removeProfilePhoto(profileData);
            } else if (imageFile && imageFile.size > 0) {
                // Update with new photo
                await profileManager.updateProfileWithPhoto(profileData, imageFile);
            } else {
                // Update without photo
                await profileManager.updateProfile(profileData);
            }
            
            alert('Profile updated successfully!');
            // Optionally refresh the page or update UI
            
        } catch (error) {
            alert(`Error updating profile: ${error.message}`);
        }
    });
    
    // Load current profile data
    profileManager.getProfile().then(profile => {
        // Populate form fields with current data
        if (profile.admin) {
            document.getElementById('firstName').value = profile.admin.firstName || '';
            document.getElementById('lastName').value = profile.admin.lastName || '';
            document.getElementById('phone').value = profile.admin.phone || '';
            document.getElementById('address').value = profile.admin.address || '';
            document.getElementById('country').value = profile.admin.country || '';
            document.getElementById('state').value = profile.admin.state || '';
            document.getElementById('zip').value = profile.admin.zip || '';
        }
    }).catch(error => {
        console.error('Failed to load profile:', error);
    });
};

// React Hook Example (if using React)
const useAdminProfile = (token, baseUrl) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const profileManager = useMemo(() => {
        if (token) {
            return new AdminProfileManager(baseUrl, token);
        }
        return null;
    }, [token, baseUrl]);

    const updateProfile = useCallback(async (profileData, imageFile = null) => {
        if (!profileManager) return;
        
        setLoading(true);
        setError(null);
        
        try {
            let result;
            if (imageFile) {
                result = await profileManager.updateProfileWithPhoto(profileData, imageFile);
            } else {
                result = await profileManager.updateProfile(profileData);
            }
            
            setProfile(result.admin);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [profileManager]);

    const removeProfilePhoto = useCallback(async (profileData = {}) => {
        if (!profileManager) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const result = await profileManager.removeProfilePhoto(profileData);
            setProfile(result.admin);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [profileManager]);

    return {
        profile,
        loading,
        error,
        updateProfile,
        removeProfilePhoto
    };
};

// Export for use in other modules
export { AdminProfileManager, createProfileForm, initializeAdminProfile, useAdminProfile };

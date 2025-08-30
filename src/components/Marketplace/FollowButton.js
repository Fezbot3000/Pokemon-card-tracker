import React, { useState, useEffect } from 'react';
import { Button, Icon } from '../../design-system';
import { useAuth } from '../../design-system';
import SocialService from '../../services/socialService';
import logger from '../../utils/logger';

/**
 * Follow/Unfollow button component for seller profiles
 * Handles the follow state and provides visual feedback
 */
function FollowButton({ 
  sellerId, 
  sellerName = 'Seller', 
  sellerProfileImage = null,
  className = '',
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  forceWhiteText = false
}) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check initial following status
  useEffect(() => {
    const checkFollowingStatus = async () => {
      // Don't check if no user or trying to follow yourself
      if (!user || !sellerId || user.uid === sellerId) {
        setCheckingStatus(false);
        return;
      }

      try {
        setCheckingStatus(true);
        const following = await SocialService.isFollowing(user.uid, sellerId);
        setIsFollowing(following);
      } catch (error) {
        logger.error('Error checking following status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkFollowingStatus();
  }, [user, sellerId]);

  // Handle follow/unfollow action
  const handleToggleFollow = async () => {
    if (loading) return;

    try {
      setLoading(true);
      
      const newFollowingStatus = await SocialService.toggleFollow(
        user.uid, 
        sellerId, 
        sellerName, 
        sellerProfileImage
      );
      
      setIsFollowing(newFollowingStatus);
      
    } catch (error) {
      logger.error('Error toggling follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no user or trying to follow yourself
  if (!user || !sellerId || user.uid === sellerId) {
    return null;
  }

  // Show loading state while checking initial status
  if (checkingStatus) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={true}
        className={`${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
          <span>Loading...</span>
        </div>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggleFollow}
      variant={isFollowing ? 'primary' : variant}
      size={size}
      disabled={loading}
      className={`
        ${fullWidth ? 'w-full' : ''} 
        ${className}
        ${isFollowing 
          ? 'border-green-500 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700' 
          : forceWhiteText
            ? '!bg-white/10 !border-white/20 hover:!bg-white/20 !text-white backdrop-blur-sm'
            : 'border-purple-500 bg-white text-purple-600 hover:border-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/20'
        }
        transition-all duration-200
      `}
    >
      <div className="flex items-center gap-2">
        {loading ? (
          <>
            <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
            <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
          </>
        ) : (
          <>
            <Icon 
              name={isFollowing ? 'person_remove' : 'person_add'} 
              size="sm" 
            />
            <span>{isFollowing ? 'Following' : 'Follow'}</span>
          </>
        )}
      </div>
    </Button>
  );
}

export default FollowButton;

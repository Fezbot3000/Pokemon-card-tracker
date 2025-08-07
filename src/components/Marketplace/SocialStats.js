import React, { useState, useEffect } from 'react';
import { Icon } from '../../design-system';
import SocialService from '../../services/socialService';
import logger from '../../utils/logger';

/**
 * Social statistics component for displaying follower/following counts
 * Shows real-time social engagement metrics
 */
function SocialStats({ 
  userId, 
  className = '',
  showFollowing = true,
  showFollowers = true,
  compact = false,
  textColor = 'text-gray-600 dark:text-gray-400'
}) {
  const [stats, setStats] = useState({
    followerCount: 0,
    followingCount: 0,
    lastActiveDate: null
  });
  const [loading, setLoading] = useState(true);

  // Load social statistics
  useEffect(() => {
    const loadSocialStats = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const socialStats = await SocialService.getSocialStats(userId);
        setStats(socialStats);
        
        logger.debug('SocialStats loaded:', {
          userId,
          stats: socialStats
        });
        
      } catch (error) {
        logger.error('Error loading social stats:', error);
        setStats({
          followerCount: 0,
          followingCount: 0,
          lastActiveDate: null
        });
      } finally {
        setLoading(false);
      }
    };

    loadSocialStats();
  }, [userId]);

  // Format numbers with appropriate suffixes
  const formatCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  // Don't render anything if no userId
  if (!userId) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {showFollowers && (
          <div className="flex items-center gap-1">
            <div className="size-3 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
            <span className={`text-sm ${textColor}`}>Followers</span>
          </div>
        )}
        {showFollowing && (
          <div className="flex items-center gap-1">
            <div className="size-3 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
            <span className={`text-sm ${textColor}`}>Following</span>
          </div>
        )}
      </div>
    );
  }

  // Compact layout for tight spaces
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {showFollowers && (
          <div className="flex items-center gap-1">
            <Icon name="group" size="xs" className={textColor} />
            <span className={`text-sm font-medium ${textColor}`}>
              {formatCount(stats.followerCount)}
            </span>
          </div>
        )}
        {showFollowing && (
          <div className="flex items-center gap-1">
            <Icon name="person_add" size="xs" className={textColor} />
            <span className={`text-sm font-medium ${textColor}`}>
              {formatCount(stats.followingCount)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full layout with labels
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {showFollowers && (
        <div className="flex items-center gap-2">
          <Icon name="group" size="sm" className={textColor} />
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCount(stats.followerCount)}
            </span>
            <span className={`ml-1 text-sm ${textColor}`}>
              Follower{stats.followerCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
      
      {showFollowing && (
        <div className="flex items-center gap-2">
          <Icon name="person_add" size="sm" className={textColor} />
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCount(stats.followingCount)}
            </span>
            <span className={`ml-1 text-sm ${textColor}`}>
              Following
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SocialStats;

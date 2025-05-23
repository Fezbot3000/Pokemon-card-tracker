import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../design-system';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';

function ReportListing({ listingId, sellerId, onClose }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'scam', label: 'Suspected scam or fraud' },
    { value: 'wrong-category', label: 'Wrong category' },
    { value: 'duplicate', label: 'Duplicate listing' },
    { value: 'prohibited', label: 'Prohibited item' },
    { value: 'misleading', label: 'Misleading information' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to report listings');
      return;
    }

    setSubmitting(true);
    try {
      const reportId = `${listingId}_${user.uid}_${Date.now()}`;
      const reportRef = doc(firestoreDb, 'reports', reportId);
      
      await setDoc(reportRef, {
        listingId,
        sellerId,
        reporterId: user.uid,
        reporterEmail: user.email,
        reason,
        details,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast.success('Report submitted successfully. We will review it soon.');
      onClose();
    } catch (error) {
      logger.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Report Listing
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-icons">close</span>
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Help us maintain a safe marketplace by reporting inappropriate listings.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for reporting
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                required
              >
                <option value="">Select a reason</option>
                {reportReasons.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                rows={4}
                placeholder="Please provide any additional information that might help us review this report..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-sm">flag</span>
                    <span>Submit Report</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

ReportListing.propTypes = {
  listingId: PropTypes.string.isRequired,
  sellerId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};

export default ReportListing;

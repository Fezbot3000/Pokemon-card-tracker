import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../design-system';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';
import CustomDropdown from '../../design-system/molecules/CustomDropdown';

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
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async e => {
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
        createdAt: serverTimestamp(),
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
    <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Report Listing
            </h2>
          </div>

          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            Help us maintain a safe marketplace by reporting inappropriate
            listings.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason for reporting
              </label>
              <CustomDropdown
                value={reason}
                onSelect={selectedValue => setReason(selectedValue)}
                placeholder="Select a reason"
                options={reportReasons}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional details (optional)
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                rows={4}
                placeholder="Please provide any additional information that might help us review this report..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-y-2 border-white"></span>
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
                className="flex-1 rounded-lg border border-gray-300 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
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
  onClose: PropTypes.func.isRequired,
};

export default ReportListing;

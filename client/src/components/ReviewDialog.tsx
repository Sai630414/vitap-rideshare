import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle, Pencil } from 'lucide-react';
import Button from './ui/Button';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  targetName: string;
  reviewType: 'driver' | 'passenger';
  existingReview?: { _id: string; rating: number; comment?: string; createdAt: string } | null;
  loading?: boolean;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  targetName,
  reviewType,
  existingReview,
  loading = false,
}) => {
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment ?? '');
    }
  }, [existingReview]);

  // Check if within 24h edit window
  const canEdit = existingReview
    ? Date.now() - new Date(existingReview.createdAt).getTime() < 24 * 60 * 60 * 1000
    : true;

  if (!isOpen) return null;

  const ratingLabels: Record<number, string> = {
    1: 'Terrible 😤',
    2: 'Poor 😕',
    3: 'Average 😐',
    4: 'Good 😊',
    5: 'Excellent 🤩',
  };

  const activeRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(rating, comment);
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              {existingReview ? 'Edit Your Review' : `Rate ${reviewType === 'driver' ? 'Driver' : 'Passenger'}`}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">{targetName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted && !existingReview ? (
          // Success state
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
            <h3 className="text-base font-bold text-zinc-100">Review Submitted!</h3>
            <p className="text-xs text-zinc-400">
              Thank you for your feedback. It helps build a safer campus community.
            </p>
            <Button onClick={onClose} className="mt-2 w-full">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            {/* Star Rating */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Your Rating
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors duration-150 ${
                        star <= activeRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm font-semibold text-amber-400 min-h-[1.25rem]">
                {ratingLabels[activeRating] || ''}
              </p>
            </div>

            {/* Comment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  reviewType === 'driver'
                    ? 'Share your experience — safe driving, punctuality, communication...'
                    : 'Share your experience — passenger behaviour, communication...'
                }
                rows={3}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm resize-none"
              />
            </div>

            {/* Edit window notice */}
            {existingReview && canEdit && (
              <div className="flex items-center gap-2 p-3 bg-violet-950/30 border border-violet-800/30 rounded-xl">
                <Pencil className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <p className="text-[11px] text-violet-300">
                  You can edit this review within 24 hours of submission.
                </p>
              </div>
            )}
            {existingReview && !canEdit && (
              <div className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <p className="text-[11px] text-zinc-400">
                  The 24-hour edit window has expired for this review.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={loading}
                disabled={(existingReview && !canEdit) || loading}
              >
                {existingReview ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewDialog;

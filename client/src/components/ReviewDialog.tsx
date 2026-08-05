import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle, Pencil, AlertCircle } from 'lucide-react';
import Button from './ui/Button';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  targetName: string;
  reviewType: 'driver' | 'passenger';
  existingReview?: { _id: string; rating: number; comment?: string; createdAt: string } | null;
  loading?: boolean;
  mandatory?: boolean;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  targetName,
  reviewType,
  existingReview,
  loading = false,
  mandatory = false,
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (!mandatory && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {mandatory
                ? '⭐ Mandatory Driver Review'
                : existingReview
                ? 'Edit Your Review'
                : `Rate ${reviewType === 'driver' ? 'Driver' : 'Passenger'}`}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{targetName}</p>
          </div>
          {!mandatory && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {mandatory && (
          <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-2 text-[11px] font-bold text-amber-900 shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ride has been completed. Please rate your driver to proceed with next actions.</span>
          </div>
        )}

        {submitted && !existingReview ? (
          // Success state
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <CheckCircle className="w-14 h-14 text-emerald-600 animate-bounce" />
            <h3 className="text-base font-extrabold text-slate-900">Review Submitted!</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Thank you for your rating. Your feedback helps keep WayGo safe and reliable.
            </p>
            <Button onClick={onClose} className="mt-2 w-full">
              Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Star Rating */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
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
                        star <= activeRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-xs font-black text-amber-600 min-h-[1.25rem]">
                {ratingLabels[activeRating] || ''}
              </p>
            </div>

            {/* Comment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
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
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all text-xs resize-none"
              />
            </div>

            {/* Edit window notice */}
            {existingReview && canEdit && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <Pencil className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <p className="text-[11px] text-emerald-800 font-medium">
                  You can edit this review within 24 hours of submission.
                </p>
              </div>
            )}
            {existingReview && !canEdit && (
              <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-2xl">
                <p className="text-[11px] text-slate-500 font-medium">
                  The 24-hour edit window has expired for this review.
                </p>
              </div>
            )}

            <div className="flex gap-2.5 mt-1">
              {!mandatory && (
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className={mandatory ? 'w-full' : 'flex-1'}
                loading={loading}
                disabled={(existingReview && !canEdit) || loading}
              >
                {existingReview ? 'Update Review' : 'Submit Rating & Continue'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewDialog;

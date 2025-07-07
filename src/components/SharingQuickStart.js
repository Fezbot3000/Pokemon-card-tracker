import React, { useState } from 'react';
import { Card, Button, Modal } from '../design-system';

// Simple Badge component
const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

const SharingQuickStart = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Collection Sharing!',
      content: (
        <div className="text-center">
          <div className="mb-4 text-6xl">🔗</div>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Share your collections with the world! Create public links that
            allow anyone to view your cards, perfect for selling, showcasing, or
            getting feedback on your collection.
          </p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Pro Tip:</strong> Shared collections are perfect for
              social media, forums, or when selling your collection to potential
              buyers.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 1: Create a Share Link',
      content: (
        <div>
          <div className="mb-4 text-center text-4xl">📝</div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Badge variant="primary" className="mt-1">
                1
              </Badge>
              <p className="text-gray-600 dark:text-gray-400">
                Click the <strong>"Share Collection"</strong> button to create a
                new shareable link
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="primary" className="mt-1">
                2
              </Badge>
              <p className="text-gray-600 dark:text-gray-400">
                Give your shared collection a <strong>title</strong> and{' '}
                <strong>description</strong>
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="primary" className="mt-1">
                3
              </Badge>
              <p className="text-gray-600 dark:text-gray-400">
                Choose to share <strong>all collections</strong> or a{' '}
                <strong>specific collection</strong>
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="primary" className="mt-1">
                4
              </Badge>
              <p className="text-gray-600 dark:text-gray-400">
                Set an <strong>expiration date</strong> for security (optional)
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 2: Share Your Link',
      content: (
        <div>
          <div className="mb-4 text-center text-4xl">📤</div>
          <div className="space-y-4">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Once created, you can share your collection in multiple ways:
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="p-4">
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  📋 Copy Link
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Copy the link to your clipboard and paste it anywhere
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  👁️ Preview
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Preview how your collection looks to visitors
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  📱 Social Share
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use the share button for social media and messaging apps
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  ⚙️ Manage
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toggle active/inactive or delete shares anytime
                </p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 3: What Visitors See',
      content: (
        <div>
          <div className="mb-4 text-center text-4xl">👀</div>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Your shared collection page includes:
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span className="text-gray-600 dark:text-gray-400">
                Your name and collection title
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span className="text-gray-600 dark:text-gray-400">
                Collection statistics and total value
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span className="text-gray-600 dark:text-gray-400">
                Searchable and filterable card grid
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span className="text-gray-600 dark:text-gray-400">
                Card images, grades, and values
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span className="text-gray-600 dark:text-gray-400">
                Professional, mobile-friendly design
              </span>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>🔒 Privacy:</strong> Visitors can only see what you choose
              to share. Your personal information and purchase prices remain
              private.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Ready to Share!',
      content: (
        <div className="text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            You're all set!
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Start creating your first shared collection and showcase your cards
            to the world. You can always manage, edit, or delete your shared
            collections later.
          </p>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white">
                Great for Selling
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Share with potential buyers
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white">
                Social Sharing
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Show off on social media
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white">
                Get Feedback
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Ask for opinions from experts
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={steps[currentStep].title}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`size-3 rounded-full ${
                index === currentStep
                  ? 'bg-blue-500'
                  : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">{steps[currentStep].content}</div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={skipTutorial}>
              Skip Tutorial
            </Button>
            <Button variant="primary" onClick={nextStep}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SharingQuickStart;

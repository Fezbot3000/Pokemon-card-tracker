// Email HTML templates for testing purposes

const generateWelcomeEmailHTML = (userName) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to MyCardTracker</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to MyCardTracker!</h1>
        </div>
        <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Welcome to MyCardTracker, the ultimate platform for managing your trading card collection!</p>
            <p>You can now:</p>
            <ul>
                <li>Track your card collection</li>
                <li>Monitor card values</li>
                <li>Buy and sell in our marketplace</li>
                <li>Get PSA grading information</li>
            </ul>
            <p><a href="https://mycardtracker.com.au/login" class="button">Get Started</a></p>
        </div>
    </div>
</body>
</html>
`;

const generateSubscriptionConfirmedHTML = (userName, planName) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Subscription Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Subscription Confirmed!</h1>
        </div>
        <div class="content">
            <h2>Thank you ${userName}!</h2>
            <p>Your subscription to <strong>${planName}</strong> has been confirmed.</p>
            <p>You now have access to all premium features including:</p>
            <ul>
                <li>Unlimited card tracking</li>
                <li>Advanced analytics</li>
                <li>Priority marketplace features</li>
                <li>Premium support</li>
            </ul>
            <p><a href="https://mycardtracker.com.au/dashboard" class="button">Access Dashboard</a></p>
        </div>
    </div>
</body>
</html>
`;

const generatePaymentFailedHTML = (userName, amount) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Failed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #f44336; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Payment Failed</h1>
        </div>
        <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We were unable to process your payment of <strong>${amount}</strong>.</p>
            <p>This could be due to:</p>
            <ul>
                <li>Insufficient funds</li>
                <li>Expired card</li>
                <li>Bank security measures</li>
            </ul>
            <p>Please update your payment method to continue enjoying MyCardTracker Pro.</p>
            <p><a href="https://mycardtracker.com.au/billing" class="button">Update Payment</a></p>
        </div>
    </div>
</body>
</html>
`;

const generateSubscriptionCancelledHTML = (userName, endDate) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Subscription Cancelled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #FF9800; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>😢 We'll Miss You</h1>
        </div>
        <div class="content">
            <h2>Goodbye ${userName},</h2>
            <p>Your subscription has been cancelled and will end on <strong>${endDate}</strong>.</p>
            <p>Until then, you'll continue to have access to all premium features.</p>
            <p>We'd love to have you back anytime!</p>
            <p><a href="https://mycardtracker.com.au/subscribe" class="button">Resubscribe</a></p>
        </div>
    </div>
</body>
</html>
`;

const generateMarketplaceMessageHTML = (senderName, message, listingTitle) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Marketplace Message</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #9C27B0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .message { background: white; padding: 15px; border-left: 4px solid #9C27B0; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #9C27B0; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💬 New Message</h1>
        </div>
        <div class="content">
            <h2>You have a new message about your listing!</h2>
            <p><strong>Listing:</strong> ${listingTitle}</p>
            <p><strong>From:</strong> ${senderName}</p>
            <div class="message">
                <p>"${message}"</p>
            </div>
            <p><a href="https://mycardtracker.com.au/marketplace" class="button">Reply Now</a></p>
        </div>
    </div>
</body>
</html>
`;

const generateListingSoldHTML = (userName, listingTitle, salePrice) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Listing Sold</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .sale-info { background: white; padding: 15px; border: 2px solid #4CAF50; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
            <h2>Your listing sold, ${userName}!</h2>
            <div class="sale-info">
                <p><strong>Item:</strong> ${listingTitle}</p>
                <p><strong>Sale Price:</strong> ${salePrice}</p>
                <p><strong>Status:</strong> Sold ✅</p>
            </div>
            <p>The buyer will be in touch soon to arrange payment and shipping.</p>
            <p><a href="https://mycardtracker.com.au/dashboard" class="button">View Details</a></p>
        </div>
    </div>
</body>
</html>
`;

const generateEmailVerificationHTML = (verificationLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF5722; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #FF5722; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Verify Your Email</h1>
        </div>
        <div class="content">
            <h2>Almost there!</h2>
            <p>Please verify your email address to complete your MyCardTracker account setup.</p>
            <p>Click the button below to verify your email:</p>
            <p><a href="${verificationLink}" class="button">Verify Email Address</a></p>
            <p><small>If the button doesn't work, copy and paste this link: ${verificationLink}</small></p>
        </div>
    </div>
</body>
</html>
`;

module.exports = {
  generateWelcomeEmailHTML,
  generateSubscriptionConfirmedHTML,
  generatePaymentFailedHTML,
  generateSubscriptionCancelledHTML,
  generateMarketplaceMessageHTML,
  generateListingSoldHTML,
  generateEmailVerificationHTML
};

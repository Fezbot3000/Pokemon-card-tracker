const fs = require('fs');
const path = require('path');

// Path to the Login.js file
const loginFilePath = path.join(__dirname, 'src', 'components', 'Login.js');

// Read the current file content
fs.readFile(loginFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Find the sign-up section in the handleSubmit function
  // This pattern looks for the signUp function call and captures the code around it
  const signUpPattern = /await signUp\(\{[^}]*\}\);([\s\S]*?)(?=\}[\s\n]*catch|\}[\s\n]*finally)/;
  
  // Replace with our updated code that includes navigation to dashboard
  const updatedContent = data.replace(
    signUpPattern,
    `await signUp({$1});
        // After successful sign-up, navigate to dashboard
        // NewUserRoute component will handle subscription check and redirect if needed
        navigate('/dashboard');$2`
  );

  // Write the updated content back to the file
  fs.writeFile(loginFilePath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully updated Login.js with subscription check after sign-up');
  });
});

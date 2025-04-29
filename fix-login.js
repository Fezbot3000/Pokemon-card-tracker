const fs = require('fs');
const path = require('path');

// Path to the Login.js file
const loginFilePath = path.join(__dirname, 'src', 'components', 'Login.js');

// Read the current file content
let fileContent = fs.readFileSync(loginFilePath, 'utf8');

// Look for the specific section we need to modify
// We'll search for the line where it sets isNewUser after signup
const targetLine = "localStorage.setItem('isNewUser', 'true');";
const targetLineIndex = fileContent.indexOf(targetLine);

if (targetLineIndex !== -1) {
  // We found the line, now we need to ensure the navigation happens after subscription check
  // Get the line where navigation happens
  const navigationLine = "navigate('/dashboard', { replace: true });";
  const navigationLineIndex = fileContent.indexOf(navigationLine, targetLineIndex);
  
  if (navigationLineIndex !== -1) {
    // We found both lines, now we can add a comment to clarify the behavior
    const updatedContent = 
      fileContent.slice(0, navigationLineIndex) + 
      "// NewUserRoute component will handle subscription check and redirect if needed\n        " +
      fileContent.slice(navigationLineIndex);
    
    // Write the updated content back to the file
    fs.writeFileSync(loginFilePath, updatedContent, 'utf8');
    console.log('Successfully updated Login.js with subscription check comment');
  } else {
    console.error('Could not find navigation line in Login.js');
  }
} else {
  console.error('Could not find target line in Login.js');
}

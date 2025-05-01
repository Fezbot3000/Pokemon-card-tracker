const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to your CORS configuration file
const corsConfigPath = path.join(__dirname, 'firebase-storage-cors.json');

// Function to apply CORS configuration to Firebase Storage
function applyCorsConfig() {
  console.log('Reading CORS configuration...');
  
  // Check if the CORS configuration file exists
  if (!fs.existsSync(corsConfigPath)) {
    console.error('CORS configuration file not found at:', corsConfigPath);
    return;
  }
  
  // Read the CORS configuration
  try {
    const corsConfig = fs.readFileSync(corsConfigPath, 'utf8');
    console.log('CORS configuration loaded successfully.');
    
    // Construct the Firebase Storage CORS command
    // Replace 'mycardtracker-c8479.appspot.com' with your actual storage bucket name if different
    const command = `firebase storage:cors set ${corsConfigPath} --project mycardtracker-c8479`;
    
    console.log('Applying CORS configuration to Firebase Storage...');
    console.log('Running command:', command);
    
    // Execute the Firebase CLI command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error applying CORS configuration:', error);
        console.error('Make sure you have the Firebase CLI installed and are logged in.');
        console.error('You can install it with: npm install -g firebase-tools');
        console.error('And login with: firebase login');
        return;
      }
      
      if (stderr) {
        console.error('Command stderr:', stderr);
      }
      
      console.log('Command stdout:', stdout);
      console.log('CORS configuration applied successfully!');
    });
  } catch (error) {
    console.error('Error reading CORS configuration:', error);
  }
}

// Run the function
applyCorsConfig();

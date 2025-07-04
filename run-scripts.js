import { exec } from 'child_process';

// Run swagger.js
exec('node swagger.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error running swagger.js: ${error.message}`);
    return;
  }

  // After swagger.js completes, run src/app.js
  exec('node src/app.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running src/app.js: ${error.message}`);
      return;
    }
  });
});

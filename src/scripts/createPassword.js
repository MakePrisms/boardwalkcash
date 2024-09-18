const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
});

rl.question('Enter your password: ', password => {
   const hash = crypto.createHash('sha256').update(password).digest('hex');
   console.log('SHA256 hash:', hash);
   rl.close();
});

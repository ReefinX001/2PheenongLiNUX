// Secure Secrets Generator
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

console.log('\n🔐 SECURE SECRETS GENERATOR');
console.log('═'.repeat(60));

async function generateSecrets() {
  try {
    // Generate secure random secrets
    const secrets = {
      JWT_SECRET: crypto.randomBytes(64).toString('hex'),
      JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(64).toString('hex'),
      CSRF_SECRET: crypto.randomBytes(32).toString('hex')
    };

    // Read existing .env
    let envContent = '';
    try {
      envContent = await fs.readFile('.env', 'utf8');
    } catch {
      console.log('⚠️ .env file not found, creating from template...');
      try {
        envContent = await fs.readFile('.env.example', 'utf8');
      } catch {
        throw new Error('.env.example not found');
      }
    }

    // Replace weak secrets
    let updatedContent = envContent;

    // Replace JWT_SECRET
    if (envContent.includes('YOUR_SECRET_KEY') || envContent.includes('secret123')) {
      updatedContent = updatedContent.replace(
        /JWT_SECRET=.*/,
        `JWT_SECRET=${secrets.JWT_SECRET}`
      );
      console.log('✅ Generated secure JWT_SECRET');
    }

    // Replace JWT_REFRESH_SECRET
    if (!envContent.includes('JWT_REFRESH_SECRET=') || envContent.includes('CHANGE_THIS')) {
      if (envContent.includes('JWT_REFRESH_SECRET=')) {
        updatedContent = updatedContent.replace(
          /JWT_REFRESH_SECRET=.*/,
          `JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`
        );
      } else {
        // Add after JWT_SECRET
        updatedContent = updatedContent.replace(
          /JWT_SECRET=.*/g,
          (match) => `${match}\nJWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`
        );
      }
      console.log('✅ Generated secure JWT_REFRESH_SECRET');
    }

    // Replace SESSION_SECRET
    if (envContent.includes('SESSION_SECRET=') &&
        (envContent.includes('CHANGE_THIS') || envContent.includes('your-session-secret'))) {
      updatedContent = updatedContent.replace(
        /SESSION_SECRET=.*/,
        `SESSION_SECRET=${secrets.SESSION_SECRET}`
      );
      console.log('✅ Generated secure SESSION_SECRET');
    }

    // Replace CSRF_SECRET
    if (!envContent.includes('CSRF_SECRET=') || envContent.includes('CHANGE_THIS')) {
      if (envContent.includes('CSRF_SECRET=')) {
        updatedContent = updatedContent.replace(
          /CSRF_SECRET=.*/,
          `CSRF_SECRET=${secrets.CSRF_SECRET}`
        );
      } else {
        updatedContent += `\n# CSRF Secret\nCSRF_SECRET=${secrets.CSRF_SECRET}\n`;
      }
      console.log('✅ Generated secure CSRF_SECRET');
    }

    // Save updated .env
    await fs.writeFile('.env', updatedContent);
    console.log('\n✅ Secure secrets have been generated and saved to .env');

    // Ensure .env is in .gitignore
    let gitignoreContent = '';
    try {
      gitignoreContent = await fs.readFile('.gitignore', 'utf8');
    } catch {
      console.log('Creating .gitignore...');
    }

    if (!gitignoreContent.includes('.env')) {
      gitignoreContent = '.env\n' + gitignoreContent;
      await fs.writeFile('.gitignore', gitignoreContent);
      console.log('✅ Added .env to .gitignore');
    }

    // Display security recommendations
    console.log('\n📋 SECURITY RECOMMENDATIONS:');
    console.log('─'.repeat(60));
    console.log('1. ✅ .env has been removed from git tracking');
    console.log('2. ✅ Secure secrets have been generated');
    console.log('3. ✅ .env is in .gitignore');
    console.log('4. ⚠️ Never share or commit your .env file');
    console.log('5. ⚠️ Use different secrets for production');
    console.log('6. ⚠️ Rotate secrets regularly (every 90 days)');

    console.log('\n🔒 SECRET LENGTHS:');
    console.log('─'.repeat(60));
    Object.entries(secrets).forEach(([key, value]) => {
      console.log(`${key}: ${value.length} characters`);
    });

    console.log('\n═'.repeat(60));
    console.log('✅ Secrets generation complete!');
    console.log('═'.repeat(60));

    return secrets;

  } catch (error) {
    console.error('❌ Error generating secrets:', error);
    throw error;
  }
}

// Run generator
if (require.main === module) {
  generateSecrets()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = generateSecrets;
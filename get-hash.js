import crypto from 'crypto';

const password = process.argv[2] || process.env.ADMIN_PASSWORD;

if (!password) {
	throw new Error('Pass a password argument or set ADMIN_PASSWORD');
}

const hash = crypto.createHash('sha256').update(password).digest('hex');

console.log('Password sourced from input');
console.log('Hash:', hash);

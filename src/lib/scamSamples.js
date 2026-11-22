// Fictional test messages (fake domains and numbers). `expect` is verified by a test against the real scanner.
export const SAMPLES = [
  { id: 'kyc', label: 'Fake KYC alert', expect: 'High', text: 'URGENT: Your SBI account will be blocked today. Complete KYC now at http://sbi-kyc-update.xyz/login and share the OTP you receive immediately.' },
  { id: 'upi', label: 'UPI "receive money" trick', expect: 'High', text: 'Congratulations! You have won cashback of Rs 5000. Open PhonePe and enter your UPI PIN to receive the money now.' },
  { id: 'job', label: 'Fake job fee', expect: 'Medium', text: 'Work from home, earn Rs 3000 daily! Pay a registration fee of Rs 500 to confirm your job today.' },
  { id: 'invest', label: 'Guaranteed returns', expect: 'High', text: 'Guaranteed returns! Double your money in 30 days, risk-free profit. Join our WhatsApp group via bit.ly/join-now, limited seats, act now.' },
  { id: 'debit', label: 'Genuine-style bank alert', expect: 'Low', text: 'Rs 450.00 debited from A/c XX1234 on 22-Nov-26 at a grocery store. If this was not you, call the helpline number printed on your card.' },
  { id: 'otp', label: 'Genuine-style OTP SMS', expect: 'Low', text: '123456 is your OTP for login. Do not share it with anyone.' },
]

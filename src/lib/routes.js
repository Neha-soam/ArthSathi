export const ROUTES = [['/', 'Dashboard'], ['/budgeting', 'Budgeting'], ['/scam', 'Scam Detector'], ['/invest', 'Invest Guide'], ['/tax', 'Tax'], ['/market', 'Market'], ['/business', 'Business'], ['/profile', 'Profile']]
export const MOBILE_PRIMARY = ['/', '/budgeting', '/scam', '/profile'] // the rest sit under "More" on phones
export const titleFor = (pathname) => { const hit = ROUTES.find(([p]) => p === pathname); return hit ? `${hit[1]} · ArthSathi` : 'ArthSathi' }

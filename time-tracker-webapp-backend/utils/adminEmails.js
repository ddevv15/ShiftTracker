// Emails listed in ADMIN_EMAILS (comma-separated) are always admins.
// This is how the first admin is bootstrapped, and a recovery path if
// every admin account gets demoted or deactivated.

const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

const isBootstrapAdmin = (email) =>
  Boolean(email) && getAdminEmails().includes(email.trim().toLowerCase());

module.exports = {
  getAdminEmails,
  isBootstrapAdmin
};

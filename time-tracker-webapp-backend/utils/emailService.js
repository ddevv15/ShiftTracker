const nodemailer = require('nodemailer');

// Create a Gmail transporter using App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Use the Gmail service shorthand
  auth: {
    user: process.env.EMAIL_USER,      // Your Gmail address
    pass: process.env.EMAIL_APP_PASSWORD // Your Gmail App Password
  }
});

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    // Email options
    const mailOptions = {
      from: `"ShiftTracker" <${process.env.EMAIL_USER}>`, // Sender
      to,                                                // Recipient
      subject,                                           // Subject
      text,                                              // Plain text version
      html: html || text                                 // HTML version (fallback to text if not provided)
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw the error, just log it - we don't want to break the app flow
    return { error: error.message };
  }
};

/**
 * Send a shift start notification email
 * @param {Object} user - User object with email and name
 * @param {Object} shift - Shift object with start time and location
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendShiftStartEmail = async (user, shift) => {
  const subject = 'Shift Started - ShiftTracker';
  
  const text = `
Hello ${user.name},

This is a confirmation that your shift has started at ${new Date(shift.startTime).toLocaleString()}.

Location: Latitude ${shift.location.latitude.toFixed(6)}, Longitude ${shift.location.longitude.toFixed(6)}

Thank you for using ShiftTracker!
  `;
  
  const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0284c7;">Shift Started</h2>
  <p>Hello <strong>${user.name}</strong>,</p>
  <p>This is a confirmation that your shift has started at <strong>${new Date(shift.startTime).toLocaleString()}</strong>.</p>
  <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px;">
    <p style="margin: 0;"><strong>Location:</strong> Latitude ${shift.location.latitude.toFixed(6)}, Longitude ${shift.location.longitude.toFixed(6)}</p>
  </div>
  <p>Thank you for using ShiftTracker!</p>
</div>
  `;
  
  return await sendEmail(user.email, subject, text, html);
};

/**
 * Send a shift end notification email
 * @param {Object} user - User object with email and name
 * @param {Object} shift - Shift object with start time, end time, and other details
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendShiftEndEmail = async (user, shift) => {
  // Calculate duration in hours and minutes
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  const durationMs = endTime - startTime;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // Calculate break time
  let breakDuration = 'None';
  if (shift.breaks && shift.breaks.length > 0) {
    const breakMs = shift.breaks.reduce((total, breakItem) => {
      const breakStart = new Date(breakItem.startTime);
      const breakEnd = breakItem.endTime ? new Date(breakItem.endTime) : endTime;
      return total + (breakEnd - breakStart);
    }, 0);
    
    const breakHours = Math.floor(breakMs / (1000 * 60 * 60));
    const breakMinutes = Math.floor((breakMs % (1000 * 60 * 60)) / (1000 * 60));
    breakDuration = `${breakHours}h ${breakMinutes}m`;
  }
  
  const subject = 'Shift Ended - ShiftTracker';
  
  const text = `
Hello ${user.name},

This is a confirmation that your shift has ended at ${endTime.toLocaleString()}.

Shift Summary:
- Start Time: ${startTime.toLocaleString()}
- End Time: ${endTime.toLocaleString()}
- Total Duration: ${hours}h ${minutes}m
- Break Time: ${breakDuration}
- Working Time: ${shift.totalWorkingTime ? Math.floor(shift.totalWorkingTime / (1000 * 60 * 60)) + 'h ' + Math.floor((shift.totalWorkingTime % (1000 * 60 * 60)) / (1000 * 60)) + 'm' : `${hours}h ${minutes}m`}

Thank you for using ShiftTracker!
  `;
  
  const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0284c7;">Shift Ended</h2>
  <p>Hello <strong>${user.name}</strong>,</p>
  <p>This is a confirmation that your shift has ended at <strong>${endTime.toLocaleString()}</strong>.</p>
  
  <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px;">
    <h3 style="margin-top: 0; color: #0284c7;">Shift Summary</h3>
    <p><strong>Start Time:</strong> ${startTime.toLocaleString()}</p>
    <p><strong>End Time:</strong> ${endTime.toLocaleString()}</p>
    <p><strong>Total Duration:</strong> ${hours}h ${minutes}m</p>
    <p><strong>Break Time:</strong> ${breakDuration}</p>
    <p><strong>Working Time:</strong> ${shift.totalWorkingTime ? Math.floor(shift.totalWorkingTime / (1000 * 60 * 60)) + 'h ' + Math.floor((shift.totalWorkingTime % (1000 * 60 * 60)) / (1000 * 60)) + 'm' : `${hours}h ${minutes}m`}</p>
  </div>
  
  <p>Thank you for using ShiftTracker!</p>
</div>
  `;
  
  return await sendEmail(user.email, subject, text, html);
};

module.exports = {
  sendEmail,
  sendShiftStartEmail,
  sendShiftEndEmail
};
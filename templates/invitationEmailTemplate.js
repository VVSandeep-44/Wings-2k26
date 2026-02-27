const validator = require("validator");

const buildInvitationEmailHtml = ({
  name,
  regId,
  events,
  eventName,
  eventDateText,
  eventVenueText,
}) => {
  const safeName = validator.escape(name || "");
  const safeRegId = validator.escape(regId || "");
  const safeEventName = validator.escape(eventName || "");
  const safeEventsText = Array.isArray(events)
    ? validator.escape(events.join(", "))
    : validator.escape(String(events || ""));

  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px; background-color: #ffffff;">

    <h1 style="text-align: center; color: #1a237e; margin-bottom: 10px;">
      ${safeEventName}
    </h1>

    <p style="font-size: 16px;">Hi <strong>${safeName}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.6;">
      Your registration has been successfully confirmed. We’re excited to have you join us.
    </p>

    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

    <h3 style="color: #333;">Registration Details</h3>

    <p style="font-size: 14px; line-height: 1.6;">
      <strong>Registration ID:</strong> ${safeRegId}<br/>
      <strong>Event Date:</strong> ${eventDateText}<br/>
      <strong>Venue:</strong> ${eventVenueText}<br/>
      <strong>Selected Events:</strong> ${safeEventsText}
    </p>

    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

    <p style="font-size: 14px; line-height: 1.6;">
      Please keep this email for future reference. You may be asked to show your Registration ID at the venue.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      We look forward to seeing you!
    </p>

    <p style="margin-top: 30px;">
      Regards,<br/>
      <strong>${safeEventName} Team</strong>
    </p>

    <hr style="margin: 25px 0;" />

    <p style="font-size: 12px; color: #777; text-align: center;">
      This email was sent because you registered for ${safeEventName}.
    </p>

  </div>
  `;
};

module.exports = {
  buildInvitationEmailHtml,
};
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
  <div style="font-family: Arial, sans-serif; background-color: #f4f6fb; padding: 30px 10px;">
    <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1a237e, #3949ab); padding: 25px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">
          ${safeEventName}
        </h1>
        <p style="margin-top: 8px; font-size: 14px;">
          A Celebration of Talent • Passion • Legacy
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #333;">
        <p style="font-size: 16px;">Hi <strong>${safeName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.7;">
          Welcome to <strong>${safeEventName}</strong> — our college’s grand annual celebration and a tradition carried with pride.
        </p>

        <p style="font-size: 15px; line-height: 1.7;">
          From electrifying culturals and competitive technical events to thrilling sports and unforgettable moments, Wings brings together the very best of talent, creativity, and spirit.
        </p>

        <hr style="margin: 25px 0; border: none; border-top: 1px solid #e0e0e0;" />

        <!-- Registration Details -->
        <h3 style="color: #1a237e; margin-bottom: 10px;">Your Registration Details</h3>

        <p style="font-size: 14px; line-height: 1.8;">
          <strong>Registration ID:</strong> ${safeRegId}<br/>
          <strong>Event Date:</strong> ${eventDateText}<br/>
          <strong>Venue:</strong> ${eventVenueText}<br/>
          <strong>Selected Events:</strong> ${safeEventsText}
        </p>


        <p style="font-size: 15px; margin-top: 10px;">
          We look forward to seeing you at Wings and celebrating this legacy together.
        </p>

        <p style="margin-top: 30px;">
          Warm regards,<br/>
          <strong>${safeEventName} Organizing Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f0f2f8; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        This email was sent because you registered for ${safeEventName}.
      </div>

    </div>
  </div>
  `;
};

module.exports = {
  buildInvitationEmailHtml,
};
const validator = require("validator");

const buildInvitationEmailHtml = ({
  name,
  email,
  phone,
  college,
  department,
  year,
  regId,
  events,
  participationType,
  teamName,
  teamMembers,
  paymentReference,
  eventName,
  eventDateText,
  eventVenueText,
  eventRegisterUrl,
}) => {
  const safeName = validator.escape(name || "");
  const safeEmail = validator.escape(email || "");
  const safePhone = validator.escape(phone || "");
  const safeCollege = validator.escape(college || "");
  const safeDepartment = validator.escape(department || "");
  const safeYear = validator.escape(year || "");
  const safeRegId = validator.escape(regId || "");
  const safeEventName = validator.escape(eventName || "");
  const registerUrl = String(
    eventRegisterUrl || "https://wings-2k26.onrender.com/#register"
  ).trim();
  const safeRegisterUrl = validator.escape(registerUrl);
  const participationValue = String(participationType || "individual")
    .trim()
    .toLowerCase();
  const isTeam = participationValue === "team";
  const safeParticipationLabel = validator.escape(isTeam ? "Team" : "Individual");
  const safeTeamName = validator.escape(teamName || "");
  const safePaymentReference = validator.escape(paymentReference || "");
  const safeEventsText = Array.isArray(events)
    ? validator.escape(events.join(", "))
    : validator.escape(String(events || ""));
  const safeTeamMembersText = Array.isArray(teamMembers)
    ? validator.escape(
        teamMembers
          .map((member) => String(member || "").trim())
          .filter(Boolean)
          .join(", ")
      )
    : "";
  const qrPayload = {
    event: eventName || "WINGS 2k26",
    regId: String(regId || "").trim(),
    name: String(name || "").trim(),
    email: String(email || "").trim(),
    phone: String(phone || "").trim(),
    college: String(college || "").trim(),
    department: String(department || "").trim(),
    year: String(year || "").trim(),
    participationType: isTeam ? "team" : "individual",
    teamName: String(teamName || "").trim(),
    teamMembers: Array.isArray(teamMembers)
      ? teamMembers.map((member) => String(member || "").trim()).filter(Boolean)
      : [],
    events: Array.isArray(events)
      ? events.map((item) => String(item || "").trim()).filter(Boolean)
      : String(events || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    paymentReference: String(paymentReference || "").trim(),
    issuedAt: new Date().toISOString(),
  };
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    JSON.stringify(qrPayload)
  )}`;

  const teamDetailsRows = isTeam
    ? `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Team Name</strong></td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${safeTeamName || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Team Members</strong></td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${safeTeamMembersText || safeName}</td>
          </tr>
      `
    : "";

  return `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6fb; padding: 30px 10px;">
    <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1a237e, #3949ab); padding: 25px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">
          ${safeEventName}
        </h1>
        <p style="margin-top: 8px; font-size: 13px; opacity: 0.95;">
          Registration Confirmation
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #333;">
        <p style="font-size: 15px; margin: 0 0 12px;">Hi <strong>${safeName}</strong>, your registration is confirmed.</p>

        <div style="border: 1px solid #e4e8f3; border-radius: 10px; overflow: hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Registration ID</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${safeRegId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>College</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${safeCollege}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Department / Year</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${safeDepartment} / ${safeYear}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Participation</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${safeParticipationLabel}</td>
            </tr>
            ${teamDetailsRows}
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Selected Events</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${safeEventsText}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Date / Venue</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">${eventDateText} · ${eventVenueText}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #4a4f6a; width: 38%;"><strong>Payment</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #edf0f7; color: #1f243d;">₹300 · Ref: ${safePaymentReference || "N/A"} · Submitted</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 14px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #5c6384;">Scan for your registration details (for check-in)</p>
          <a href="${safeRegisterUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;">
            <img src="${qrImageUrl}" alt="WINGS registration QR" width="140" height="140" style="display: block; border: 1px solid #e1e6f4; border-radius: 8px;" />
          </a>
        </div>

        <p style="margin-top: 16px; font-size: 14px;">
          See you at the venue.<br/>
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
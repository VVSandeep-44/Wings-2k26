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
  const safeEventDateText = validator.escape(eventDateText || "");
  const safeEventVenueText = validator.escape(eventVenueText || "");
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

  const teamDetailsBlocks = isTeam
    ? `
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Team Name</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeTeamName || "N/A"}</p>
          </div>
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Team Members</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeTeamMembersText || safeName}</p>
          </div>
      `
    : "";

  return `
  <div style="margin: 0; padding: 24px 12px; background-color: #f3f6fb; font-family: 'Segoe UI', Arial, sans-serif; color: #1f2940;">
    <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border: 1px solid #e3e8f4; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(22, 34, 66, 0.08);">
      <div style="background: linear-gradient(135deg, #0f2b6f, #2246a5); color: #ffffff; padding: 26px 24px;">
        <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.92;">Registration Confirmed</p>
        <h1 style="margin: 8px 0 0; font-size: 28px; line-height: 1.2;">${safeEventName}</h1>
        <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.94;">
          Dear ${safeName || "Participant"}, your registration has been successfully recorded.
        </p>
      </div>

      <div style="padding: 24px;">
        <div style="margin-bottom: 16px; padding: 14px 16px; border: 1px solid #dce4f6; border-radius: 10px; background: #f8fbff;">
          <p style="margin: 0; font-size: 13px; color: #2a3655;">
            <strong>Registration ID:</strong>
            <span style="display: inline-block; margin-left: 6px; padding: 3px 8px; border-radius: 999px; background: #1f3f98; color: #ffffff; font-weight: 600; letter-spacing: 0.02em;">
              ${safeRegId || "N/A"}
            </span>
          </p>
        </div>

        <div style="border: 1px solid #e4e9f5; border-radius: 10px; overflow: hidden;">
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Name</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeName || "N/A"}</p>
          </div>
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Email</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeEmail || "N/A"}</p>
          </div>
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Phone</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safePhone || "N/A"}</p>
          </div>
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>College</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeCollege || "N/A"}</p>
          </div>
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Department / Year</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeDepartment || "N/A"} / ${safeYear || "N/A"}</p>
          </div>
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Participation</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeParticipationLabel}</p>
          </div>
          ${teamDetailsBlocks}
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Selected Events</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeEventsText || "N/A"}</p>
          </div>
          <div style="padding: 10px 12px; border-bottom: 1px solid #edf1f8;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Date / Venue</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">${safeEventDateText || "TBD"} · ${safeEventVenueText || "TBD"}</p>
          </div>
          <div style="padding: 10px 12px;">
            <p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; color: #6a7693;"><strong>Payment</strong></p>
            <p style="margin: 0; font-size: 13px; color: #1d2742;">₹300 · Ref: ${safePaymentReference || "N/A"} · Submitted</p>
          </div>
        </div>

        <div style="margin-top: 18px; padding: 14px; border: 1px dashed #cfd9ef; border-radius: 10px; text-align: center; background: #fcfdff;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #5b6788;">Use this QR for registration verification at check-in</p>
          <a href="${safeRegisterUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
            <img src="${qrImageUrl}" alt="WINGS registration QR" width="150" height="150" style="display: block; border: 1px solid #dfe6f5; border-radius: 10px;" />
          </a>
        </div>

        <p style="margin: 18px 0 0; font-size: 13px; color: #2d3958; line-height: 1.6;">
          We look forward to welcoming you at the event. Please keep this email and your registration ID handy for smooth entry.
        </p>
        <p style="margin: 10px 0 0; font-size: 14px; color: #1f2a46;">
          Regards,<br />
          <strong>${safeEventName} Organizing Team</strong>
        </p>
      </div>

      <div style="padding: 14px 20px; text-align: center; font-size: 12px; color: #6a7592; background: #f3f6fb; border-top: 1px solid #e3e8f4;">
        This is an automated confirmation email for your registration to ${safeEventName}.
      </div>
    </div>
  </div>
  `;
};

module.exports = {
  buildInvitationEmailHtml,
};
const validator = require("validator");

const EVENT_LABEL_MAP = {
  circuitry: "Circuitry",
  robotics: "Robotics",
  "web-planting-ai": "Web Planting with AI",
  "project-expo": "Project Expo",
  "techno-quiz": "Techno Quiz",
  debugging: "Debugging Events",
  "startup-pitching": "Startup Idea Pitching",
  "paper-presentations": "Paper Presentations (PPT)",
  "short-film": "Short Film Making",
  "standup-comedy": "Standup Comedy",
  "ad-making": "Ad Making",
};

const formatEventLabel = (value) => EVENT_LABEL_MAP[value] || value || "";

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
  detailsViewUrl,
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
  const viewUrl = String(detailsViewUrl || "").trim();
  const safeViewUrl = validator.escape(viewUrl || registerUrl);
  const participationValue = String(participationType || "individual")
    .trim()
    .toLowerCase();
  const isTeam = participationValue === "team";
  const safeParticipationLabel = validator.escape(isTeam ? "Team" : "Individual");
  const safeTeamName = validator.escape(teamName || "");
  const safePaymentReference = validator.escape(paymentReference || "");
  const safeEventsText = Array.isArray(events)
    ? validator.escape(
        events
          .map((event) => formatEventLabel(String(event || "").trim()))
          .filter(Boolean)
          .join(", ")
      )
    : validator.escape(String(events || ""));
  const safeTeamMembersText = Array.isArray(teamMembers)
    ? validator.escape(
        teamMembers
          .map((member) => String(member || "").trim())
          .filter(Boolean)
          .join(", ")
      )
    : "";
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    viewUrl || registerUrl
  )}`;

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
        <div style="margin-bottom: 16px; padding: 14px 16px; border: 1px solid #dce4f6; border-radius: 10px; background: #f8fbff; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
          <p style="margin: 0; font-size: 13px; color: #2a3655;">
            <strong>Registration ID:</strong>
            <span style="display: inline-block; margin-left: 6px; padding: 3px 8px; border-radius: 999px; background: #1f3f98; color: #ffffff; font-weight: 600; letter-spacing: 0.02em;">
              ${safeRegId || "N/A"}
            </span>
          </p>
          <a href="${safeViewUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 8px 12px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 700; background: #1f3f98; color: #ffffff;">View Full Registration Details</a>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 12px;">
          <div style="padding: 12px; border-radius: 10px; border: 1px solid #e4e9f5; background: #ffffff;">
            <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; color: #6a7693;"><strong>Participant</strong></p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #1d2742; font-weight: 700;">${safeName || "N/A"}</p>
            <p style="margin: 0; font-size: 13px; color: #3a4566;">${safeEmail || "N/A"}</p>
            <p style="margin: 2px 0 0; font-size: 13px; color: #3a4566;">${safePhone || "N/A"}</p>
          </div>
          <div style="padding: 12px; border-radius: 10px; border: 1px solid #e4e9f5; background: #ffffff;">
            <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; color: #6a7693;"><strong>College</strong></p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #1d2742; font-weight: 700;">${safeCollege || "N/A"}</p>
            <p style="margin: 0; font-size: 13px; color: #3a4566;">${safeDepartment || "N/A"} / ${safeYear || "N/A"}</p>
          </div>
          <div style="padding: 12px; border-radius: 10px; border: 1px solid #e4e9f5; background: #ffffff;">
            <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; color: #6a7693;"><strong>Participation</strong></p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #1d2742; font-weight: 700;">${safeParticipationLabel}</p>
            ${isTeam ? `<p style="margin: 0; font-size: 13px; color: #3a4566;">Team: ${safeTeamName || "N/A"}</p>` : ""}
            ${isTeam ? `<p style="margin: 2px 0 0; font-size: 13px; color: #3a4566;">Members: ${safeTeamMembersText || safeName}</p>` : ""}
          </div>
          <div style="padding: 12px; border-radius: 10px; border: 1px solid #e4e9f5; background: #ffffff;">
            <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; color: #6a7693;"><strong>Payment</strong></p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #1d2742; font-weight: 700;">Submitted</p>
            <p style="margin: 0; font-size: 13px; color: #3a4566;">Amount: ₹300</p>
            <p style="margin: 2px 0 0; font-size: 13px; color: #3a4566;">Ref: ${safePaymentReference || "N/A"}</p>
          </div>
        </div>

        <div style="padding: 12px; border-radius: 10px; border: 1px solid #e4e9f5; background: #ffffff; margin-bottom: 12px;">
          <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; color: #6a7693;"><strong>Selected Events</strong></p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #1d2742;">${safeEventsText || "N/A"}</p>
          <p style="margin: 0; font-size: 13px; color: #3a4566;">${safeEventDateText || "TBD"} · ${safeEventVenueText || "TBD"}</p>
        </div>

        <div style="margin-top: 18px; padding: 14px; border: 1px dashed #cfd9ef; border-radius: 10px; text-align: center; background: #fcfdff;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #5b6788;">Scan this QR to open your registration details page</p>
          <a href="${safeViewUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
            <img src="${qrImageUrl}" alt="WINGS registration QR" width="150" height="150" style="display: block; border: 1px solid #dfe6f5; border-radius: 10px;" />
          </a>
          <p style="margin: 10px 0 0; font-size: 12px; color: #5b6788;">Unable to scan? <a href="${safeViewUrl}" target="_blank" rel="noopener noreferrer" style="color: #1f3f98; font-weight: 700;">Open details page</a></p>
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
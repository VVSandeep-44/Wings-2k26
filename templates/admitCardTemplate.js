// HTML template for admit card image generation
module.exports = function buildAdmitCardHtml({
  name,
  regId,
  college,
  department,
  year,
  events,
  qrUrl,
  eventName = "WINGS 2k26",
  eventDateText = "March 13-14, 2026",
  eventVenueText = "Pydah College of Engineering"
}) {
  return `
  <div style="width: 600px; height: 340px; background: #f8fbff; border-radius: 18px; box-shadow: 0 6px 24px #1f29401a; font-family: 'Segoe UI', Arial, sans-serif; color: #1f2940; display: flex; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #0f2b6f, #2246a5); width: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 0 12px;">
      <img src='https://wings-2k26.onrender.com/assets/pydah-logo.jpeg' alt='Logo' style='width: 70px; border-radius: 10px; margin-bottom: 18px;' />
      <div style='font-size: 22px; font-weight: 700; letter-spacing: 0.04em;'>${eventName}</div>
      <div style='font-size: 13px; margin: 6px 0 0;'>${eventDateText}</div>
      <div style='font-size: 12px; margin: 2px 0 0;'>${eventVenueText}</div>
      <div style='margin-top: 18px; font-size: 13px; background: #fff2; border-radius: 8px; padding: 4px 12px;'>ADMIT CARD</div>
    </div>
    <div style="flex: 1; padding: 28px 32px 28px 24px; display: flex; flex-direction: column; justify-content: space-between;">
      <div style='display: flex; justify-content: space-between; align-items: flex-start;'>
        <div>
          <div style='font-size: 13px; color: #2a3655; margin-bottom: 2px;'>Participant Name</div>
          <div style='font-size: 22px; font-weight: 700; color: #1d2742;'>${name}</div>
          <div style='font-size: 13px; color: #3a4566; margin: 8px 0 0;'>College: ${college}</div>
          <div style='font-size: 13px; color: #3a4566;'>Dept/Year: ${department} / ${year}</div>
          <div style='font-size: 13px; color: #3a4566; margin: 8px 0 0;'>Events: ${events}</div>
          <div style='font-size: 13px; color: #3a4566; margin: 8px 0 0;'>Reg ID: <span style='font-weight: 600;'>${regId}</span></div>
        </div>
        <img src='${qrUrl}' alt='QR' style='width: 110px; height: 110px; border-radius: 10px; border: 1px solid #e3e8f4;' />
      </div>
      <div style='font-size: 13px; color: #2d3958; margin-top: 18px;'>Please present this admit card at the event entry. <br/>We look forward to seeing you!</div>
    </div>
  </div>
  `;
};

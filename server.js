const path = require("path");
const dns = require("dns").promises;
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const validator = require("validator");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const { db, initDatabase } = require("./db");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "wingsadmin";
const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN || "wings-session-token";
const ADMIN_SESSION_COOKIE = "wings_admin_session";
const MAX_PORT_RETRIES = 10;
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const TEMP_INVITE_FROM_EMAIL = "226t1a0544sandeep@pydah.edu.in";
const INVITE_FROM_EMAIL =
  process.env.INVITE_FROM_EMAIL || TEMP_INVITE_FROM_EMAIL || SMTP_USER || "";
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const EVENT_NAME = "WINGS 2k26";
const EVENT_DATE_TEXT = "March 13-14, 2026";
const EVENT_VENUE_TEXT = "Pydah College of Engineering";

initDatabase();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-password"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split("=");
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
};

const hasValidAdminSession = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[ADMIN_SESSION_COOKIE] === ADMIN_SESSION_TOKEN;
};

const requireAdminAuth = (req, res, next) => {
  const providedPassword =
    req.headers["x-admin-password"] || req.query.password || "";

  if (hasValidAdminSession(req) || providedPassword === ADMIN_PASSWORD) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "Unauthorized admin access",
  });
};

const requireAdminSession = (req, res, next) => {
  if (hasValidAdminSession(req)) {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized admin access",
    });
  }

  return res.redirect("/admin-login");
};

const requiredFields = [
  "name",
  "email",
  "phone",
  "college",
  "department",
  "year",
  "events",
  "regId",
  "createdAt",
];

let smtpTransporter = null;

const runDb = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function onRun(error) {
      if (error) {
        return reject(error);
      }

      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const normalizePhone = (phone) => String(phone || "").replace(/[\s-]/g, "").trim();

const createSmtpTransporter = () => {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !INVITE_FROM_EMAIL) {
    return null;
  }

  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return smtpTransporter;
};

const validateEmailInBackground = async (email) => {
  if (!validator.isEmail(email)) {
    return { valid: false, reason: "Email format is invalid" };
  }

  const domain = email.split("@")[1];

  if (!domain) {
    return { valid: false, reason: "Email domain is missing" };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: "Email domain does not accept mail" };
    }
  } catch (_error) {
    return { valid: false, reason: "Email domain verification failed" };
  }

  return { valid: true, reason: "Email verified" };
};

const validatePhoneInBackground = (phone) => {
  const normalized = normalizePhone(phone);

  if (!/^\+?[0-9]{10,15}$/.test(normalized)) {
    return { valid: false, reason: "Phone number format is invalid" };
  }

  const parsed = parsePhoneNumberFromString(normalized, "IN");

  if (!parsed || !parsed.isValid()) {
    return { valid: false, reason: "Phone number could not be verified" };
  }

  return { valid: true, reason: "Phone verified", e164: parsed.number };
};

const sendInvitationEmail = async ({ name, email, regId, events }) => {
  const transporter = createSmtpTransporter();

  if (!transporter) {
    return { sent: false, reason: "SMTP is not configured" };
  }

  const eventsText = Array.isArray(events) ? events.join(", ") : String(events || "");

  const mailOptions = {
    from: INVITE_FROM_EMAIL,
    to: email,
    subject: `Invitation confirmed - ${EVENT_NAME}`,
    text: `Hi ${name},\n\nYour registration for ${EVENT_NAME} is confirmed.\nRegistration ID: ${regId}\nEvent Date: ${EVENT_DATE_TEXT}\nVenue: ${EVENT_VENUE_TEXT}\nSelected Events: ${eventsText}\n\nWe look forward to seeing you!`,
    html: `
      <p>Hi <strong>${validator.escape(name)}</strong>,</p>
      <p>Your registration for <strong>${EVENT_NAME}</strong> is confirmed.</p>
      <p>
        <strong>Registration ID:</strong> ${validator.escape(regId)}<br/>
        <strong>Event Date:</strong> ${EVENT_DATE_TEXT}<br/>
        <strong>Venue:</strong> ${EVENT_VENUE_TEXT}<br/>
        <strong>Selected Events:</strong> ${validator.escape(eventsText)}
      </p>
      <p>We look forward to seeing you!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error.message || "Invitation mail failed" };
  }
};

const runRegistrationValidationWorkflow = async ({
  id,
  name,
  email,
  phone,
  regId,
  events,
}) => {
  try {
    const [emailResult, phoneResult] = await Promise.all([
      validateEmailInBackground(email),
      Promise.resolve(validatePhoneInBackground(phone)),
    ]);

    if (!emailResult.valid || !phoneResult.valid) {
      const reasons = [emailResult.reason, phoneResult.reason]
        .filter(Boolean)
        .join("; ");

      await runDb(
        `
          UPDATE registrations
          SET validation_status = ?,
              validation_message = ?,
              invitation_status = ?,
              updated_at = ?
          WHERE id = ?
        `,
        ["failed", reasons, "skipped", new Date().toISOString(), id]
      );

      return;
    }

    await runDb(
      `
        UPDATE registrations
        SET validation_status = ?,
            validation_message = ?,
            updated_at = ?
        WHERE id = ?
      `,
      ["verified", "Email and phone verified", new Date().toISOString(), id]
    );

    const invitation = await sendInvitationEmail({ name, email, regId, events });

    await runDb(
      `
        UPDATE registrations
        SET invitation_status = ?,
            invitation_sent_at = ?,
            validation_message = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [
        invitation.sent ? "sent" : "failed",
        invitation.sent ? new Date().toISOString() : null,
        invitation.sent
          ? "Email and phone verified; invitation sent"
          : `Email and phone verified; invitation failed: ${invitation.reason}`,
        new Date().toISOString(),
        id,
      ]
    );
  } catch (error) {
    await runDb(
      `
        UPDATE registrations
        SET validation_status = ?,
            validation_message = ?,
            invitation_status = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [
        "failed",
        `Background verification failed: ${error.message}`,
        "failed",
        new Date().toISOString(),
        id,
      ]
    ).catch(() => undefined);
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "WINGS 2k26 API" });
});

app.post("/api/admin-login", (req, res) => {
  const password = String(req.body?.password || "").trim();

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin password",
    });
  }

  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(
      ADMIN_SESSION_TOKEN
    )}; Path=/; HttpOnly; SameSite=Strict; Max-Age=14400`
  );

  return res.json({ success: true, message: "Admin session started" });
});

app.post("/api/admin-logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );

  return res.json({ success: true, message: "Logged out" });
});

app.get("/api/admin-session", (req, res) => {
  if (!hasValidAdminSession(req)) {
    return res.status(401).json({
      success: false,
      message: "No active admin session",
    });
  }

  return res.json({ success: true, authenticated: true });
});

app.post("/api/register", async (req, res) => {
  const payload = req.body;

  const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  const normalizedPhone = normalizePhone(payload.phone);
  const isPhoneValid = /^\+?[0-9]{10,15}$/.test(normalizedPhone);
  if (!isPhoneValid) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  const normalizedEmail = String(payload.email).trim().toLowerCase();
  if (!validator.isEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }

  const timestamp = new Date().toISOString();

  const eventsAsString = Array.isArray(payload.events)
    ? payload.events.join(",")
    : String(payload.events);

  try {
    const insertResult = await runDb(
      `
        INSERT INTO registrations
        (
          name,
          email,
          phone,
          college,
          department,
          year,
          events,
          reg_id,
          created_at,
          validation_status,
          validation_message,
          invitation_status,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(payload.name).trim(),
        normalizedEmail,
        normalizedPhone,
        String(payload.college).trim(),
        String(payload.department).trim(),
        String(payload.year).trim(),
        eventsAsString,
        String(payload.regId).trim(),
        String(payload.createdAt).trim(),
        "pending",
        "Verification in progress",
        "queued",
        timestamp,
      ]
    );

    setImmediate(() => {
      runRegistrationValidationWorkflow({
        id: insertResult.lastID,
        name: String(payload.name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        regId: String(payload.regId).trim(),
        events: Array.isArray(payload.events)
          ? payload.events
          : String(payload.events)
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
      });
    });

    return res.status(201).json({
      success: true,
      id: insertResult.lastID,
      message:
        "Registration saved. Email and phone verification is running in background. Invitation mail will be sent after verification.",
    });
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed: registrations.reg_id")) {
      return res.status(409).json({
        success: false,
        message: "Registration ID already exists. Please resubmit.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not save registration",
      error: error.message,
    });
  }
});

app.get("/api/registrations", requireAdminAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  db.all(
    `
      SELECT
        id,
        name,
        email,
        phone,
        college,
        department,
        year,
        events,
        reg_id AS regId,
        created_at AS createdAt,
        validation_status AS validationStatus,
        validation_message AS validationMessage,
        invitation_status AS invitationStatus,
        invitation_sent_at AS invitationSentAt,
        updated_at AS updatedAt
      FROM registrations
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `,
    [limit],
    (error, rows) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Could not fetch registrations",
          error: error.message,
        });
      }

      const normalized = rows.map((row) => ({
        ...row,
        events: row.events ? row.events.split(",").filter(Boolean) : [],
      }));

      return res.json({ success: true, count: normalized.length, data: normalized });
    }
  );
});

app.get("/admin", requireAdminSession, (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin-login", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(__dirname, "admin-login.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const startServer = (initialPort, retriesLeft = MAX_PORT_RETRIES) => {
  const server = app
    .listen(initialPort, () => {
      console.log(`WINGS backend running at http://localhost:${initialPort}`);
      console.log(`Admin dashboard: http://localhost:${initialPort}/admin`);
    })
    .on("error", (error) => {
      if (error.code === "EADDRINUSE" && retriesLeft > 0) {
        const nextPort = initialPort + 1;
        console.warn(
          `Port ${initialPort} is in use. Retrying on ${nextPort}...`
        );
        return startServer(nextPort, retriesLeft - 1);
      }

      console.error("Failed to start server:", error.message);
      process.exit(1);
    });

  return server;
};

startServer(PORT);

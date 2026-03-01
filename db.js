const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";
const DB_NAME = process.env.MONGODB_DB_NAME || "wings2k26";
const REGISTRATIONS_COLLECTION = "registrations";
const COUNTERS_COLLECTION = "counters";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOW_IN_MEMORY_FALLBACK = !IS_PRODUCTION;

let client;
let database;
let registrationsCollection;
let inMemoryMode = false;
let inMemoryRegistrations = [];
let inMemoryCounter = 0;

const enableInMemoryMode = (reason) => {
  if (inMemoryMode) {
    return;
  }

  inMemoryMode = true;
  console.warn(
    `${reason} Running with in-memory database for local development.`
  );
};

const getRegistrationsCollection = () => {
  if (!registrationsCollection) {
    throw new Error("Database is not initialized");
  }

  return registrationsCollection;
};

const getNextRegistrationId = async () => {
  if (!database) {
    throw new Error("Database is not initialized");
  }

  const counters = database.collection(COUNTERS_COLLECTION);
  const counterResult = await counters.findOneAndUpdate(
    { _id: "registrationId" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return Number(counterResult.value?.value || 1);
};

const initDatabase = async () => {
  if (!MONGODB_URI) {
    if (!ALLOW_IN_MEMORY_FALLBACK) {
      throw new Error("MONGODB_URI is not configured");
    }

    enableInMemoryMode("MONGODB_URI is not configured.");
    return;
  }

  if (database && registrationsCollection) {
    return;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    database = client.db(DB_NAME);
    registrationsCollection = database.collection(REGISTRATIONS_COLLECTION);

    await registrationsCollection.createIndex({ regId: 1 }, { unique: true });
    await registrationsCollection.createIndex({ createdAt: -1 });

    console.log(`MongoDB connected: ${DB_NAME}.${REGISTRATIONS_COLLECTION}`);
  } catch (error) {
    if (!ALLOW_IN_MEMORY_FALLBACK) {
      throw error;
    }

    enableInMemoryMode(
      `MongoDB connection failed (${error.message || "unknown error"}).`
    );
  }
};

const createRegistration = async (registration) => {
  if (inMemoryMode) {
    inMemoryCounter += 1;

    if (
      inMemoryRegistrations.some(
        (entry) => entry.regId === registration.regId
      )
    ) {
      const duplicateError = new Error("Duplicate registration id");
      duplicateError.code = 11000;
      throw duplicateError;
    }

    const document = {
      id: inMemoryCounter,
      ...registration,
    };

    inMemoryRegistrations.unshift(document);
    return { lastID: inMemoryCounter };
  }

  const collection = getRegistrationsCollection();
  const nextId = await getNextRegistrationId();

  const document = {
    id: nextId,
    ...registration,
  };

  await collection.insertOne(document);
  return { lastID: nextId };
};

const updateRegistrationById = async (id, updates) => {
  if (inMemoryMode) {
    const numericId = Number(id);
    const index = inMemoryRegistrations.findIndex(
      (entry) => entry.id === numericId
    );

    if (index < 0) {
      return { changes: 0 };
    }

    inMemoryRegistrations[index] = {
      ...inMemoryRegistrations[index],
      ...updates,
    };

    return { changes: 1 };
  }

  const collection = getRegistrationsCollection();
  const updateResult = await collection.updateOne(
    { id: Number(id) },
    { $set: updates }
  );

  return { changes: updateResult.modifiedCount };
};

const listRegistrations = async (limit) => {
  if (inMemoryMode) {
    return inMemoryRegistrations.slice(0, Number(limit));
  }

  const collection = getRegistrationsCollection();
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .project({ _id: 0 })
    .toArray();
};

const deleteRegistrationById = async (id) => {
  if (inMemoryMode) {
    const numericId = Number(id);
    const initialLength = inMemoryRegistrations.length;
    inMemoryRegistrations = inMemoryRegistrations.filter(
      (entry) => entry.id !== numericId
    );

    return {
      changes:
        initialLength === inMemoryRegistrations.length ? 0 : 1,
    };
  }

  const collection = getRegistrationsCollection();
  const deleteResult = await collection.deleteOne({ id: Number(id) });
  return { changes: deleteResult.deletedCount };
};

module.exports = {
  initDatabase,
  createRegistration,
  updateRegistrationById,
  listRegistrations,
  deleteRegistrationById,
};

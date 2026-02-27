const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";
const DB_NAME = process.env.MONGODB_DB_NAME || "wings2k26";
const REGISTRATIONS_COLLECTION = "registrations";
const COUNTERS_COLLECTION = "counters";

let client;
let database;
let registrationsCollection;

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
    throw new Error("MONGODB_URI is not configured");
  }

  if (database && registrationsCollection) {
    return;
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  database = client.db(DB_NAME);
  registrationsCollection = database.collection(REGISTRATIONS_COLLECTION);

  await registrationsCollection.createIndex({ regId: 1 }, { unique: true });
  await registrationsCollection.createIndex({ createdAt: -1 });

  console.log(`MongoDB connected: ${DB_NAME}.${REGISTRATIONS_COLLECTION}`);
};

const createRegistration = async (registration) => {
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
  const collection = getRegistrationsCollection();
  const updateResult = await collection.updateOne(
    { id: Number(id) },
    { $set: updates }
  );

  return { changes: updateResult.modifiedCount };
};

const listRegistrations = async (limit) => {
  const collection = getRegistrationsCollection();
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .project({ _id: 0 })
    .toArray();
};

const deleteRegistrationById = async (id) => {
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

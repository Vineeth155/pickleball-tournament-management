import mongoose, { Schema, model, models } from "mongoose";

const OrganizerSchema = new Schema({
  organizerId: { type: String, unique: true, required: true }, // ✅ custom unique ID
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  location: { type: String, required: true },
  locationLink: String,
  aboutUs: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tournaments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  // Additional audit fields
  updatedAt: { type: Date, default: Date.now },
  updatedBy: String,
});

const Organizer = models.Organizer || model("Organizer", OrganizerSchema);
export default Organizer;

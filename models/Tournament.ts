import mongoose, { Schema, models } from "mongoose";

const TeamSchema = new Schema({
  id: String,
  name: String,
  seed: Number,
  players: [String],
  playerDetails: [{
    skillLevel: String,
    ageGroup: String,
    gender: { type: String, enum: ["Male", "Female"] }
  }],
  skillLevel: String,
  ageGroup: String,
  gender: { type: String, enum: ["Men", "Women", "Mixed"] },
  poolId: Schema.Types.Mixed,
  contactEmail: String,
  contactPhone: String,
  qualified: Boolean,
  manualPosition: Number,
  // Audit fields
  createdAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  updatedAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  createdBy: String,
  updatedBy: String,
});

const MatchSchema = new Schema({
  id: String,
  round: Number,
  position: Number,
  team1Id: String,
  team2Id: String,
  team1Score: Number,
  team2Score: Number,
  team1Games: [Number],
  team2Games: [Number],
  team1TotalPoints: Number,
  team2TotalPoints: Number,
  winnerId: String,
  isBye: Boolean,
  isWinnersBracket: Boolean,
  loserGoesTo: String,
  winnerGoesTo: String,
  court: String,
  scheduledTime: String,
  matchType: { type: String, enum: ["Singles", "Doubles", "Mixed Doubles"] },
  bestOf: Number,
  completed: Boolean,
  poolId: Schema.Types.Mixed,
  isKnockout: Boolean,
  // Audit fields
  createdAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  updatedAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  createdBy: String,
  updatedBy: String,
});

const PoolSchema = new Schema({
  id: String,
  name: String,
  teams: [TeamSchema],
  // Audit fields
  createdAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  updatedAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  createdBy: String,
  updatedBy: String,
});

const CategorySchema = new Schema({
  id: { type: String, required: true },
  gender: {
    type: String,
    enum: ["Mens", "Womens", "mixed"],
    required: true,
  },
  division: {
    type: String,
    enum: ["singles", "doubles"],
    required: true,
  },
  skillLevel: {
    min: { type: Number },
    max: { type: Number },
  },
  ageGroup: { type: String },
  seedingMethod: {
    type: String,
    enum: ["Random", "Ranking_Based"],
    required: true,
  },
  // Tournament configuration fields
  format: {
    type: String,
    enum: [
      "single_elimination",
      "double_elimination",
      "round_robin",
      "pool_play",
    ],
    required: true,
  },
  // Bracket configuration fields
  totalRounds: Number, // Number of rounds for this category
  totalWinnerRounds: Number, // Number of winner bracket rounds for double elimination
  knockoutBracketPopulated: Boolean, // Flag to track if knockout bracket has been populated
  pointsToWin: Number,
  winBy: Number,
  bestOf: Number,
  earlyRoundGames: Number,
  quarterFinalGames: Number,
  semiFinalGames: Number,
  finalGames: Number,
  earlyRoundPoints: Number,
  quarterFinalPoints: Number,
  semiFinalPoints: Number,
  finalPoints: Number,
  numberOfPools: Number,
  // Teams and matches specific to this category
  teams: [TeamSchema],
  matches: [MatchSchema],
  pools: [PoolSchema],
  // Audit fields
  createdAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  updatedAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  createdBy: String,
  updatedBy: String,
});

const TournamentSchema = new Schema({
  id: String,
  name: String,
  description: String,
  organizerId: String, // ID of the organizer who created this tournament
  createdAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) }, // Changed to String with IST timezone
  categories: { 
    type: [CategorySchema],
    required: true,
    validate: {
      validator: (v: any) => {
        return v && v.length > 0;
      },
      message: "At least one category is required"
    }
  },
  // Note: totalRounds, totalWinnerRounds, and knockoutBracketPopulated are now category-level
  // as they depend on the category format and bracket configuration
  createdBy: String,
  location: String,
  startDate: String,
  endDate: String,
  slug: String,
  isStarted: Boolean, // Whether the tournament has been started
  // Audit fields
  updatedAt: { type: String, default: () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) }, // Changed to String with IST timezone
  updatedBy: String,
});

export default models.Tournament ||
  mongoose.model("Tournament", TournamentSchema);
